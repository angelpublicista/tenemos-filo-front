import { api } from '@/lib/api/client';

/**
 * El panel del CRM: qué necesita atención hoy.
 *
 * El CRM es una herramienta de venta, no un archivo. Al entrar, lo primero no
 * debería ser una lista de todo lo que existe sino lo que hay que hacer.
 */

export interface SeguimientoPendiente {
  id: string;
  kind: 'LEAD_24H' | 'LEAD_48H' | 'LEAD_72H' | 'PROPUESTA' | 'PROPUESTA_3D' | 'PROPUESTA_7D';
  dueAt: string;
  opportunity: {
    id: string;
    name: string;
    stage: string;
    experienceKind: 'ABIERTA' | 'PRIVADA' | null;
    contact: { firstName: string; lastName: string | null; phone: string | null; email: string | null } | null;
  };
}

export interface PropuestaSinRespuesta {
  id: string;
  name: string;
  proposalSentAt: string | null;
  value: string | number | null;
  contact: { firstName: string; lastName: string | null } | null;
}

export interface ExperienciaPorCalificar {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  client: unknown;
  experience: { title: string } | null;
}

export interface Pendientes {
  seguimientos: SeguimientoPendiente[];
  prereservas: PropuestaSinRespuesta[];
  porCalificar: ExperienciaPorCalificar[];
}

export interface Indicadores {
  propuestasEnviadas: number;
  ganadas: number;
  perdidas: number;
  pendientes: number;
  ventas: number;
  ticketPromedio: number;
}

export const ETIQUETA_SEGUIMIENTO: Record<SeguimientoPendiente['kind'], string> = {
  LEAD_24H: 'Primer contacto (24 h)',
  LEAD_48H: 'Segundo intento (48 h)',
  LEAD_72H: 'Último intento (72 h)',
  // Tres recordatorios de lo mismo, y la etiqueta dice en cuál vas: si los
  // tres dijeran igual, la lista parecería repetirse sola.
  PROPUESTA: 'Propuesta sin respuesta',
  PROPUESTA_3D: 'Propuesta sin respuesta · 3 días',
  PROPUESTA_7D: 'Propuesta sin respuesta · última',
};

export const obtenerPendientes = () => api.get<Pendientes>('/crm-panel/pendientes');
export const obtenerIndicadores = () => api.get<Indicadores>('/crm-panel/indicadores');

/** Marcar un seguimiento como hecho o como que ya no aplica. */
export const cerrarSeguimiento = (id: string, status: 'HECHO' | 'NO_APLICA') =>
  api.patch(`/crm-panel/seguimientos/${encodeURIComponent(id)}`, { status });

/**
 * CRM-26. Cerrar una experiencia que ya ocurrió.
 *
 * Dos salidas porque hay dos cosas que pueden haber pasado: se realizó, o el
 * comensal no se presentó. La calificación es opcional — exigirla convertiría
 * un pendiente de un clic en uno que se pospone.
 */
export const cerrarExperiencia = (
  reservationId: string,
  datos: { resultado: 'REALIZADA' | 'NO_SE_PRESENTO'; rating?: number; notas?: string },
) => api.post(`/crm-panel/experiencias/${encodeURIComponent(reservationId)}/cerrar`, datos);

/**
 * Cuánto se ha pasado de su fecha, en palabras.
 *
 * Se dice "vence hoy" y no "en 3 horas": el comercial decide si lo hace hoy o
 * no, y la precisión de horas no cambia esa decisión.
 */
export function cuandoVence(iso: string): { texto: string; vencido: boolean } {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias < 0) return { texto: 'vence mañana', vencido: false };
  if (dias === 0) return { texto: 'vence hoy', vencido: false };
  if (dias === 1) return { texto: 'venció ayer', vencido: true };
  return { texto: `venció hace ${dias} días`, vencido: true };
}
