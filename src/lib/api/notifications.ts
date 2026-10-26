// Bandeja de notificaciones.
//
// El API usa MAYUSCULAS para el tipo y el front minúsculas desde la época
// de Firestore. Se traduce aquí y no en las pantallas, que ya conocen el
// formato antiguo.
import { api, apiEnvelope } from './client';
import type { AppNotification, NotificationType } from '@/types';

type TipoApi =
  | 'NEW_RESERVATION'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_RESCHEDULED'
  | 'PAYMENT_RECEIVED'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM';

const TIPO: Record<TipoApi, NotificationType> = {
  NEW_RESERVATION: 'new_reservation',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  RESERVATION_RESCHEDULED: 'reservation_rescheduled',
  PAYMENT_RECEIVED: 'payment_received',
  REVIEW_RECEIVED: 'review_received',
  SYSTEM: 'system',
};

type NotificacionApi = {
  id: string;
  type: TipoApi;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
};

function aNotificacion(n: NotificacionApi): AppNotification {
  const ms = new Date(n.createdAt).getTime();
  return {
    id: n.id,
    type: TIPO[n.type] ?? 'system',
    title: n.title,
    message: n.message,
    read: n.read,
    // Las pantallas esperan la forma de un Timestamp de Firestore, de
    // cuando las notificaciones vivían allí. Se conserva para no reescribir
    // el formateo de fechas de la bandeja y de la campana.
    createdAt: { seconds: Math.floor(ms / 1000), nanoseconds: 0 },
    data: (n.data ?? undefined) as AppNotification['data'],
  };
}

export async function listarNotificaciones(): Promise<{
  items: AppNotification[];
  sinLeer: number;
}> {
  const payload = await apiEnvelope<NotificacionApi[]>('/notifications');
  return {
    items: (payload?.data ?? []).map(aNotificacion),
    sinLeer: Number(payload?.meta?.sinLeer ?? 0),
  };
}

export const marcarLeida = (id: string) =>
  api.patch<void>(`/notifications/${encodeURIComponent(id)}/read`);

export const marcarTodasLeidas = () => api.post<{ marcadas: number }>('/notifications/read-all');

export const borrarNotificacion = (id: string) =>
  api.delete<void>(`/notifications/${encodeURIComponent(id)}`);

export const borrarTodas = () => api.delete<{ borradas: number }>('/notifications');
