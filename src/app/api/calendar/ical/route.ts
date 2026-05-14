import { NextRequest, NextResponse } from 'next/server';

// Feed iCal publico para suscribirse desde Google Calendar/Outlook.
// TODO: reimplementar contra el API. Necesita un endpoint sin auth tipo
//   GET /reservations/feed/:token
// donde `token` sea un secreto por-company que el host genera desde el
// dashboard. Por ahora retornamos un calendario vacio para no romper
// suscriptores existentes.
type FeedReservation = {
  _id: string;
  reservationNumber?: string;
  reservationDate: string;
  duration?: number;
  participants?: number;
  status?: string;
  experienceTitle?: string;
  clientName?: string;
  clientEmail?: string;
  locationName?: string;
  isVirtual?: boolean;
  meetingLink?: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return new NextResponse('Missing companyId', { status: 400 });
  }

  try {
    // TODO: cambiar por fetch al API una vez exista /reservations/feed/:token
    const reservations: FeedReservation[] = [];

    const now = new Date();
    const stamp = formatDate(now);

    const events = reservations
      .map((r: Record<string, unknown>) => {
        if (!r.reservationDate) return '';

        const start = new Date(r.reservationDate as string);
        const end = new Date(start.getTime() + ((r.duration as number) || 60) * 60 * 1000);

        const locationStr: string = r.isVirtual
          ? (r.meetingLink as string) || 'Evento virtual'
          : (r.locationName as string) || '';

        const description = [
          `Reserva: ${r.reservationNumber || r._id}`,
          `Cliente: ${r.clientName || 'Sin nombre'}`,
          r.clientEmail ? `Email: ${r.clientEmail}` : '',
          `Participantes: ${r.participants || 1}`,
          r.isVirtual && r.meetingLink ? `Enlace: ${r.meetingLink}` : '',
        ]
          .filter(Boolean)
          .join('\\n');

        return [
          'BEGIN:VEVENT',
          `UID:tenemosfilo-${r._id}@tenemosfilo.com`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${formatDate(start)}`,
          `DTEND:${formatDate(end)}`,
          `SUMMARY:${escapeIcal((r.experienceTitle as string) || 'Experiencia')} — ${escapeIcal((r.clientName as string) || '')}`,
          `DESCRIPTION:${description}`,
          locationStr ? `LOCATION:${escapeIcal(locationStr)}` : '',
          `STATUS:${r.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n');
      })
      .filter(Boolean);

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tenemosfilo//Calendar//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Tenemosfilo — Mis reservas',
      'X-WR-TIMEZONE:America/Bogota',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tenemosfilo.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return new NextResponse('Error generating calendar', { status: 500 });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcal(str: string): string {
  return str.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}
