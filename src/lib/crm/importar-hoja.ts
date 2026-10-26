// Leer una hoja de calculo y decidir que columna es que.
//
// Sin una sola importacion: es logica pura sobre texto, y asi se puede
// comprobar con el archivo de verdad sin levantar un navegador.

/** Una fila ya lista para mandar al API. */
export interface FilaDeContacto {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  empresa?: string;
  notas?: string;
  origen?: string;
  etiquetas?: string[];
}

/**
 * Los campos a los que se puede llevar una columna del archivo.
 *
 * Solo el nombre es obligatorio: una base histórica llega a medias y el
 * requisito dice expresamente que no hay que completarla antes de importarla.
 */
export const CAMPOS: ReadonlyArray<{ campo: Campo; etiqueta: string; obligatorio?: boolean }> = [
  { campo: 'firstName', etiqueta: 'Nombre', obligatorio: true },
  { campo: 'lastName', etiqueta: 'Apellido' },
  { campo: 'email', etiqueta: 'Correo' },
  { campo: 'phone', etiqueta: 'Teléfono' },
  { campo: 'mobile', etiqueta: 'Celular' },
  { campo: 'jobTitle', etiqueta: 'Cargo' },
  { campo: 'empresa', etiqueta: 'Empresa' },
  { campo: 'origen', etiqueta: 'Origen' },
  { campo: 'notas', etiqueta: 'Notas' },
];

export type Campo =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'mobile'
  | 'jobTitle'
  | 'empresa'
  | 'origen'
  | 'notas';

/**
 * Adivina a qué campo corresponde cada columna por su encabezado.
 *
 * Son los nombres con los que de verdad vienen estas hojas, en español y en
 * inglés. Acertar la mayoría ahorra el paso más tedioso; lo que falle se
 * corrige a mano antes de importar.
 */
const SINONIMOS: Record<Campo, string[]> = {
  firstName: ['nombre', 'nombres', 'first name', 'firstname', 'name', 'contacto', 'cliente'],
  lastName: ['apellido', 'apellidos', 'last name', 'lastname', 'surname'],
  email: ['email', 'correo', 'e-mail', 'mail', 'correo electronico'],
  phone: ['telefono', 'tel', 'phone', 'fijo', 'telefono fijo'],
  mobile: ['celular', 'movil', 'mobile', 'cel', 'whatsapp'],
  jobTitle: ['cargo', 'puesto', 'job title', 'position', 'rol'],
  empresa: ['empresa', 'compania', 'company', 'organizacion', 'negocio'],
  origen: ['origen', 'fuente', 'source', 'canal'],
  notas: ['notas', 'nota', 'observaciones', 'comentarios', 'notes'],
};

const limpiar = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function adivinarColumnas(encabezados: string[]): Record<number, Campo | ''> {
  const mapa: Record<number, Campo | ''> = {};
  const usados = new Set<Campo>();

  encabezados.forEach((encabezado, i) => {
    const h = limpiar(encabezado);
    const campo = (Object.keys(SINONIMOS) as Campo[]).find(
      (c) => !usados.has(c) && SINONIMOS[c].some((s) => h === s || h.startsWith(`${s} `)),
    );
    if (campo) {
      usados.add(campo);
      mapa[i] = campo;
    } else {
      mapa[i] = '';
    }
  });

  return mapa;
}

/** Arma las filas que entiende el API a partir de la hoja y el mapeo. */
export function aContactos(
  filas: string[][],
  mapa: Record<number, Campo | ''>,
): FilaDeContacto[] {
  return filas
    .map((fila) => {
      const c: Record<string, string> = {};
      fila.forEach((valor, i) => {
        const campo = mapa[i];
        const v = String(valor ?? '').trim();
        if (campo && v) c[campo] = v;
      });
      return c as unknown as FilaDeContacto;
    })
    // Una hoja casi siempre trae filas en blanco al final; mandarlas solo
    // llenaría el resumen de errores que no le importan a nadie.
    .filter((c) => Object.keys(c).length > 0);
}
