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

/**
 * Lo que se repite en todas las páginas del sitio: encabezado, menú, pie y
 * barras laterales. Sus imágenes —logos de aliados, banners, redes— no son de
 * ninguna experiencia, y dejarlas pasaba por foto de la que tocara.
 */
const CROMO = /<(header|nav|footer|aside)\b[\s\S]*?<\/\1>/gi;

/** Quita las imágenes del cromo del sitio; el texto del cromo se queda. */
const sinImagenesDelCromo = (html: string): string =>
  html.replace(CROMO, (bloque) => bloque.replace(/<img\b[^>]*>/gi, ' '));

/** Nombres que delatan que no es una foto de una experiencia. */
const DECORATIVA =
  /logo|icon|favicon|sprite|pixel|avatar|placeholder|emoji|flag|spacer|blank|loading|loader|whatsapp|facebook|instagram|twitter|tiktok|youtube|linkedin|badge|sello|payment|visa|mastercard|pse\b/i;

/** El valor de un atributo de una etiqueta, o null. */
const atributo = (etiqueta: string, nombre: string): string | null =>
  etiqueta.match(new RegExp(`\\s${nombre}=["']([^"']*)["']`, 'i'))?.[1] ?? null;

/**
 * La dirección de la foto de una etiqueta <img>, o null si no sirve.
 *
 * Los sitios con carga diferida dejan en `src` un marcador (`data:` o un gif de
 * un píxel) y ponen la foto de verdad en `data-src`: mirar solo `src` se
 * quedaba con los marcadores y sin las fotos.
 */
function urlDeImagen(etiqueta: string, base: URL): string | null {
  const candidatas = [
    atributo(etiqueta, 'data-src'),
    atributo(etiqueta, 'data-lazy-src'),
    atributo(etiqueta, 'data-original'),
    atributo(etiqueta, 'src'),
  ];
  const src = candidatas.find((c) => c && !c.startsWith('data:'));
  if (!src) return null;
  if (DECORATIVA.test(src)) return null;
  if (/\.svg(\?|$)/i.test(src)) return null;

  // Una miniatura de 40 px es un icono, no la foto de nada.
  const ancho = Number(atributo(etiqueta, 'width'));
  const alto = Number(atributo(etiqueta, 'height'));
  if ((ancho > 0 && ancho < 120) || (alto > 0 && alto < 120)) return null;

  try {
    const u = new URL(src, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * El texto visible de una página, sin el andamiaje.
 *
 * Con `base`, cada foto del contenido queda como `[IMAGEN: dirección]` en el
 * sitio donde está. Antes se borraban con el resto de etiquetas, así que el
 * modelo no tenía ninguna dirección que asociar a ninguna experiencia aunque se
 * le pidiera, y la foto elegida acababa siendo la que el anfitrión adivinara de
 * una lista sin contexto.
 */
export function aTexto(html: string, base?: URL): string {
  const contenido = base
    ? sinImagenesDelCromo(html).replace(/<img\b[^>]*>/gi, (etiqueta) => {
        const url = urlDeImagen(etiqueta, base);
        return url ? ` [IMAGEN: ${url}] ` : ' ';
      })
    : html;
  return contenido
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

/** Las fotos del contenido de una página, en absoluto y sin las del cromo ni las decorativas. */
export function imagenes(html: string, base: URL): string[] {
  const vistas = new Set<string>();
  for (const m of sinImagenesDelCromo(html).matchAll(/<img\b[^>]*>/gi)) {
    const url = urlDeImagen(m[0], base);
    if (url) vistas.add(url);
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
  /** Las que se le enseñan a quien revisa: las primeras. */
  imagenes: string[];
  /** Todas las del contenido. Con ellas se comprueba lo que devuelve el modelo. */
  todasLasImagenes: string[];
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
    { url: primera.url.toString(), texto: aTexto(primera.html, primera.url), imagenes: imagenes(primera.html, primera.url) },
  ];

  const candidatos = enlacesCandidatos(primera.html, primera.url).slice(0, MAX_PAGINAS);
  const resultados = await Promise.allSettled(
    candidatos.map(async (u) => {
      const p = await traerPagina(new URL(u));
      return {
        url: p.url.toString(),
        texto: aTexto(p.html, p.url),
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
    todasLasImagenes: [...new Set(paginas.flatMap((p) => p.imagenes))],
    recortado: completo.length > MAX_CARACTERES,
  };
}
