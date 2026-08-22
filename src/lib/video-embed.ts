// Videos de portada alojados en YouTube o Vimeo.
//
// Se guarda la URL que pega el anfitrión, no la de incrustación: los
// parámetros del reproductor se aplican al pintar, así que si mañana
// cambian no hay que migrar nada.

export type ProveedorVideo = 'YOUTUBE' | 'VIMEO';

export type VideoPortada = {
  proveedor: ProveedorVideo;
  id: string;
  /** Vimeo lo usa para vídeos no listados; YouTube no tiene equivalente. */
  hash?: string;
};

/** Reconoce las formas en que la gente comparte un vídeo. */
export function parsearVideo(url?: string | null): VideoPortada | null {
  if (!url) return null;

  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const partes = u.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    return partes[0] ? { proveedor: 'YOUTUBE', id: partes[0] } : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v) return { proveedor: 'YOUTUBE', id: v };
    if (['embed', 'shorts', 'live', 'v'].includes(partes[0] ?? '') && partes[1]) {
      return { proveedor: 'YOUTUBE', id: partes[1] };
    }
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const idx = partes[0] === 'video' ? 1 : 0;
    const id = partes[idx];
    if (!id || !/^\d+$/.test(id)) return null;
    const hash = partes[idx + 1] ?? u.searchParams.get('h') ?? undefined;
    return { proveedor: 'VIMEO', id, ...(hash ? { hash } : {}) };
  }

  return null;
}

export type OpcionesIncrustacion = {
  /** El visitante puede pausar, buscar y subir el volumen. */
  conControles?: boolean;
  /** Arranca solo. En la portada va siempre en silencio. */
  autoplay?: boolean;
};

/**
 * URL de incrustación.
 *
 * Sirve para los dos usos: la portada (en bucle, muda y sin controles) y el
 * visor a pantalla completa, donde el visitante entró a propósito y espera
 * poder manejar el vídeo y oírlo.
 */
export function urlDeIncrustacion(
  video: VideoPortada,
  { conControles = false, autoplay = true }: OpcionesIncrustacion = {},
): string {
  if (video.proveedor === 'YOUTUBE') {
    const p = new URLSearchParams({
      // `loop` solo funciona si `playlist` repite el mismo id.
      loop: conControles ? '0' : '1',
      playlist: video.id,
      controls: conControles ? '1' : '0',
      rel: '0',
      playsinline: '1',
      disablekb: conControles ? '0' : '1',
      // Sin subtitulos automaticos: se activarian solos segun el idioma del
      // visitante y en una portada muda solo son ruido encima de la imagen.
      cc_load_policy: '0',
      iv_load_policy: '3',
    });
    if (autoplay) {
      p.set('autoplay', '1');
      // Con controles no se silencia: el visitante lo abrió para verlo, y
      // si el navegador bloquea el arranque le queda el botón de play.
      if (!conControles) p.set('mute', '1');
    }
    // nocookie: no deja rastro en el navegador del visitante hasta que le da
    // al play, y el catálogo es una página pública.
    //
    // Ojo: YouTube sigue pintando el título y el canal sobre el vídeo; su
    // parámetro `modestbranding` dejó de funcionar. Para una portada
    // completamente limpia hay que usar Vimeo.
    return `https://www.youtube-nocookie.com/embed/${video.id}?${p.toString()}`;
  }

  const p = new URLSearchParams(video.hash ? { h: video.hash } : {});
  if (conControles) {
    if (autoplay) p.set('autoplay', '1');
  } else {
    // `background=1` de Vimeo ya implica autoplay, bucle, silencio y sin
    // controles; es exactamente el caso de una portada.
    p.set('background', '1');
  }
  return `https://player.vimeo.com/video/${video.id}?${p.toString()}`;
}

export const NOMBRE_PROVEEDOR: Record<ProveedorVideo, string> = {
  YOUTUBE: 'YouTube',
  VIMEO: 'Vimeo',
};
