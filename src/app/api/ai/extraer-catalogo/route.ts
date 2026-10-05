import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ErrorDeLectura, leerCatalogoWeb } from '@/lib/catalogo/leer-web';

/**
 * Lee el catálogo de experiencias de un anfitrión y lo devuelve en estructura,
 * listo para revisar antes de crear nada.
 *
 * Vive aquí y no en el API por lo mismo que la lectura de documentos: el
 * navegador ya tiene el fichero y el API tiene `express.json({ limit: '5mb' })`,
 * así que un PDF de catálogo con fotos no cabría. Un route handler recibe
 * FormData sin ese límite.
 *
 * Lo que NO hace, a propósito: crear experiencias. El modelo puede leer mal un
 * precio, y una experiencia publicada con un precio equivocado es dinero mal
 * cobrado. Esto devuelve candidatas; crearlas es un paso aparte que confirma
 * una persona.
 */

const UNA_HORA_MS = 60 * 60 * 1000;
const MAX_POR_HORA = 6;
const intentos = new Map<string, number[]>();

function dentroDelLimite(clave: string): { ok: boolean; reintentarEnSeg?: number } {
  const ahora = Date.now();
  const recientes = (intentos.get(clave) || []).filter((t) => ahora - t < UNA_HORA_MS);
  if (recientes.length >= MAX_POR_HORA) {
    intentos.set(clave, recientes);
    return {
      ok: false,
      reintentarEnSeg: Math.ceil((UNA_HORA_MS - (ahora - Math.min(...recientes))) / 1000),
    };
  }
  recientes.push(ahora);
  intentos.set(clave, recientes);
  return { ok: true };
}

/** Lo mismo que ofrece el formulario de crear experiencia. */
const CATEGORIAS = [
  'cooking',
  'mixology',
  'tasting',
  'catering',
  'corporate',
  'celebrations',
  'workshops',
  'other',
] as const;

const MAX_TEXTO = 120_000;
const MAX_FICHERO_BYTES = 15 * 1024 * 1024;
const TIPOS_DE_FICHERO = /^(application\/pdf|image\/(png|jpe?g|webp|gif))$/;

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['experiencias'],
  properties: {
    experiencias: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'description',
          'categories',
          'duration',
          'capacity',
          'minCapacity',
          'basePrice',
          'includes',
          'requirements',
          'sedeMencionada',
          'imagenes',
          'confianza',
          'dudas',
        ],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          categories: { type: 'array', items: { type: 'string', enum: CATEGORIAS } },
          duration: { type: ['integer', 'null'], description: 'Minutos' },
          capacity: { type: ['integer', 'null'] },
          minCapacity: { type: ['integer', 'null'] },
          basePrice: { type: ['number', 'null'], description: 'Por persona, en la moneda del sitio' },
          includes: { type: 'array', items: { type: 'string' } },
          requirements: { type: 'string' },
          sedeMencionada: { type: ['string', 'null'] },
          imagenes: { type: 'array', items: { type: 'string' } },
          confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
          dudas: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const INSTRUCCIONES = `Eres el asistente que pasa el catálogo de un anfitrión a su ficha en Tenemos Filo.

Reglas que no se saltan:
- Saca SOLO experiencias que el texto describa de verdad. Si no hay ninguna, devuelve la lista vacía.
- No inventes nada. Si un dato no aparece, va en null o vacío y lo dices en "dudas".
- El precio es POR PERSONA. Si el texto da un precio total para un grupo, divídelo y dilo en "dudas". Si el precio depende de opciones, toma el más bajo y dilo. Quita separadores de miles y símbolos: 180.000 COP es 180000.
- "duration" en minutos: "3 horas" es 180.
- "description" es para el cliente que va a reservar: dos o tres frases, en el tono del propio sitio, sin repetir el precio ni los horarios.
- "includes" son cosas sueltas y cortas ("una copa de bienvenida", "recetario impreso"), no frases largas.
- "sedeMencionada" es el nombre del sitio tal cual lo escribe el texto. No lo normalices ni lo inventes.
- "imagenes" son URLs que aparezcan en el material asociadas a ESA experiencia. Si no sabes cuál va con cuál, déjalo vacío.
- "confianza" es tuya: "alta" si el texto da título, precio y una descripción clara; "baja" si estás reconstruyendo a partir de pistas sueltas.
- "dudas" son frases cortas en español dirigidas al anfitrión, para que sepa qué revisar: "El precio no decía si es por persona".

Escribe en el idioma del material.`;

interface Candidata {
  title?: string;
  basePrice?: number | null;
  [k: string]: unknown;
}

function parsearRespuesta(texto: string): Candidata[] {
  try {
    const json = JSON.parse(texto) as { experiencias?: unknown };
    if (!Array.isArray(json.experiencias)) return [];
    // Sin título no hay nada que crear: el API lo exige y una tarjeta sin
    // nombre no se puede ni revisar.
    return (json.experiencias as Candidata[]).filter(
      (e) => typeof e.title === 'string' && e.title.trim().length > 0,
    );
  } catch {
    return [];
  }
}

async function pedirAlModelo(contenido: unknown[]): Promise<Candidata[]> {
  // El host es configurable para poder probar el asistente de punta a punta
  // sin gastar modelo ni depender de la red, igual que el agente de IA.
  const base = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1';
  const r = await fetch(`${base}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_CATALOGO || 'gpt-4o',
      instructions: INSTRUCCIONES,
      input: [{ role: 'user', content: contenido }],
      text: {
        format: { type: 'json_schema', name: 'catalogo', strict: true, schema: ESQUEMA },
      },
      max_output_tokens: 8000,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!r.ok) {
    const detalle = await r.text();
    console.error('[extraer-catalogo] el modelo respondió', r.status, detalle.slice(0, 500));
    throw new Error('El asistente no pudo leer el catálogo. Inténtalo de nuevo en un momento.');
  }

  const data = (await r.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const texto = data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? '';
  return parsearRespuesta(texto);
}

export async function POST(req: NextRequest) {
  const sesion = await auth();
  if (!sesion?.user?.id) {
    return NextResponse.json({ error: 'Inicia sesión para usar el asistente.' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'El asistente no está configurado en este servidor.' },
      { status: 503 },
    );
  }

  const limite = dentroDelLimite(sesion.user.id);
  if (!limite.ok) {
    const minutos = Math.ceil((limite.reintentarEnSeg ?? 0) / 60);
    return NextResponse.json(
      { error: `Has usado el asistente varias veces seguidas. Vuelve a intentarlo en ${minutos} minutos.` },
      { status: 429 },
    );
  }

  try {
    const tipoDeContenido = req.headers.get('content-type') ?? '';

    // ---- Un fichero: PDF o foto del catálogo ----
    if (tipoDeContenido.includes('multipart/form-data')) {
      const form = await req.formData();
      const fichero = form.get('archivo');
      if (!(fichero instanceof File)) {
        return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });
      }
      if (fichero.size > MAX_FICHERO_BYTES) {
        return NextResponse.json(
          { error: 'Ese archivo pesa más de 15 MB. Prueba con uno más ligero.' },
          { status: 400 },
        );
      }
      if (!TIPOS_DE_FICHERO.test(fichero.type)) {
        return NextResponse.json(
          { error: 'Sube un PDF o una imagen del catálogo.' },
          { status: 400 },
        );
      }

      const base64 = Buffer.from(await fichero.arrayBuffer()).toString('base64');
      const contenido =
        fichero.type === 'application/pdf'
          ? [
              {
                type: 'input_file',
                filename: fichero.name || 'catalogo.pdf',
                file_data: `data:application/pdf;base64,${base64}`,
              },
              { type: 'input_text', text: 'Saca las experiencias de este catálogo.' },
            ]
          : [
              { type: 'input_image', image_url: `data:${fichero.type};base64,${base64}` },
              { type: 'input_text', text: 'Saca las experiencias de esta imagen del catálogo.' },
            ];

      const experiencias = await pedirAlModelo(contenido);
      return NextResponse.json({
        experiencias,
        imagenes: [],
        fuente: { tipo: 'archivo', nombre: fichero.name },
      });
    }

    // ---- Texto pegado o enlace a su web ----
    const cuerpo = (await req.json()) as {
      tipo?: string;
      texto?: string;
      url?: string;
      origen?: string;
    };

    if (cuerpo.tipo === 'enlace') {
      if (!cuerpo.url?.trim()) {
        return NextResponse.json({ error: 'Pega la dirección de tu catálogo.' }, { status: 400 });
      }
      const web = await leerCatalogoWeb(cuerpo.url.trim());
      if (web.texto.length < 200) {
        return NextResponse.json(
          {
            error:
              'Esa página casi no tiene texto. Si su contenido se carga con JavaScript, copia y pega el texto en su lugar.',
          },
          { status: 422 },
        );
      }

      const experiencias = await pedirAlModelo([
        { type: 'input_text', text: `Catálogo leído de ${cuerpo.url}:\n\n${web.texto}` },
      ]);

      return NextResponse.json({
        experiencias,
        imagenes: web.imagenes,
        fuente: {
          tipo: 'enlace',
          url: cuerpo.url,
          paginas: web.paginas.map((p) => p.url),
          recortado: web.recortado,
        },
      });
    }

    const texto = (cuerpo.texto ?? '').trim();
    if (texto.length < 40) {
      return NextResponse.json(
        { error: 'Pega el texto de tu catálogo para que el asistente pueda leerlo.' },
        { status: 400 },
      );
    }

    // Decir de dónde viene cambia cómo hay que leerlo: una rejilla de hoja de
    // cálculo no se interpreta igual que una carta escrita en prosa.
    const encabezado = cuerpo.origen ? `${cuerpo.origen}\n\n` : '';
    const experiencias = await pedirAlModelo([
      { type: 'input_text', text: encabezado + texto.slice(0, MAX_TEXTO) },
    ]);

    return NextResponse.json({
      experiencias,
      imagenes: [],
      fuente: { tipo: 'texto', caracteres: texto.length },
    });
  } catch (err) {
    if (err instanceof ErrorDeLectura) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const mensaje =
      err instanceof Error ? err.message : 'No se pudo leer el catálogo. Inténtalo de nuevo.';
    console.error('[extraer-catalogo]', err);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
