// Reescrito sobre el API. Conserva firmas para no tocar callers.
import { api, apiFetch, apiPostEnvelope } from '@/lib/api/client';
import type { DatosCheckout } from '@/components/BookingEngine/BotonDePago';
import {
  Reservation,
  CreateReservationData,
  UpdateReservationData,
  ReservationSearchParams,
} from '@/types';

// ─── Mapeos enum ───────────────────────────────────────────────────────────

type ApiStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type ApiPayStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'PARTIAL' | 'FAILED';
type ApiClientType = 'GUEST' | 'REGISTERED';
type ApiSource = 'MANUAL' | 'BOOKING_ENGINE' | 'QUOTE';

const STATUS_TO_API: Record<Reservation['status'], ApiStatus> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_show: 'NO_SHOW',
};
const STATUS_FROM_API: Record<ApiStatus, Reservation['status']> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};
const PAY_TO_API: Record<Reservation['paymentStatus'], ApiPayStatus> = {
  pending: 'PENDING',
  paid: 'PAID',
  refunded: 'REFUNDED',
  partial: 'PARTIAL',
  failed: 'FAILED',
};
const PAY_FROM_API: Record<ApiPayStatus, Reservation['paymentStatus']> = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PARTIAL: 'partial',
  FAILED: 'failed',
};

interface ApiReservation {
  id: string;
  reservationNumber: string;
  experienceId: string;
  companyId: string;
  client: Reservation['client'];
  clientType: ApiClientType;
  userId: string | null;
  source: ApiSource;
  reservationDate: string;
  duration: number | null;
  participants: number;
  status: ApiStatus;
  paymentStatus: ApiPayStatus;
  pricing: Reservation['pricing'];
  paymentMethod: string | null;
  paymentDetails: Record<string, unknown> | null;
  locationId: string | null;
  isVirtual: boolean;
  virtualDetails: string | null;
  specialRequirements: string | null;
  cancellation: Reservation['cancellation'] | null;
  rescheduling: Reservation['rescheduling'] | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  experience?: { id: string; title: string; duration: number | null; capacity: number | null };
  company?: { id: string; companyName: string; companyEmail: string | null; companyPhone: string | null };
  user?: { id: string; name: string | null; email: string; phone: string | null };
  location?: { id: string; name: string; address: unknown };
}

function toReservation(r: ApiReservation): Reservation {
  return {
    _id: r.id,
    _type: 'reservation',
    reservationNumber: r.reservationNumber,
    experience: r.experience
      ? {
          _id: r.experience.id,
          title: r.experience.title,
          category: '',
          duration: r.experience.duration ?? 0,
          capacity: r.experience.capacity ?? 0,
        }
      : { _id: r.experienceId, title: '', category: '', duration: 0, capacity: 0 },
    company: r.company
      ? {
          _id: r.company.id,
          companyName: r.company.companyName,
          companyEmail: r.company.companyEmail ?? '',
          companyPhone: r.company.companyPhone ?? '',
        }
      : { _id: r.companyId, companyName: '', companyEmail: '', companyPhone: '' },
    client: r.client,
    clientInfo: r.client,
    clientType: ((r.clientType ?? 'GUEST') as string).toLowerCase() as Reservation['clientType'],
    reservationDate: r.reservationDate,
    duration: r.duration ?? 0,
    participants: r.participants,
    status: STATUS_FROM_API[r.status],
    paymentStatus: PAY_FROM_API[r.paymentStatus],
    pricing: r.pricing,
    paymentMethod: (r.paymentMethod ?? undefined) as Reservation['paymentMethod'],
    paymentDetails: r.paymentDetails ?? undefined,
    location: r.location
      ? {
          _id: r.location.id,
          name: r.location.name,
          address: (r.location.address as Reservation['location'] extends infer L
            ? L extends { address: infer A }
              ? A
              : never
            : never) ?? { street: '', city: '' },
        }
      : undefined,
    isVirtual: r.isVirtual,
    virtualDetails: r.virtualDetails
      ? typeof r.virtualDetails === 'string'
        ? (() => {
            try {
              return JSON.parse(r.virtualDetails) as Reservation['virtualDetails'];
            } catch {
              return undefined;
            }
          })()
        : (r.virtualDetails as Reservation['virtualDetails'])
      : undefined,
    specialRequirements: r.specialRequirements ?? undefined,
    cancellation: r.cancellation ?? undefined,
    rescheduling: r.rescheduling ?? undefined,
    rating: r.rating != null ? { score: r.rating } : undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── API publica ───────────────────────────────────────────────────────────

export const createReservationInSanity = async (data: CreateReservationData) => {
  const created = await api.post<ApiReservation>('/reservations', {
    experience: data.experience,
    company: data.company,
    client: data.client,
    reservationDate: data.reservationDate,
    duration: data.duration,
    participants: data.participants,
    status: data.status ? STATUS_TO_API[data.status] : undefined,
    paymentStatus: data.paymentStatus ? PAY_TO_API[data.paymentStatus] : undefined,
    pricing: data.pricing,
    paymentMethod: data.paymentMethod,
    paymentDetails: data.paymentDetails,
    location: data.location,
    isVirtual: data.isVirtual,
    virtualDetails: data.virtualDetails,
    specialRequirements: data.specialRequirements,
    notes: data.notes,
  });
  return toReservation(created);
};

export const getReservations = async (
  searchParams: ReservationSearchParams = {},
): Promise<Reservation[]> => {
  const { query = '', filters = {}, sortBy = 'reservationDate', sortOrder = 'desc', page = 1, limit = 20 } = searchParams;
  const items = await api.get<ApiReservation[]>('/reservations', {
    search: query || undefined,
    status: filters.status ? STATUS_TO_API[filters.status as Reservation['status']] : undefined,
    paymentStatus: filters.paymentStatus
      ? PAY_TO_API[filters.paymentStatus as Reservation['paymentStatus']]
      : undefined,
    experienceId: filters.experience,
    isVirtual: filters.isVirtual,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy,
    sortOrder,
    page,
    limit,
  });
  return items.map(toReservation);
};

export const getReservationsByCompany = async (companyId: string): Promise<Reservation[]> => {
  const items = await api.get<ApiReservation[]>('/reservations', { companyId, limit: 100 });
  return items.map(toReservation);
};

export const getReservationById = async (reservationId: string): Promise<Reservation | null> => {
  try {
    const r = await api.get<ApiReservation>(`/reservations/${encodeURIComponent(reservationId)}`);
    return toReservation(r);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const updateReservationInSanity = async (data: UpdateReservationData) => {
  const { _id, ...rest } = data;
  const body: Record<string, unknown> = {};
  if (rest.client !== undefined) body.client = rest.client;
  if (rest.reservationDate !== undefined) body.reservationDate = rest.reservationDate;
  if (rest.duration !== undefined) body.duration = rest.duration;
  if (rest.participants !== undefined) body.participants = rest.participants;
  if (rest.status !== undefined) body.status = STATUS_TO_API[rest.status];
  if (rest.paymentStatus !== undefined) body.paymentStatus = PAY_TO_API[rest.paymentStatus];
  if (rest.pricing !== undefined) body.pricing = rest.pricing;
  if (rest.paymentMethod !== undefined) body.paymentMethod = rest.paymentMethod;
  if (rest.paymentDetails !== undefined) body.paymentDetails = rest.paymentDetails;
  if (rest.location !== undefined) body.location = rest.location;
  if (rest.isVirtual !== undefined) body.isVirtual = rest.isVirtual;
  if (rest.virtualDetails !== undefined) body.virtualDetails = rest.virtualDetails;
  if (rest.specialRequirements !== undefined) body.specialRequirements = rest.specialRequirements;
  if (rest.notes !== undefined) body.notes = rest.notes;

  const updated = await api.patch<ApiReservation>(
    `/reservations/${encodeURIComponent(_id)}`,
    body,
  );
  return toReservation(updated);
};

export const updateReservationStatus = async (
  reservationId: string,
  status: Reservation['status'],
) => {
  const updated = await api.patch<ApiReservation>(
    `/reservations/${encodeURIComponent(reservationId)}/status`,
    { status: STATUS_TO_API[status] },
  );
  return toReservation(updated);
};

export const updateReservationPaymentStatus = async (
  reservationId: string,
  paymentStatus: Reservation['paymentStatus'],
) => {
  const updated = await api.patch<ApiReservation>(
    `/reservations/${encodeURIComponent(reservationId)}/payment-status`,
    { paymentStatus: PAY_TO_API[paymentStatus] },
  );
  return toReservation(updated);
};

export const cancelReservation = async (
  reservationId: string,
  cancelledBy: 'client' | 'host' | 'system',
  reason: string,
  refundAmount?: number,
) => {
  const updated = await api.post<ApiReservation>(
    `/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { cancelledBy, reason, refundAmount },
  );
  return toReservation(updated);
};

export const rescheduleReservation = async (
  reservationId: string,
  newDate: string,
  reason: string,
  requestedBy: 'client' | 'host',
) => {
  const updated = await api.post<ApiReservation>(
    `/reservations/${encodeURIComponent(reservationId)}/reschedule`,
    { newDate, reason, requestedBy },
  );
  return toReservation(updated);
};

export const deleteReservationInSanity = async (reservationId: string) => {
  await api.delete(`/reservations/${encodeURIComponent(reservationId)}`);
};

export const getReservationStatsByCompany = async (companyId: string) => {
  return api.get<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    totalRevenue: number;
    totalParticipants: number;
    averageParticipants: number;
    pendingPayments: number;
    paidReservations: number;
  }>(`/reservations/stats/by-company/${encodeURIComponent(companyId)}`);
};

// ─── Reserva manual (host) ─────────────────────────────────────────────────

export interface CreateManualReservationData {
  experience: string;
  location: string;
  reservationDate: string;
  participants: number;
  specialRequests?: string;
  clientType: 'guest' | 'registered';
  source?: string;
  guestInfo?: { name: string; email: string; phone: string };
  registeredUserId?: string;
  selectedAddons?: Array<{ name: string; price: number; quantity: number }>;
}

interface ApiExperienceLite {
  id: string;
  basePrice: number | string | null;
  currency: string;
  duration: number | null;
  companyId: string;
}

export const createReservationManually = async (data: CreateManualReservationData) => {
  const exp = await api.get<ApiExperienceLite>(`/experiences/${encodeURIComponent(data.experience)}`);
  if (!exp) throw new Error('Experiencia no encontrada');

  const basePrice = typeof exp.basePrice === 'string' ? Number(exp.basePrice) : (exp.basePrice ?? 0);
  const subtotal = basePrice * data.participants;
  const addonsTotal =
    data.selectedAddons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
  const total = subtotal + addonsTotal;

  const created = await api.post<ApiReservation>('/reservations', {
    experience: data.experience,
    company: exp.companyId,
    location: data.location,
    clientType: data.clientType.toUpperCase(),
    source: 'MANUAL',
    user: data.registeredUserId,
    client: data.guestInfo ?? { name: '', email: '', phone: '' },
    reservationDate: data.reservationDate,
    duration: exp.duration ?? undefined,
    participants: data.participants,
    status: 'CONFIRMED',
    paymentStatus: 'PENDING',
    pricing: {
      basePrice,
      subtotal,
      addons: data.selectedAddons ?? [],
      addonsTotal,
      discount: 0,
      tax: 0,
      commission: 0,
      total,
      hostEarnings: total,
    },
    specialRequirements: data.specialRequests,
    notes: `Reserva creada manualmente. Cliente tipo: ${data.clientType === 'guest' ? 'Invitado' : 'Registrado'}`,
  });
  return toReservation(created);
};

// ─── Reserva publica (booking engine, sin auth) ────────────────────────────

export interface CreatePublicReservationData {
  experience: string;
  /** Slug del revendedor, si la reserva entra por su catálogo. */
  reseller?: string;
  location?: string;
  reservationDate: string;
  participants: number;
  specialRequests?: string;
  selectedAddons?: Array<{ name: string; price: number; quantity: number }>;
  guestInfo: { name: string; email: string; phone: string };
  /**
   * Token del enlace que el anfitrión generó desde su CRM. Cuelga la reserva
   * de esa oportunidad, para que el comercial vea en ella la reserva que su
   * propio enlace acaba de producir.
   */
  solicitudToken?: string;
  /**
   * TR-43. Clave que hace que un reintento no cree una segunda reserva.
   *
   * La pone quien llama y la conserva mientras los datos no cambien: si el
   * API responde con un error de red o el cliente vuelve a pulsar
   * "Confirmar", la misma clave devuelve la reserva que ya existe en vez de
   * vender el cupo dos veces y cobrarlo dos veces.
   */
  idempotencyKey?: string;
}

export const createPublicReservation = async (
  data: CreatePublicReservationData,
): Promise<{
  reservationNumber: string;
  /** El que le van a pedir al llegar. Lo trae el API desde que existe. */
  confirmationCode?: string | null;
  payment?: DatosCheckout | null;
}> => {
  // El precio lo calcula el API desde la experiencia: en el catalogo
  // publico no hay sesion y un precio enviado por el cliente seria
  // manipulable. Aqui solo se manda QUE adicionales eligio.

  return apiFetch<{
    reservationNumber: string;
    confirmationCode?: string | null;
    payment?: DatosCheckout | null;
  }>(
    '/reservations/public',
    {
    method: 'POST',
    ...(data.idempotencyKey ? { headers: { 'Idempotency-Key': data.idempotencyKey } } : {}),
    json: {
      experience: data.experience,
      // Slug del revendedor cuando la reserva entra por su catalogo. El
      // API lo valida y de el depende que se genere la comision.
      ...(data.reseller ? { reseller: data.reseller } : {}),
      ...(data.solicitudToken ? { solicitudToken: data.solicitudToken } : {}),
      location: data.location,
      client: data.guestInfo,
      reservationDate: data.reservationDate,
      participants: data.participants,
      pricing: {
        // Solo la seleccion de adicionales; los importes los pone el API.
        addons: data.selectedAddons ?? [],
        basePrice: 0,
        subtotal: 0,
        total: 0,
      },
      specialRequirements: data.specialRequests || '',
      notes: 'Reserva realizada desde el catalogo digital publico.',
    },
    },
  );
};

/** Una reserva como la ve el anfitrión al validarla en la puerta. */
export interface ReservaValidada {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  participants: number;
  checkedInAt: string | null;
  experience?: { title?: string } | null;
  resellerCompany?: { id: string; companyName: string } | null;
  client?: { name?: string } | null;
}

/**
 * Validar en la puerta el código que trae el cliente, y marcar su llegada.
 *
 * Un 404 aquí no es un fallo de la pantalla: significa que esa venta no entró
 * por FILO. Es justo la señal que hay que ver, así que el mensaje del API se
 * enseña tal cual.
 *
 * Conserva el `meta` porque ahí viene si la persona ya había llegado, y eso
 * no cabe dentro de la reserva.
 */
export const validarCodigoDeReserva = (codigo: string) =>
  apiPostEnvelope<ReservaValidada, { yaHabiaLlegado?: boolean }>(
    '/reservations/validar-codigo',
    { codigo },
  );
