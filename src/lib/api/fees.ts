// La comisión mensual que los anfitriones le deben a FILO por cobrar con su
// propia pasarela.
//
// Con cobro propio el dinero entra a la cuenta del anfitrión y FILO no puede
// descontar su comisión del pago. Se junta por mes: FILO factura por fuera y
// el administrador marca aquí cuándo se pagó.
import { aNumero, api } from './client';

/**
 * En curso: el mes no ha terminado y la cifra todavía puede cambiar, así que
 * no se cobra ni se marca como pagado.
 */
export type EstadoDelMes = 'EN_CURSO' | 'PENDIENTE' | 'PARCIAL' | 'PAGADO';

export type PagoDeComision = {
  id: string;
  amount: number;
  reference: string | null;
  paidAt: string;
};

export type BalanceMensual = {
  companyId: string;
  companyName: string;
  /** "2026-10" */
  period: string;
  reservas: number;
  accrued: number;
  paid: number;
  pending: number;
  estado: EstadoDelMes;
  pagos: PagoDeComision[];
};

export type ReservaDelBalance = {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  participants: number;
  experienceTitle: string | null;
  total: number;
  filoCommission: number;
};

const aBalance = (b: BalanceMensual): BalanceMensual => ({
  ...b,
  accrued: aNumero(b.accrued),
  paid: aNumero(b.paid),
  pending: aNumero(b.pending),
  pagos: (b.pagos ?? []).map((p) => ({ ...p, amount: aNumero(p.amount) })),
});

const aReserva = (r: ReservaDelBalance): ReservaDelBalance => ({
  ...r,
  total: aNumero(r.total),
  filoCommission: aNumero(r.filoCommission),
});

/** Todos los anfitriones y meses. Solo el administrador. */
export const listBalancesDeComision = async () =>
  ((await api.get<BalanceMensual[]>('/fees')) ?? []).map(aBalance);

/** Los de la propia empresa. */
export const getMisComisionesConFilo = async () =>
  ((await api.get<BalanceMensual[]>('/fees/me')) ?? []).map(aBalance);

export const getDetalleDelBalance = async (companyId: string, period: string) =>
  ((await api.get<ReservaDelBalance[]>(
    `/fees/${encodeURIComponent(companyId)}/${encodeURIComponent(period)}`,
  )) ?? []).map(aReserva);

export const getDetalleDeMiBalance = async (period: string) =>
  ((await api.get<ReservaDelBalance[]>(`/fees/me/${encodeURIComponent(period)}`)) ?? []).map(
    aReserva,
  );

/** Deja constancia de que el mes se pagó. Sin `amount`, todo lo pendiente. */
export const marcarComisionPagada = (data: {
  companyId: string;
  period: string;
  amount?: number;
  reference?: string;
}) => api.post('/fees/payments', data);

/** Corrige un pago marcado por error. */
export const deshacerPagoDeComision = (id: string) =>
  api.delete(`/fees/payments/${encodeURIComponent(id)}`);
