// Las cuentas de la propia empresa: lo que ha generado, lo que Tenemos Filo
// ya le transfirio y lo que queda pendiente.
//
// El API resuelve la empresa desde la sesion, no desde un parametro, asi
// que aqui no se manda ningun companyId: no hay forma de pedir las cuentas
// de otra empresa ni por error.
import { aNumero, api, apiList } from './client';
import type { PayoutRole, Saldo } from './admin';

export type { PayoutRole, Saldo };

/** Una transferencia recibida. Sin datos de quien la registro en FILO. */
export type PayoutRecibido = {
  id: string;
  role: PayoutRole;
  amount: number;
  reference: string | null;
  paidAt: string;
};

export type ResumenIngresos = {
  balances: Saldo[];
  /**
   * Lo que ESTA empresa le debe a otras: la comisión de sus revendedores
   * sobre ventas que ella cobró con su propia pasarela. No se puede sumar con
   * `balances`, que es lo contrario —lo que le deben a ella.
   */
  debts: Saldo[];
  payouts: PayoutRecibido[];
  totals: { accrued: number; paid: number; pending: number; owed: number };
};

/** Una reserva cobrada, con el desglose de a donde fue cada peso. */
export type IngresoPorReserva = {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  participants: number;
  status: string;
  experienceTitle: string | null;
  companyName: string | null;
  total: number;
  filoCommission: number;
  resellerCommission: number;
  /** Lo que le queda a la empresa por esta reserva. */
  earnings: number;
  /**
   * A qué cuenta entró el dinero. Con PLATFORM, FILO lo tiene y se lo debe;
   * con HOST ya está en el banco del anfitrión y no hay nada que dispersar.
   */
  collectedBy: 'PLATFORM' | 'HOST';
};

const aSaldo = (s: Saldo): Saldo => ({
  ...s,
  accrued: aNumero(s.accrued),
  paid: aNumero(s.paid),
  pending: aNumero(s.pending),
});

export const getResumenIngresos = async (): Promise<ResumenIngresos> => {
  const r = await api.get<ResumenIngresos>('/payouts/me');
  return {
    balances: (r?.balances ?? []).map(aSaldo),
    debts: (r?.debts ?? []).map(aSaldo),
    payouts: (r?.payouts ?? []).map((p) => ({ ...p, amount: aNumero(p.amount) })),
    totals: {
      accrued: aNumero(r?.totals?.accrued),
      paid: aNumero(r?.totals?.paid),
      pending: aNumero(r?.totals?.pending),
      owed: aNumero(r?.totals?.owed),
    },
  };
};

export const listIngresosPorReserva = async (params: {
  role?: PayoutRole;
  page?: number;
  pageSize?: number;
}) => {
  const { items, total } = await apiList<IngresoPorReserva>('/payouts/me/earnings', {
    role: params.role ?? 'HOST',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
  return {
    items: items.map((r) => ({
      ...r,
      total: aNumero(r.total),
      filoCommission: aNumero(r.filoCommission),
      resellerCommission: aNumero(r.resellerCommission),
      earnings: aNumero(r.earnings),
    })),
    total,
  };
};
