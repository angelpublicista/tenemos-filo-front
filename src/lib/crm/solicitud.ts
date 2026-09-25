import { api } from '@/lib/api/client';

/**
 * La solicitud: el punto de entrada del CRM.
 *
 * Todo lo que se pide aquí es lo mínimo para no perder un lead. Ni fecha, ni
 * empresa, ni experiencia, ni valor: eso se completa después, cuando haya
 * conversación. Lo que mata un lead es pedirle diez datos a quien acaba de
 * escribir por WhatsApp.
 */

export type TipoDeExperiencia = 'ABIERTA' | 'PRIVADA';
export type TipoDeComprador = 'SOCIAL' | 'CORPORATIVO';

export const TIPOS_DE_EXPERIENCIA = [
  {
    valor: 'ABIERTA' as const,
    titulo: 'Experiencia abierta',
    ayuda: 'De tu catálogo, con cupos. Siempre se le vende a un particular.',
  },
  {
    valor: 'PRIVADA' as const,
    titulo: 'Experiencia privada',
    ayuda: 'Un evento a la medida. Puede ser para un particular o para una empresa.',
  },
];

export const TIPOS_DE_COMPRADOR = [
  { valor: 'SOCIAL' as const, titulo: 'Social', ayuda: 'Un particular: cumpleaños, celebración, plan entre amigos.' },
  { valor: 'CORPORATIVO' as const, titulo: 'Corporativo', ayuda: 'Una empresa: cena de equipo, cliente, fin de año.' },
];

/**
 * De dónde salió el lead.
 *
 * `pideDetalle` marca los que no se entienden solos: saber que vino "de un
 * referido" sin saber de quién no sirve para agradecerlo ni para medirlo.
 */
export const ORIGENES = [
  { valor: 'WHATSAPP', etiqueta: 'WhatsApp' },
  { valor: 'INSTAGRAM', etiqueta: 'Instagram' },
  { valor: 'WEB', etiqueta: 'Web' },
  { valor: 'REFERIDO', etiqueta: 'Referido', pideDetalle: true },
  { valor: 'PROSPECCION', etiqueta: 'Prospección' },
  { valor: 'RESELLER', etiqueta: 'Canal / revendedor', pideDetalle: true },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

export type Origen = (typeof ORIGENES)[number]['valor'];

export const pideDetalleDeOrigen = (o?: string) =>
  ORIGENES.some((x) => x.valor === o && 'pideDetalle' in x && x.pideDetalle);

export interface NuevaSolicitud {
  experienceKind: TipoDeExperiencia;
  buyerKind?: TipoDeComprador;
  /** El de un contacto que ya existe; si no, van los datos en `contacto`. */
  contactId?: string;
  contacto?: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  crmCompanyId?: string;
  leadSource?: Origen;
  leadSourceDetail?: string;
  name?: string;
  notes?: string;
}

export interface SolicitudCreada {
  id: string;
  name: string;
  experienceKind: TipoDeExperiencia;
  buyerKind: TipoDeComprador;
  contact?: { id: string; firstName: string; lastName?: string | null } | null;
}

export async function crearSolicitud(datos: NuevaSolicitud): Promise<SolicitudCreada> {
  return api.post<SolicitudCreada>('/opportunities/solicitud', datos);
}

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/**
 * Qué le falta a la solicitud para poder guardarse, o null.
 *
 * Se valida aquí además de en el API para poder señalar el campo concreto. Un
 * 400 genérico no le dice a nadie cuál de los cuatro campos está mal.
 */
export function errorDeSolicitud(s: NuevaSolicitud): string | null {
  if (!s.experienceKind) return 'Elige si es una experiencia abierta o privada';
  if (s.experienceKind === 'PRIVADA' && !s.buyerKind) {
    return 'Indica si el comprador es Social o Corporativo';
  }
  if (!s.contactId) {
    const c = s.contacto;
    if (!c?.firstName?.trim()) return 'Falta el nombre del contacto';
    if (!c.email?.trim() && !c.phone?.trim()) {
      return 'Hace falta al menos un teléfono o un correo';
    }
    if (c.email?.trim() && !correoValido(c.email)) return 'El correo no parece válido';
  }
  if (pideDetalleDeOrigen(s.leadSource) && !s.leadSourceDetail?.trim()) {
    return 'Indica quién refirió o de qué canal viene';
  }
  return null;
}
