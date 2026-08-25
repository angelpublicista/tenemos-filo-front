// Las reservas de quien entra, como cliente.
//
// Distinto de las reservas del panel de un anfitrión: aquí no hay cifras
// del negocio, solo lo que le toca a quien va a comer.
import { api } from './client';

export type EstadoReserva =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type EstadoPago = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export type MiReserva = {
  id: string;
  reservationNumber: string;
  reservationDate: string;
  participants: number;
  status: EstadoReserva;
  paymentStatus: EstadoPago;
  pricing: { total?: number } | null;
  isVirtual: boolean;
  specialRequirements: string | null;
  experience: {
    id: string;
    title: string;
    duration: number | null;
    featuredImage: string | null;
  } | null;
  company: {
    companyName: string;
    companyEmail: string | null;
    companyPhone: string | null;
  } | null;
  location: { name: string; address: unknown } | null;
};

export const listarMisReservas = () => api.get<MiReserva[]>('/reservations/mine');

export const ETIQUETA_ESTADO: Record<EstadoReserva, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asististe',
  RESCHEDULED: 'Reprogramada',
};

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  PENDING: 'Pago pendiente',
  PAID: 'Pagada',
  REFUNDED: 'Reembolsada',
  FAILED: 'Pago fallido',
};
