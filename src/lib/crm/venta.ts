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

/** Los motivos de pérdida acordados. Si cambian, se cambian aquí. */
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

/** CRM-32. En una abierta no hay pre-reserva: se crea la reserva y ya. */
export const crearReservaDeOportunidad = (
  opportunityId: string,
  datos: {
    experienceId: string;
    locationId?: string;
    reservationDate: string;
    participants: number;
    total: number;
  },
) => api.post(`/opportunities/${encodeURIComponent(opportunityId)}/reserva`, datos);

/**
 * CRM-32/33. El enlace con lo que ya sabemos del cliente.
 *
 * Devuelve un token, no los datos en la URL: un enlace se reenvía y acaba en
 * sitios que nadie previó. Mandarlo cuenta como propuesta enviada.
 */
export const generarEnlaceDeReserva = (opportunityId: string) =>
  api.post<{ url: string; token: string }>(
    `/opportunities/${encodeURIComponent(opportunityId)}/enlace-de-reserva`,
    {},
  );

/** CRM-31. Los datos fiscales, con lo que ya haya en el sistema. */
export interface DatosDeFacturacion {
  businessName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

/** De dónde salieron: la venta ya cerrada, la empresa o el contacto. */
export type OrigenDeFacturacion = 'venta' | 'empresa' | 'contacto';

export const getFacturacion = (opportunityId: string) =>
  api.get<{ datos: DatosDeFacturacion; origen: OrigenDeFacturacion }>(
    `/opportunities/${encodeURIComponent(opportunityId)}/facturacion`,
  );

export const guardarFacturacion = (opportunityId: string, datos: DatosDeFacturacion) =>
  api.put(`/opportunities/${encodeURIComponent(opportunityId)}/facturacion`, datos);

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
