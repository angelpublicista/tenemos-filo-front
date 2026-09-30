import { api } from '@/lib/api/client';

/**
 * El tramo final del embudo: apartar el espacio, cobrar y cerrar.
 *
 * Las reglas de cuánto hay que haber cobrado viven en el API, no aquí. Es
 * dinero: una comprobación que solo corre en el navegador no es una
 * comprobación. Lo de aquí es para saber qué ofrecer, no para autorizar.
 */

export interface ReservaDeOportunidad {
  id: string;
  reservationNumber: string;
  status: 'PRE_RESERVED' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'IN_PROGRESS' | 'NO_SHOW' | 'RESCHEDULED';
  reservationDate: string;
  participants: number;
  paidAmount: string | number;
  paymentStatus: string;
  pricing?: { total?: number } | null;
}

/** Los motivos que hoy ofrece el API. Provisionales: están por definir. */
export const MOTIVOS_DE_PERDIDA = [
  { valor: 'PRECIO', etiqueta: 'Por precio' },
  { valor: 'FECHA_NO_DISPONIBLE', etiqueta: 'No había disponibilidad en su fecha' },
  { valor: 'ELIGIO_OTRO_PROVEEDOR', etiqueta: 'Eligió otro proveedor' },
  { valor: 'SIN_RESPUESTA', etiqueta: 'Dejó de responder' },
  { valor: 'CANCELO_EL_PLAN', etiqueta: 'Canceló el plan' },
  { valor: 'FUERA_DE_ALCANCE', etiqueta: 'Fuera de lo que ofrecemos' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

export const crearPreReserva = (
  opportunityId: string,
  datos: {
    experienceId: string;
    locationId?: string;
    reservationDate: string;
    participants: number;
    total: number;
  },
) => api.post(`/opportunities/${encodeURIComponent(opportunityId)}/pre-reserva`, datos);

export const registrarPago = (opportunityId: string, monto: number) =>
  api.post<{ pagado: number; total: number; faltante: number }>(
    `/opportunities/${encodeURIComponent(opportunityId)}/pago`,
    { monto },
  );

export const autorizarCondicionDePago = (opportunityId: string, nota: string) =>
  api.post(`/opportunities/${encodeURIComponent(opportunityId)}/condicion-de-pago`, { nota });

export const confirmarVenta = (opportunityId: string) =>
  api.post(`/opportunities/${encodeURIComponent(opportunityId)}/confirmar-venta`, {});

export const perderOportunidad = (opportunityId: string, motivo: string, notas?: string) =>
  api.post(`/opportunities/${encodeURIComponent(opportunityId)}/perder`, { motivo, notas });

/**
 * Cuánto falta para poder confirmar.
 *
 * Solo para enseñarlo: quien decide si se confirma es el API. Aquí sirve para
 * que el botón diga cuánto falta en vez de fallar sin explicar por qué.
 */
export function faltaParaConfirmar(
  reserva: ReservaDeOportunidad | undefined,
  esAbierta: boolean,
): { total: number; pagado: number; minimo: number; falta: number } {
  const total = Number(reserva?.pricing?.total ?? 0);
  const pagado = Number(reserva?.paidAmount ?? 0);
  const minimo = total * (esAbierta ? 1 : 0.5);
  return { total, pagado, minimo, falta: Math.max(0, minimo - pagado) };
}
