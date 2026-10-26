import type { AppNotification } from '@/types';

/**
 * A donde lleva una notificacion al pulsarla.
 *
 * El API guarda en `data` el id de aquello de lo que habla el aviso —lo hace
 * desde el principio: el campo del modelo ya se documento como "a donde lleva
 * al pulsarla"—, pero la bandeja nunca lo uso y enterarse de una reserva
 * obligaba a ir a buscarla al calendario a mano.
 *
 * El destino depende de quien mire, no solo del aviso: la MISMA reserva le
 * llega al anfitrion y al comensal, y cada uno la ve en su pantalla. Mandar al
 * comensal al calendario del anfitrion seria mandarlo a un sitio donde no
 * tiene nada que hacer.
 *
 * Devuelve null cuando no hay a donde ir —un aviso del sistema, o uno sin
 * `data`—; entonces pulsar solo lo marca como leido.
 */
export function destinoDeNotificacion(
  n: AppNotification,
  esComensal: boolean,
): string | null {
  const reservationId = n.data?.reservationId;
  if (typeof reservationId === 'string' && reservationId) {
    return esComensal
      ? `/dashboard/mis-reservas?reserva=${encodeURIComponent(reservationId)}`
      : `/dashboard/reservations?reserva=${encodeURIComponent(reservationId)}`;
  }

  // Un comensal no edita experiencias, asi que para el esto no lleva a ningun
  // sitio util.
  const experienceId = n.data?.experienceId;
  if (!esComensal && typeof experienceId === 'string' && experienceId) {
    return `/dashboard/experiences/${encodeURIComponent(experienceId)}/edit`;
  }

  return null;
}
