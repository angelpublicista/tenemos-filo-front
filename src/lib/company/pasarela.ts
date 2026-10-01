import { api } from '@/lib/api/client';

/**
 * La pasarela de cobro propia del anfitrión.
 *
 * Con ella conectada, el dinero del cliente entra directo a su cuenta: FILO no
 * lo toca y por eso no cobra comisión sobre esas ventas.
 *
 * Los secretos nunca vuelven del API, ni para su dueño. Solo se sabe si están
 * puestos, y para cambiar uno hay que escribirlo entero de nuevo.
 */
export type ProveedorDePago = 'WOMPI' | 'MERCADO_PAGO';

export interface PasarelaDeCobro {
  provider: ProveedorDePago | null;
  enabled: boolean;
  environment: 'SANDBOX' | 'PRODUCTION';
  publicKey: string | null;
  privateKeyConfigured: boolean;
  integritySecretConfigured: boolean;
  eventsSecretConfigured: boolean;
  /** Qué le falta para poder cobrar, en frases listas para enseñar. */
  faltan: string[];
  /**
   * Si con esto se cobra de verdad. Activa pero a medias no cobra: el dinero
   * sigue entrando por FILO hasta que esté completa, y decir "ya cobras tú"
   * mientras tanto sería mentir.
   */
  listaParaCobrar: boolean;
  /**
   * Solo al guardar: reservas suyas sin cobrar que quedan sin forma de
   * cobrarse si desconecta. No se le impide —es su pasarela— pero tiene que
   * enterarse antes y no al día siguiente.
   */
  reservasSinCobrar?: number;
}

export interface GuardarPasarela {
  provider?: ProveedorDePago;
  enabled?: boolean;
  environment?: 'SANDBOX' | 'PRODUCTION';
  /** Cadena vacía borra el secreto; omitirlo lo deja como está. */
  publicKey?: string;
  privateKey?: string;
  integritySecret?: string;
  eventsSecret?: string;
}

export const getPasarela = (companyId: string) =>
  api.get<PasarelaDeCobro>(`/companies/${encodeURIComponent(companyId)}/pasarela`);

export const guardarPasarela = (companyId: string, datos: GuardarPasarela) =>
  api.put<PasarelaDeCobro>(`/companies/${encodeURIComponent(companyId)}/pasarela`, datos);
