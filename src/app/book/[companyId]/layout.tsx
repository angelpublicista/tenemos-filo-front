import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reservar experiencia | Tenemos Filo',
};

export default function BookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  return children;
}
