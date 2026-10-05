// Leer el catálogo de experiencias de la web de un anfitrión.
//
// Corre en el servidor, nunca en el navegador: la URL la escribe el usuario y
// nuestro servidor está dentro de la red privada. Pedirle que descargue
// `http://169.254.169.254/latest/meta-data/` es un ataque conocido (SSRF) y un
// campo de texto es exactamente por donde entra, así que el destino se
// comprueba en cada salto y no sólo en la URL que llegó.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const TIEMPO_LIMITE_MS = 12_000;
const MAX_REDIRECCIONES = 3;
const MAX_BYTES_POR_PAGINA = 2_000_000;

/** Cuántas páginas enlazadas se visitan además de la primera. */
export const MAX_PAGINAS = 8;

/** Lo que se le manda al modelo, en caracteres. Un catálogo largo se recorta. */
const MAX_CARACTERES = 90_000;

export class ErrorDeLectura extends Error {}

function esPrivada(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(v6)) return true;
    const mapeada = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeada?.[1]) return esPrivada(mapeada[1]);
    return false;
  }
  const p = ip.split('.').map(Number);
  const a = p[0] ?? -1;
  const b = p[1] ?? -1;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // metadatos de la nube
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

async function destinoPermitido(u: URL): Promise<void> {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ErrorDeLectura('Sólo se pueden leer direcciones http o https.');
  }
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (ips.length === 0) throw new ErrorDeLectura(`No se pudo resolver ${u.hostname}.`);
  if (ips.some(esPrivada)) {
    throw new ErrorDeLectura('Esa dirección apunta a una red interna y no se puede leer.');
  }
}

/** Descarga una página comprobando el destino en cada redirección. */
async function traerPagina(inicial: URL): Promise<{ url: URL; html: string }> {
  let actual = inicial;

  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto += 1) {
    await destinoPermitido(actual);

    let r: Response;
    try {
      r = await fetch(actual, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
        headers: {
          // Identificarse es lo correcto: quien no quiera que leamos su sitio
          // tiene que poder bloquearnos.
          'user-agent': 'TenemosFiloBot/1.0 (+https://tenemosfilo.com)',
          accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch {
      throw new ErrorDeLectura(
        'No se pudo abrir esa dirección. Comprueba que carga en el navegador.',
      );
    }

    if (r.status >= 300 && r.status < 400) {
      const siguiente = r.headers.get('location');
      if (!siguiente) throw new ErrorDeLectura('Esa dirección redirige a ninguna parte.');
      actual = new URL(siguiente, actual);
      continue;
    }

    if (!r.ok) throw new ErrorDeLectura(`Esa dirección respondió ${r.status}.`);

    const tipo = (r.headers.get('content-type') ?? '').toLowerCase();
    if (!tipo.includes('html')) {
      throw new ErrorDeLectura('Esa dirección no devuelve una página web.');
    }

    const buffer = await r.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES_POR_PAGINA) {
      throw new ErrorDeLectura('Esa página es demasiado grande para leerla.');
    }
    return { url: actual, html: new TextDecoder('utf-8').decode(buffer) };
  }

  throw new ErrorDeLectura('Esa dirección redirige demasiadas veces.');
}

const SIN_CONTENIDO = /<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi;

/** El texto visible de una página, sin el andamiaje. */
export function aTexto(html: string): string {
  return html
    .replace(SIN_CONTENIDO, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Los saltos de bloque se conservan: en un catálogo, dónde termina una
    // experiencia y empieza la siguiente es justo lo que hay que distinguir.
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

const PALABRAS_DE_CATALOGO =
  /experiencia|taller|cena|degustaci|clase|cata|menu|men[úu]|evento|reserva|servicio|paquete|tour/i;

/**
 * Los enlaces que parecen llevar a una experiencia.
 *
 * Mismo dominio y un solo nivel: seguir enlazando sin límite acabaría leyendo
 * el blog, la política de cookies y media web. Se filtran por la pinta de la
 * URL y del texto del enlace, que es lo único que se sabe antes de abrirla.
 */
export function enlacesCandidatos(html: string, base: URL): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    const texto = aTexto(m[2] ?? '');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;

    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.hostname !== base.hostname) continue;
    if (/\.(pdf|jpg|jpeg|png|webp|gif|zip|mp4|doc|docx)$/i.test(u.pathname)) continue;

    u.hash = '';
    const limpia = u.toString();
    if (limpia === base.toString() || vistos.has(limpia)) continue;
    if (!PALABRAS_DE_CATALOGO.test(u.pathname) && !PALABRAS_DE_CATALOGO.test(texto)) continue;

    vistos.add(limpia);
    salida.push(limpia);
  }

  return salida;
}

/** Las imágenes de una página, en absoluto y sin las decorativas obvias. */
export function imagenes(html: string, base: URL): string[] {
  const vistas = new Set<string>();

  for (const m of html.matchAll(/<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (!src || src.startsWith('data:')) continue;
    // Iconos, logos y píxeles de seguimiento no son fotos de una experiencia.
    if (/logo|icon|favicon|sprite|pixel|avatar|placeholder/i.test(src)) continue;

    try {
      const u = new URL(src, base);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      vistas.add(u.toString());
    } catch {
      /* src ilegible: se ignora */
    }
  }

  return [...vistas];
}

export interface PaginaLeida {
  url: string;
  texto: string;
  imagenes: string[];
}

export interface LecturaDeWeb {
  paginas: PaginaLeida[];
  texto: string;
  imagenes: string[];
  recortado: boolean;
}

/**
 * Lee una página y las que enlaza que parezcan experiencias.
 *
 * Las páginas enlazadas se piden de a poco y se sigue aunque alguna falle: que
 * una experiencia de las ocho devuelva 404 no es motivo para quedarse sin las
 * otras siete.
 */
export async function leerCatalogoWeb(urlInicial: string): Promise<LecturaDeWeb> {
  let base: URL;
  try {
    base = new URL(urlInicial);
  } catch {
    throw new ErrorDeLectura('Esa no parece una dirección válida.');
  }

  const primera = await traerPagina(base);
  const paginas: PaginaLeida[] = [
    { url: primera.url.toString(), texto: aTexto(primera.html), imagenes: imagenes(primera.html, primera.url) },
  ];

  const candidatos = enlacesCandidatos(primera.html, primera.url).slice(0, MAX_PAGINAS);
  const resultados = await Promise.allSettled(
    candidatos.map(async (u) => {
      const p = await traerPagina(new URL(u));
      return {
        url: p.url.toString(),
        texto: aTexto(p.html),
        imagenes: imagenes(p.html, p.url),
      };
    }),
  );

  for (const r of resultados) {
    if (r.status === 'fulfilled' && r.value.texto.length > 120) paginas.push(r.value);
  }

  const completo = paginas
    .map((p) => `### ${p.url}\n${p.texto}`)
    .join('\n\n');

  return {
    paginas,
    texto: completo.slice(0, MAX_CARACTERES),
    imagenes: [...new Set(paginas.flatMap((p) => p.imagenes))].slice(0, 40),
    recortado: completo.length > MAX_CARACTERES,
  };
}
