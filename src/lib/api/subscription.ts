// La suscripción del anfitrión a la plataforma: un plan, pago mensual sin
// permanencia. Cada pago compra 30 días y se suman a los que ya queden.
import { aNumero, api } from './client';

export type PagoDeSuscripcion = {
  id: string;
  /** Lo que pagó: base + IVA. */
  amount: number;
  baseAmount: number;
  vatAmount: number;
  /** WOMPI: lo pagó en línea. MANUAL: lo registró FILO (una transferencia). */
  method: 'WOMPI' | 'MANUAL';
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
  pagos: PagoDeSuscripcion[];
};

export type CheckoutDeSuscripcion = {
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

/** Un intento de pago nuevo, firmado, para llevar al anfitrión a Wompi. */
export const crearCheckoutDeSuscripcion = () =>
  api.post<CheckoutDeSuscripcion>('/subscription/checkout');

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

/** Lleva al anfitrión al checkout de Wompi con un formulario firmado por el servidor. */
export function irAPagar(c: CheckoutDeSuscripcion): void {
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
