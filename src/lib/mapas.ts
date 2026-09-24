/**
 * Carga de Google Maps en el navegador.
 *
 * El script se inyecta una sola vez aunque lo pidan varios componentes a la
 * vez: sin esto, abrir el formulario de una sede dos veces cargaria la
 * libreria dos veces y Google avisa por consola de que se reinicio.
 *
 * La clave es NEXT_PUBLIC a proposito —va dentro del JavaScript que descarga
 * el navegador, no hay forma de esconderla—. Lo que la protege es la
 * restriccion por dominio en Google Cloud, no el secreto.
 */

export const CLAVE_MAPAS = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** Si hay mapas disponibles. Sin clave, quien lo use debe decirlo, no fallar. */
export const hayMapas = () => CLAVE_MAPAS !== '';

/** Bogota. Punto de partida cuando no hay nada mas. */
export const CENTRO_POR_DEFECTO = { lat: 4.711, lng: -74.0721 };

let promesa: Promise<void> | null = null;

export function cargarMapas(): Promise<void> {
  if (!hayMapas()) return Promise.reject(new Error('Google Maps no está configurado'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Solo en el navegador'));
  // Ya cargado por otra pantalla.
  if (window.google?.maps) return Promise.resolve();
  if (promesa) return promesa;

  promesa = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      CLAVE_MAPAS,
    )}&libraries=marker&language=es&region=CO`;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      // Se olvida el intento fallido para que un problema de red puntual no
      // deje el mapa muerto hasta recargar la pagina.
      promesa = null;
      reject(new Error('No se pudo cargar Google Maps'));
    };
    document.head.appendChild(el);
  });
  return promesa;
}

/**
 * La direccion tal como se le da a un buscador de mapas.
 *
 * Se añade el pais siempre: "Cra 13 #85-32" existe en media Colombia y en
 * varios paises mas, y sin acotar el geocodificador se va a cualquier parte.
 */
export function direccionParaBuscar(a: {
  street?: string;
  city?: string;
  state?: string;
}): string {
  return [a.street, a.city, a.state, 'Colombia'].map((x) => x?.trim()).filter(Boolean).join(', ');
}
