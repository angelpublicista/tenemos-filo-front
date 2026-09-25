/**
 * Lo que una sede puede ofrecer.
 *
 * Son casillas de una misma pregunta, no campos sueltos: por eso viajan como
 * una lista de claves y no como un booleano por cada cosa.
 *
 * OJO: el API tiene esta misma lista de claves para validarlas
 * (modules/locations/locations.schemas.ts, CARACTERISTICAS). Si se añade una
 * aquí y allí no, el API la rechaza — molesto, pero mejor que guardar una
 * clave que ninguna pantalla sabría pintar.
 */

export const CARACTERISTICAS = [
  { clave: 'aire_libre', etiqueta: 'Espacio al aire libre' },
  { clave: 'cocina', etiqueta: 'Cocina disponible' },
  { clave: 'parqueadero', etiqueta: 'Parqueadero' },
  { clave: 'wifi', etiqueta: 'Wi-Fi' },
  {
    clave: 'acceso_movilidad_reducida',
    etiqueta: 'Acceso para personas con movilidad reducida',
  },
  { clave: 'ascensor', etiqueta: 'Ascensor' },
  { clave: 'mesas_y_sillas', etiqueta: 'Mesas y sillas disponibles' },
] as const;

/**
 * Los audiovisuales van aparte de la lista de arriba.
 *
 * Es la única casilla que abre un campo detrás, así que en el formulario vive
 * en su propio bloque. Para el API es una característica más.
 */
export const CLAVE_AUDIOVISUALES = 'audiovisuales';

export type ClaveCaracteristica =
  | (typeof CARACTERISTICAS)[number]['clave']
  | typeof CLAVE_AUDIOVISUALES;

/** Como se llama cada clave, para enseñarla fuera del formulario. */
export function etiquetaDeCaracteristica(clave: string): string {
  if (clave === CLAVE_AUDIOVISUALES) return 'Equipos audiovisuales';
  return CARACTERISTICAS.find((c) => c.clave === clave)?.etiqueta ?? clave;
}
