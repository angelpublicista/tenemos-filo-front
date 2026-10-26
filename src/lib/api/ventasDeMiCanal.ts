// Lo que vendió este canal, con la asistencia de cada reserva (TR-25).
//
// Distinto de «Mis ingresos»: eso es dinero y solo cuenta lo cobrado. Esto es
// operación, e incluye lo que todavía no se ha pagado. Un revendedor necesita
// las dos cosas por razones distintas: una para facturar, otra para contarle
// a su cliente corporativo quién apareció.
import { api, apiEnvelope } from './client';

export interface VentaDeMiCanal {
  id: string;
  reservationNumber: string;
  confirmationCode: string | null;
  reservationDate: string;
  experienceTitle: string | null;
  hostCompanyName: string | null;
  clienteNombre: string | null;
  participants: number;
  /** null mientras el anfitrión no haya cerrado la experiencia. */
  attendedCount: number | null;
  status: string;
  paymentStatus: string;
  total: number;
  resellerCommission: number;
}

export interface ResumenDeMiCanal {
  vendidas: number;
  personasVendidas: number;
  personasAsistieron: number;
  conAsistenciaRegistrada: number;
}

export async function getVentasDeMiCanal(params?: {
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
}): Promise<{ items: VentaDeMiCanal[]; resumen: ResumenDeMiCanal | null; total: number }> {
  const sobre = await apiEnvelope<VentaDeMiCanal[]>('/reservations/de-mi-canal', {
    pageSize: params?.pageSize ?? 100,
    ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
  });
  const meta = sobre?.meta as { total?: number; resumen?: ResumenDeMiCanal } | undefined;
  return {
    items: sobre?.data ?? [],
    resumen: meta?.resumen ?? null,
    total: meta?.total ?? 0,
  };
}

/**
 * Actualizar la propia venta (TR-27).
 *
 * No hay sincronización con la plataforma del revendedor: su cliente le
 * cancela o le cambia la fecha a él, y si no puede reflejarlo aquí, el
 * anfitrión guarda una mesa para gente que ya no viene.
 *
 * Solo lo que es suyo: personas, fecha y notas del cliente. El estado, el pago
 * y el precio son del anfitrión y de FILO.
 */
export const actualizarVentaDeMiCanal = (
  reservationId: string,
  cambios: {
    participants?: number;
    reservationDate?: string;
    specialRequirements?: string | null;
    permitirSolape?: boolean;
  },
) => api.patch(`/reservations/${encodeURIComponent(reservationId)}/de-mi-canal`, cambios);

/** Cancelar la propia venta: cuenta como cancelación del comensal. */
export const cancelarVentaDeMiCanal = (reservationId: string, reason: string) =>
  api.post(`/reservations/${encodeURIComponent(reservationId)}/de-mi-canal/cancelar`, { reason });
