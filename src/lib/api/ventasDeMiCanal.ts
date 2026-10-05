// Lo que vendió este canal, con la asistencia de cada reserva (TR-25).
//
// Distinto de «Mis ingresos»: eso es dinero y solo cuenta lo cobrado. Esto es
// operación, e incluye lo que todavía no se ha pagado. Un revendedor necesita
// las dos cosas por razones distintas: una para facturar, otra para contarle
// a su cliente corporativo quién apareció.
import { apiEnvelope } from './client';

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
