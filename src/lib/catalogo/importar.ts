import { apiFetch } from '@/lib/api/client';

/**
 * El asistente que lee el catálogo de un anfitrión y lo deja listo para crear.
 *
 * Lo que devuelve el asistente son CANDIDATAS, no experiencias. Entre leer y
 * crear hay una persona revisando, porque un precio mal leído de una web se
 * convierte en dinero mal cobrado en cuanto alguien reserva.
 */

export type Confianza = 'alta' | 'media' | 'baja';

export interface ExperienciaLeida {
  title: string;
  description: string;
  categories: string[];
  duration: number | null;
  capacity: number | null;
  minCapacity: number | null;
  basePrice: number | null;
  includes: string[];
  requirements: string;
  /** El nombre del sitio tal cual lo escribía el material. Sin normalizar. */
  sedeMencionada: string | null;
  imagenes: string[];
  confianza: Confianza;
  /** Qué conviene revisar, en frases cortas para el anfitrión. */
  dudas: string[];
}

export interface Fuente {
  tipo: 'texto' | 'enlace' | 'archivo';
  url?: string;
  nombre?: string;
  paginas?: string[];
  recortado?: boolean;
  caracteres?: number;
}

export interface Lectura {
  experiencias: ExperienciaLeida[];
  /** Imágenes encontradas en la web, para que el anfitrión elija. */
  imagenes: string[];
  fuente: Fuente;
}

async function pedir(opciones: RequestInit): Promise<Lectura> {
  const r = await fetch('/api/ai/extraer-catalogo', opciones);
  const datos = (await r.json()) as Lectura & { error?: string };
  if (!r.ok) throw new Error(datos.error || 'No se pudo leer el catálogo.');
  return datos;
}

/**
 * El origen se le dice al modelo.
 *
 * No es lo mismo leer una carta escrita en prosa que una rejilla de hoja de
 * cálculo, donde qué precio va con qué experiencia lo dice la columna.
 */
export const leerDesdeTexto = (texto: string, origen?: string) =>
  pedir({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'texto', texto, origen }),
  });

export const leerDesdeEnlace = (url: string) =>
  pedir({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'enlace', url }),
  });

export const leerDesdeArchivo = (archivo: File) => {
  const form = new FormData();
  form.append('archivo', archivo);
  return pedir({ method: 'POST', body: form });
};

/** Trae una imagen de la web del anfitrión a nuestro almacenamiento. */
export const copiarImagen = (url: string) =>
  apiFetch<{ key: string; publicUrl: string; bytes: number }>('/uploads/copiar-desde-url', {
    method: 'POST',
    json: { url },
  });

/**
 * Para comparar títulos: sin acentos, sin espacios de más, en minúsculas.
 *
 * Mismo criterio que usa la importación de contactos, y por el mismo motivo:
 * "Cena a ciegas" y "CENA A  CIEGAS" son la misma experiencia.
 */
export function normalizar(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const ETIQUETA_CONFIANZA: Record<Confianza, string> = {
  alta: 'Se leyó completa',
  media: 'Revisa los datos',
  baja: 'Reconstruida a medias',
};
