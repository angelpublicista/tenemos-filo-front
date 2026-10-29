// La comisión mensual que los anfitriones le deben a FILO por cobrar con su
// propia pasarela.
//
// Con cobro propio el dinero entra a la cuenta del anfitrión y FILO no puede
// descontar su comisión del pago. Se junta por mes: FILO factura por fuera y
// el administrador marca aquí cuándo se pagó.
import { aNumero, api, apiEnvelope } from './client';

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

/** Una venta pagada, cobrada por FILO o por el anfitrión. */
export type VentaPropia = {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  participants: number;
  paymentMethod: string | null;
  /** Quién cobró: FILO o el anfitrión con su propia pasarela. */
  collectedBy: 'PLATFORM' | 'HOST';
  companyId: string;
  companyName: string;
  /** Quien la trajo, si entró por un revendedor. */
  resellerName: string | null;
  experienceTitle: string | null;
  total: number;
  filoCommission: number;
  resellerCommission: number;
};

export type TotalesDeVentasPropias = {
  vendido: number;
  filoCommission: number;
  resellerCommission: number;
};

/**
 * Todas las ventas pagadas, de cualquier anfitrión y de cualquier pasarela.
 * Solo el administrador. Los totales cubren el filtro entero, no la página.
 */
export const listVentasPropias = async (params: {
  companyId?: string;
  period?: string;
  cobro?: 'PLATFORM' | 'HOST';
  canal?: 'RESELLER' | 'DIRECTO';
  page?: number;
  pageSize?: number;
}) => {
  const payload = await apiEnvelope<VentaPropia[]>('/fees/ventas', {
    companyId: params.companyId || undefined,
    period: params.period || undefined,
    cobro: params.cobro,
    canal: params.canal,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
  const totals = (payload?.meta?.totals ?? {}) as Partial<TotalesDeVentasPropias>;
  const items = (payload?.data ?? []).map((v) => ({
    ...v,
    total: aNumero(v.total),
    filoCommission: aNumero(v.filoCommission),
    resellerCommission: aNumero(v.resellerCommission),
  }));
  return {
    items,
    total: aNumero(payload?.meta?.total ?? items.length),
    totals: {
      vendido: aNumero(totals.vendido),
      filoCommission: aNumero(totals.filoCommission),
      resellerCommission: aNumero(totals.resellerCommission),
    } satisfies TotalesDeVentasPropias,
  };
};
