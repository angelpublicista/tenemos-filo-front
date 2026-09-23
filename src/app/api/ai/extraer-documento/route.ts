import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Lee un RUT o un certificado de Camara de Comercio y devuelve los datos que
 * sirven para prerrellenar el registro de empresa.
 *
 * Por que vive aqui y no en el API: el navegador ya tiene el fichero, y el API
 * tiene `express.json({ limit: '5mb' })` — un PDF de 10 MB en base64 son unos
 * 13 MB y no cabria. Un route handler de Next recibe FormData sin ese limite y
 * no obliga a subir el documento antes de poder leerlo.
 *
 * Se usa la Responses API y no chat/completions: es la unica que acepta PDFs
 * directamente. Extrae texto e imagenes de pagina, asi que sirve igual para el
 * PDF que entrega la DIAN y para una foto o un escaneado.
 */

const UNA_HORA_MS = 60 * 60 * 1000;
const MAX_POR_HORA = 10;
const intentos = new Map<string, number[]>();

function dentroDelLimite(clave: string): { ok: boolean; reintentarEnSeg?: number } {
  const ahora = Date.now();
  const recientes = (intentos.get(clave) || []).filter((t) => ahora - t < UNA_HORA_MS);

  if (recientes.length >= MAX_POR_HORA) {
    intentos.set(clave, recientes);
    return { ok: false, reintentarEnSeg: Math.ceil((UNA_HORA_MS - (ahora - Math.min(...recientes))) / 1000) };
  }

  recientes.push(ahora);
  intentos.set(clave, recientes);
  return { ok: true };
}

const TIPOS_ACEPTADOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Los campos se piden con nombres del documento, no del formulario: el modelo
 * acierta mas si se le habla en el idioma del papel que esta leyendo.
 */
const ESQUEMA_RUT = {
  type: 'object',
  properties: {
    nit: { type: ['string', 'null'], description: 'NIT sin digito de verificacion, solo numeros' },
    digitoVerificacion: { type: ['string', 'null'], description: 'Casilla 6, un solo digito' },
    razonSocial: { type: ['string', 'null'], description: 'Casilla 35' },
    nombreComercial: { type: ['string', 'null'], description: 'Casilla 36 si aparece' },
    direccion: { type: ['string', 'null'], description: 'Casilla 38, direccion principal' },
    departamento: { type: ['string', 'null'], description: 'Casilla 39' },
    ciudad: { type: ['string', 'null'], description: 'Casilla 40, ciudad o municipio' },
    correo: { type: ['string', 'null'], description: 'Casilla 42' },
    telefono: { type: ['string', 'null'], description: 'Casilla 43 o 44' },
    esPersonaJuridica: { type: ['boolean', 'null'], description: 'true si es empresa, false si persona natural' },
    codigoCiiu: {
      type: ['string', 'null'],
      description:
        'Casilla 46, actividad economica principal: SOLO el codigo CIIU de cuatro digitos, sin su descripcion. Si hay varias actividades, la principal.',
    },
  },
  required: [
    'nit', 'digitoVerificacion', 'razonSocial', 'nombreComercial', 'direccion',
    'departamento', 'ciudad', 'correo', 'telefono', 'esPersonaJuridica',
    'codigoCiiu',
  ],
  additionalProperties: false,
} as const;

const ESQUEMA_CAMARA = {
  type: 'object',
  properties: {
    nit: { type: ['string', 'null'], description: 'NIT sin digito de verificacion' },
    razonSocial: { type: ['string', 'null'] },
    matriculaMercantil: { type: ['string', 'null'] },
    representanteLegal: {
      type: ['string', 'null'],
      description: 'Nombre completo del representante legal principal',
    },
    documentoRepresentante: {
      type: ['string', 'null'],
      description:
        'Documento del representante legal: SOLO los digitos, sin el tipo ("C.C." o similar) y sin puntos',
    },
    direccion: { type: ['string', 'null'] },
    departamento: { type: ['string', 'null'] },
    ciudad: { type: ['string', 'null'] },
    correo: { type: ['string', 'null'] },
    telefono: { type: ['string', 'null'] },
    codigoCiiu: {
      type: ['string', 'null'],
      description:
        'Codigo CIIU de cuatro digitos de la actividad principal inscrita, sin su descripcion. Si hay varias, la primera.',
    },
  },
  required: [
    'nit', 'razonSocial', 'matriculaMercantil', 'representanteLegal',
    'documentoRepresentante',
    'direccion', 'departamento', 'ciudad', 'correo', 'telefono', 'codigoCiiu',
  ],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres un asistente que lee documentos legales colombianos y extrae sus datos.

Reglas:
- Transcribe EXACTAMENTE lo que dice el documento. No corrijas, no completes, no deduzcas.
- Si un dato no aparece o no lo puedes leer con seguridad, devuelve null. Nunca inventes.
- El NIT va sin puntos, sin guiones y sin el digito de verificacion (ese va aparte).
- El telefono, tal como aparezca, sin reformatear.
- Si el documento no es el que se pide, devuelve todos los campos en null.`;

export async function POST(request: NextRequest) {
  // A diferencia de /api/ai/generate-description, aqui si se exige sesion: esto
  // recibe documentos legales, no un titulo de experiencia.
  const sesion = await auth();
  if (!sesion?.user?.id) {
    return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'La lectura automática de documentos no está configurada en este entorno.' },
      { status: 503 },
    );
  }

  const limite = dentroDelLimite(sesion.user.id);
  if (!limite.ok) {
    const min = Math.max(1, Math.ceil((limite.reintentarEnSeg ?? 0) / 60));
    return NextResponse.json(
      { error: `Has alcanzado el límite de lecturas por hora. Inténtalo en ${min} minuto${min === 1 ? '' : 's'}.` },
      { status: 429, headers: { 'Retry-After': String(limite.reintentarEnSeg ?? 60) } },
    );
  }

  try {
    const formulario = await request.formData();
    const fichero = formulario.get('archivo');
    const tipo = (formulario.get('tipo') as string | null) === 'camara' ? 'camara' : 'rut';

    if (!(fichero instanceof File)) {
      return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });
    }
    if (!TIPOS_ACEPTADOS.includes(fichero.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube el documento en PDF, JPG o PNG.' },
        { status: 400 },
      );
    }
    if (fichero.size > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo supera los 10 MB.' }, { status: 400 });
    }

    const base64 = Buffer.from(await fichero.arrayBuffer()).toString('base64');
    const esPdf = fichero.type === 'application/pdf';

    const contenido = esPdf
      ? [{ type: 'input_file', filename: fichero.name, file_data: `data:application/pdf;base64,${base64}` }]
      : [{ type: 'input_image', image_url: `data:${fichero.type};base64,${base64}`, detail: 'high' }];

    const respuesta = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        // Modelo con vision y aparte del de descripciones: aqui la precision
        // pesa mas que el coste, porque corre una vez por registro.
        model: process.env.OPENAI_MODEL_DOCUMENTOS || 'gpt-4o',
        instructions: INSTRUCCIONES,
        input: [
          {
            role: 'user',
            content: [
              ...contenido,
              {
                type: 'input_text',
                text:
                  tipo === 'rut'
                    ? 'Extrae los datos de este RUT de la DIAN.'
                    : 'Extrae los datos de este certificado de Cámara de Comercio.',
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: tipo === 'rut' ? 'datos_rut' : 'datos_camara',
            schema: tipo === 'rut' ? ESQUEMA_RUT : ESQUEMA_CAMARA,
            strict: true,
          },
        },
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('OpenAI error al extraer documento:', respuesta.status, detalle.slice(0, 500));
      return NextResponse.json(
        { error: 'No pudimos leer el documento. Inténtalo de nuevo en unos segundos.' },
        { status: 502 },
      );
    }

    const json = await respuesta.json();
    const texto = extraerTexto(json);
    if (!texto) {
      return NextResponse.json(
        { error: 'No recibimos datos del documento. Inténtalo de nuevo.' },
        { status: 502 },
      );
    }

    let datos: Record<string, unknown>;
    try {
      datos = JSON.parse(texto);
    } catch {
      // Con json_schema estricto no deberia pasar, pero un 502 claro vale mas
      // que un error de parseo en el navegador.
      console.error('Respuesta de OpenAI no era JSON:', texto.slice(0, 300));
      return NextResponse.json({ error: 'No pudimos interpretar el documento.' }, { status: 502 });
    }

    return NextResponse.json({ tipo, datos });
  } catch (error) {
    console.error('Error extrayendo documento:', error);
    return NextResponse.json({ error: 'Error inesperado leyendo el documento.' }, { status: 500 });
  }
}

/**
 * El texto de una respuesta de la Responses API.
 *
 * Se mira primero `output_text`, que es el atajo que da la propia API, y si no
 * esta se recorre la estructura larga. Asi no dependemos de una sola forma.
 */
function extraerTexto(json: unknown): string | null {
  const r = json as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof r.output_text === 'string' && r.output_text.trim()) return r.output_text.trim();

  for (const salida of r.output ?? []) {
    for (const parte of salida.content ?? []) {
      if (parte?.text?.trim()) return parte.text.trim();
    }
  }
  return null;
}
