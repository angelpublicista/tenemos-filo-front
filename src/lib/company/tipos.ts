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

/**
 * Si el anfitrion es una persona o una empresa constituida.
 *
 * No es un dato descriptivo: decide que documentacion legal se le pide. Una
 * persona natural no esta inscrita en Camara de Comercio, asi que pedirle ese
 * certificado seria pedirle un papel que no existe.
 */
export const TIPOS_DE_PERSONA = [
  {
    value: 'natural',
    label: 'Persona natural',
    ayuda: 'Trabajas a tu nombre, sin sociedad constituida.',
  },
  {
    value: 'juridica',
    label: 'Persona jurídica',
    ayuda: 'Tienes una sociedad registrada en Cámara de Comercio.',
  },
] as const;

export type TipoDePersona = (typeof TIPOS_DE_PERSONA)[number]['value'];

export const VALORES_DE_PERSONA = TIPOS_DE_PERSONA.map((t) => t.value) as unknown as [
  TipoDePersona,
  ...TipoDePersona[],
];

/**
 * Si a este anfitrion hay que pedirle el certificado de Camara de Comercio.
 *
 * Mientras no haya dicho que es —las empresas de antes de este campo— se le
 * pide igual: es lo que veia antes, y ocultarselo de golpe le esconderia un
 * documento que quiza ya tenia subido.
 */
export function pideCamaraDeComercio(persona?: TipoDePersona | null): boolean {
  return persona !== 'natural';
}

/**
 * El documento fiscal que le corresponde por defecto.
 *
 * Es una preseleccion, no una imposicion: una persona natural comerciante si
 * tiene NIT, y forzarle la cedula la dejaria sin poder declararlo.
 */
export function documentoSugerido(persona: TipoDePersona): 'nit' | 'cedula' {
  return persona === 'natural' ? 'cedula' : 'nit';
}

/** Como se llama un tipo de persona, para enseñarlo donde no hay desplegable. */
export function etiquetaDePersona(valor?: TipoDePersona | null): string {
  return TIPOS_DE_PERSONA.find((t) => t.value === valor)?.label ?? 'Sin especificar';
}
