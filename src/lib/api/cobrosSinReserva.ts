// Cobros que llegaron sin una reserva a la que colgarse (TR-44).
//
// El requisito dice que ningún cobro puede quedar sin reserva. Cumplirlo no es
// impedir que ocurra —la pasarela cobra por su cuenta y lo cuenta después—
// sino que no pase desapercibido: aquí está la bandeja para revisarlos.
import { api, apiEnvelope } from './client';

export interface CobroSinReserva {
  id: string;
  gateway: 'WOMPI' | 'MERCADO_PAGO' | 'BOLD' | string;
  reference: string;
  transactionId: string | null;
  amount: string | number | null;
  currency: string | null;
  gatewayStatus: string | null;
  companyId: string | null;
  event: unknown;
  resolved: boolean;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export async function listarCobrosSinReserva(
  resueltos?: boolean,
): Promise<{ items: CobroSinReserva[]; pendientes: number }> {
  const sobre = await apiEnvelope<CobroSinReserva[]>('/payments/cobros-sin-reserva', {
    ...(resueltos === undefined ? {} : { resueltos: String(resueltos) }),
  });
  const meta = sobre?.meta as { pendientes?: number } | undefined;
  return { items: sobre?.data ?? [], pendientes: meta?.pendientes ?? 0 };
}

export const marcarCobroResuelto = (id: string, notas?: string) =>
  api.post(`/payments/cobros-sin-reserva/${encodeURIComponent(id)}/resuelto`, { notas });
