/**
 * Contactos de la empresa: a quien escribir para cada asunto.
 *
 * No son los contactos del CRM —esos son los CLIENTES del anfitrion—. Estos
 * son suyos: quien atiende reservas, quien lleva la contabilidad.
 *
 * Reservas y contabilidad son obligatorios y unicos: son cargos, no personas,
 * y dos respuestas a "¿a quien aviso de una reserva?" no es una respuesta.
 * Ademas caben hasta tres libres, cada uno con su etiqueta.
 */

export type TipoDeContacto = 'reservas' | 'contabilidad' | 'otro';

export interface ContactoDeEmpresa {
  type: TipoDeContacto;
  /** Solo en los libres: los obligatorios ya se llaman por su tipo. */
  label?: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
}

export const CONTACTOS_OBLIGATORIOS = [
  {
    type: 'reservas' as const,
    titulo: 'Contacto de reservas',
    ayuda: 'Recibe los avisos de reservas nuevas y cancelaciones.',
  },
  {
    type: 'contabilidad' as const,
    titulo: 'Contacto de contabilidad',
    ayuda: 'Recibe los avisos de pagos recibidos.',
  },
];

/** Cuantos contactos libres caben. */
export const MAXIMO_LIBRES = 3;

export const TITULOS: Record<TipoDeContacto, string> = {
  reservas: 'Reservas',
  contabilidad: 'Contabilidad',
  otro: 'Otro',
};

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Uno vacio, para empezar a rellenar. */
export function contactoVacio(type: TipoDeContacto): ContactoDeEmpresa {
  return { type, name: '', email: '', phone: '', position: '', label: '' };
}

/**
 * Que le falta a un contacto para poder guardarse.
 *
 * Devuelve el mensaje o null. Se valida aqui y no solo en el API para poder
 * señalar el campo concreto: un 400 con "contacts invalido" no le dice a
 * nadie cual de los cinco bloques esta mal.
 */
export function errorDeContacto(c: ContactoDeEmpresa): string | null {
  if (!c.name.trim()) return 'Falta el nombre';
  if (!c.email.trim()) return 'Falta el correo';
  if (!correoValido(c.email)) return 'El correo no parece válido';
  if (c.type === 'otro' && !(c.label ?? '').trim()) return 'Indica para qué es este contacto';
  return null;
}

/** Los que hay que arreglar antes de continuar, con su posicion. */
export function erroresDeContactos(lista: ContactoDeEmpresa[]): Map<number, string> {
  const errores = new Map<number, string>();
  lista.forEach((c, i) => {
    const e = errorDeContacto(c);
    if (e) errores.set(i, e);
  });
  return errores;
}

/**
 * Deja la lista como la espera el API: sin campos vacios.
 *
 * Los opcionales en blanco se quitan en vez de mandarse como "": el API los
 * trataria igual, pero asi lo que viaja dice lo que hay.
 */
export function paraGuardar(lista: ContactoDeEmpresa[]): ContactoDeEmpresa[] {
  return lista.map((c) => ({
    type: c.type,
    name: c.name.trim(),
    email: c.email.trim(),
    ...(c.type === 'otro' && c.label?.trim() ? { label: c.label.trim() } : {}),
    ...(c.phone?.trim() ? { phone: c.phone.trim() } : {}),
    ...(c.position?.trim() ? { position: c.position.trim() } : {}),
  }));
}
