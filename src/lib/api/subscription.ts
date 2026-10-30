// La suscripción del anfitrión a la plataforma: un plan, pago mensual sin
// permanencia. Cada pago compra 30 días y se suman a los que ya queden.
import { aNumero, api } from './client';

export type PagoDeSuscripcion = {
  id: string;
  /** Lo que pagó: base + IVA. */
  amount: number;
  baseAmount: number;
  vatAmount: number;
  /**
   * WOMPI y MERCADO_PAGO: lo pagó en línea. MANUAL: lo registró FILO (una
   * transferencia).
   */
  method: 'WOMPI' | 'MERCADO_PAGO' | 'MANUAL';
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type EstadoDeSuscripcion = {
  /** La plataforma la exige a esta empresa. Si no, no hay nada que pagar. */
  requerida: boolean;
  exenta: boolean;
  vigente: boolean;
  /** Se le exige y no la tiene: el panel está cerrado. */
  bloqueada: boolean;
  endsAt: string | null;
  diasRestantes: number | null;
  /** Lo que vale, sin IVA. */
  precio: number;
  ivaPorcentaje: number;
  iva: number;
  /** Lo que se cobra: precio + IVA. */
  total: number;
  /** Con qué pasarela cobra la plataforma, la que eligió el administrador. */
  proveedor: Pasarela;
  /**
   * El cobro automático del anfitrión. Solo Mercado Pago lo tiene; con Wompi
   * cada mes se paga a mano. null = nunca lo ha autorizado.
   */
  renovacion: EstadoDeRenovacion | null;
  pagos: PagoDeSuscripcion[];
};

export type Pasarela = 'WOMPI' | 'MERCADO_PAGO';

export type EstadoDeRenovacion = 'PENDIENTE' | 'ACTIVA' | 'PAUSADA' | 'CANCELADA';

/** Mercado Pago: basta con llevar al anfitrión a donde autoriza el cobro. */
export type CheckoutDeMercadoPago = {
  proveedor: 'MERCADO_PAGO';
  checkoutUrl: string;
};

export type CheckoutDeWompi = {
  proveedor: 'WOMPI';
  checkoutUrl: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
  environment: string;
};

export type CheckoutDeSuscripcion = CheckoutDeWompi | CheckoutDeMercadoPago;

const aEstado = (e: EstadoDeSuscripcion): EstadoDeSuscripcion => ({
  ...e,
  precio: aNumero(e.precio),
  ivaPorcentaje: aNumero(e.ivaPorcentaje),
  iva: aNumero(e.iva),
  total: aNumero(e.total),
  pagos: (e.pagos ?? []).map((p) => ({
    ...p,
    amount: aNumero(p.amount),
    baseAmount: aNumero(p.baseAmount),
    vatAmount: aNumero(p.vatAmount),
  })),
});

export const getSuscripcion = async () => aEstado(await api.get<EstadoDeSuscripcion>('/subscription'));

/** Un intento de pago nuevo con la pasarela que haya elegido la plataforma. */
export const crearCheckoutDeSuscripcion = () =>
  api.post<CheckoutDeSuscripcion>('/subscription/checkout');

/** Deja de renovar solo. Los días ya pagados se conservan. */
export const cancelarRenovacionAutomatica = async () =>
  aEstado(await api.post<EstadoDeSuscripcion>('/subscription/renovacion/cancelar'));

// ─── Administración ────────────────────────────────────────────────────────

export type SuscripcionDeEmpresa = {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  endsAt: string | null;
  exenta: boolean;
  diasRestantes: number | null;
  /** Sin días pagados. Con la suscripción apagada nadie está bloqueado, pero esto dice quién lo estaría. */
  vencida: boolean;
  bloqueada: boolean;
};

export const listSuscripciones = async () =>
  (await api.get<SuscripcionDeEmpresa[]>('/subscription/admin')) ?? [];

/** Registra un pago que no pasó por la pasarela; suma los días igual. */
export const registrarPagoManualDeSuscripcion = (
  companyId: string,
  data: { periodos: number; notes?: string },
) => api.post(`/subscription/admin/${encodeURIComponent(companyId)}/pago-manual`, data);

export const definirExencionDeSuscripcion = (companyId: string, exenta: boolean) =>
  api.patch(`/subscription/admin/${encodeURIComponent(companyId)}/exenta`, { exenta });

/**
 * Lleva al anfitrión a pagar. Mercado Pago es una URL a la que se va sin más;
 * Wompi, un formulario firmado por el servidor.
 */
export function irAPagar(c: CheckoutDeSuscripcion): void {
  if (c.proveedor === 'MERCADO_PAGO') {
    window.location.href = c.checkoutUrl;
    return;
  }
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = c.checkoutUrl;
  const campos: Record<string, string> = {
    'public-key': c.publicKey,
    currency: c.currency,
    'amount-in-cents': String(c.amountInCents),
    reference: c.reference,
    'signature:integrity': c.signature,
    'redirect-url': c.redirectUrl,
  };
  for (const [name, value] of Object.entries(campos)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/**
 * Fija la fecha de vencimiento tal cual (null = sin suscripción pagada). No
 * crea un pago: sirve para corregir, p. ej. un pago extemporáneo.
 */
export const definirVencimientoDeSuscripcion = (
  companyId: string,
  data: { endsAt: string | null; notes?: string },
) => api.patch(`/subscription/admin/${encodeURIComponent(companyId)}/vencimiento`, data);

// ─── Estadísticas de ventas ────────────────────────────────────────────────

export type EstadisticasDeSuscripciones = {
  meses: number;
  totales: {
    pagos: number;
    total: number;
    base: number;
    iva: number;
    empresasQuePagaron: number;
    ticketPromedio: number;
  };
  porMes: {
    /** "2026-10" */
    period: string;
    pagos: number;
    total: number;
    base: number;
    iva: number;
    empresas: number;
    /** Empresas cuyo primer pago de siempre cayó en este mes. */
    altas: number;
  }[];
  porMetodo: { method: string; pagos: number; total: number }[];
  cartera: { alDia: number; vencidas: number; sinPagar: number; exentas: number; total: number };
};

/** Lo vendido en suscripciones, mes a mes y por método de pago. Solo el administrador. */
export const getEstadisticasDeSuscripciones = async (meses = 12) => {
  const e = await api.get<EstadisticasDeSuscripciones>('/subscription/admin/estadisticas', { meses });
  return {
    ...e,
    totales: {
      ...e.totales,
      total: aNumero(e.totales.total),
      base: aNumero(e.totales.base),
      iva: aNumero(e.totales.iva),
      ticketPromedio: aNumero(e.totales.ticketPromedio),
    },
  };
};
