import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reservar experiencia | Tenemos Filo',
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
