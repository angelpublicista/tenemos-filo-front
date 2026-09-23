/**
 * Los tipos de negocio que puede ser un anfitrion.
 *
 * Unica fuente de la lista. Antes vivia copiada en el alta de empresa y en
 * ajustes, con el tipo repetido ademas en tres sitios mas: bastaba tocar una
 * copia para que las pantallas ofrecieran cosas distintas.
 *
 * El orden es el que se enseña al elegir. `other` va al final a proposito:
 * es la salida cuando nada encaja, y ponerla antes invita a usarla sin mirar
 * el resto.
 */

export const TIPOS_DE_EMPRESA = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'cafe', label: 'Café / Cafetería' },
  { value: 'bar', label: 'Bar / Coctelería' },
  { value: 'culinary_studio', label: 'Cocina o estudio gastronómico' },
  { value: 'catering', label: 'Catering' },
  { value: 'hotel', label: 'Hotel / Alojamiento' },
  { value: 'event_venue', label: 'Espacio para eventos' },
  { value: 'producer', label: 'Productor / Finca' },
  { value: 'beverage_maker', label: 'Cervecería / Destilería / Viñedo' },
  { value: 'culinary_school', label: 'Escuela / Academia gastronómica' },
  { value: 'independent_chef', label: 'Chef o anfitrión independiente' },
  { value: 'tour_operator', label: 'Operador de tours / experiencias' },
  { value: 'other', label: 'Otro' },
] as const;

export type TipoDeEmpresa = (typeof TIPOS_DE_EMPRESA)[number]['value'];

/** Solo los valores, para validar con zod sin repetir la lista. */
export const VALORES_DE_TIPO = TIPOS_DE_EMPRESA.map((t) => t.value) as unknown as [
  TipoDeEmpresa,
  ...TipoDeEmpresa[],
];

/** Como se llama un tipo, para enseñarlo donde no hay desplegable. */
export function etiquetaDeTipo(valor?: TipoDeEmpresa | null): string {
  return TIPOS_DE_EMPRESA.find((t) => t.value === valor)?.label ?? 'Sin especificar';
}
