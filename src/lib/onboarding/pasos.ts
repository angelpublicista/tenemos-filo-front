// Qué le toca hacer a un anfitrión para empezar a vender, y qué se le enseña
// en el tour por la plataforma.
//
// Los pasos se dan por hechos mirando lo que existe en su empresa, no porque
// los marque: una lista que dice "listo" sin estarlo es peor que no tenerla.
import type { AvanceDeOnboarding } from '@/lib/api/onboarding';

export interface PasoDeInicio {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  /** Texto del botón que lleva al paso. */
  accion: string;
}

export const PASOS_DE_INICIO: PasoDeInicio[] = [
  {
    id: 'empresa',
    titulo: 'Completa los datos de tu empresa',
    descripcion: 'Nombre, logo, descripción y contacto: es lo que ve quien entra a tu catálogo.',
    href: '/company-setup',
    accion: 'Completar',
  },
  {
    id: 'sede',
    titulo: 'Crea tu primera sede',
    descripcion: 'El lugar donde recibes a tus clientes, con su dirección.',
    href: '/dashboard/locations',
    accion: 'Crear sede',
  },
  {
    id: 'experiencia',
    titulo: 'Crea tu primera experiencia',
    descripcion: 'Lo que vendes: nombre, descripción, duración, precio y fotos.',
    href: '/dashboard/experiences',
    accion: 'Crear experiencia',
  },
  {
    id: 'horario',
    titulo: 'Define cuándo la ofreces',
    descripcion: 'Los días, las horas y los cupos disponibles para reservar.',
    href: '/dashboard/availability',
    accion: 'Definir horario',
  },
  {
    id: 'publicacion',
    titulo: 'Publica tu experiencia en una sede',
    descripcion: 'Ponla a la venta: ahí se decide el precio, el aforo y el horario de esa sede.',
    href: '/dashboard/publicaciones',
    accion: 'Publicar',
  },
  {
    id: 'cobros',
    titulo: 'Conecta cómo vas a cobrar',
    descripcion: 'Una pasarela de pago para que la reserva se confirme al pagar.',
    href: '/dashboard/integraciones/pagos',
    accion: 'Conectar cobros',
  },
  {
    id: 'compartir',
    titulo: 'Comparte tu catálogo',
    descripcion: 'Copia tu enlace de reservas y mándalo a tus clientes o ponlo en tu web.',
    href: '/dashboard/booking-link',
    accion: 'Ver mi enlace',
  },
];

/**
 * Si el paso ya está hecho.
 *
 * `compartir` no se puede saber mirando datos —no queda rastro de que alguien
 * copió un enlace—, así que solo se da por hecho si el anfitrión lo salta.
 */
export function pasoHecho(id: string, avance: AvanceDeOnboarding, empresaCompleta: boolean): boolean {
  switch (id) {
    case 'empresa':
      return empresaCompleta;
    case 'sede':
      return avance.sedes > 0;
    case 'experiencia':
      return avance.experiencias > 0;
    case 'horario':
      return avance.horarios > 0;
    case 'publicacion':
      return avance.publicaciones > 0;
    case 'cobros':
      return avance.cobros;
    default:
      return false;
  }
}

export interface PasoDelTour {
  /** El enlace del menú que se resalta; sin él, el globo sale centrado. */
  href?: string;
  titulo: string;
  descripcion: string;
}

export const PASOS_DEL_TOUR: PasoDelTour[] = [
  {
    titulo: 'Bienvenido a Tenemos Filo',
    descripcion:
      'Te mostramos en un minuto dónde está cada cosa. Después, una lista de primeros pasos te lleva de la mano hasta tu primera reserva.',
  },
  {
    href: '/dashboard/company',
    titulo: 'Mi Empresa',
    descripcion: 'Los datos de tu negocio: nombre, logo, contacto y documentos. Es lo primero que conviene completar.',
  },
  {
    href: '/dashboard/locations',
    titulo: 'Mis Sedes',
    descripcion: 'Los lugares donde recibes a tus clientes. Una experiencia puede ofrecerse en varias.',
  },
  {
    href: '/dashboard/experiences',
    titulo: 'Mis Experiencias',
    descripcion: 'Lo que vendes: cada experiencia con su descripción, duración, fotos y precio base.',
  },
  {
    href: '/dashboard/availability',
    titulo: 'Disponibilidad',
    descripcion: 'Los días, las horas y los cupos en que se puede reservar. Sin horario no hay nada que reservar.',
  },
  {
    href: '/dashboard/publicaciones',
    titulo: 'Publicaciones',
    descripcion: 'Aquí pones una experiencia a la venta en una sede, con su precio, aforo y horario propios.',
  },
  {
    href: '/dashboard/reservations',
    titulo: 'Reservas',
    descripcion: 'Todo lo que reservan tus clientes y si ya pagaron. Desde aquí confirmas, cancelas o reagendas.',
  },
  {
    href: '/dashboard/booking-link',
    titulo: 'Catálogo digital',
    descripcion: 'Tu enlace de reservas para compartir con tus clientes o poner en tu web.',
  },
  {
    href: '/dashboard/integraciones/pagos',
    titulo: 'Pagos',
    descripcion: 'Conecta la pasarela con la que cobras para que las reservas se confirmen al pagar.',
  },
  {
    href: '/dashboard/crm',
    titulo: 'CRM',
    descripcion: 'Tus contactos y oportunidades. Quien reserva en tu catálogo queda aquí automáticamente.',
  },
  {
    href: '/dashboard/ayuda',
    titulo: '¿Dudas? Aquí estamos',
    descripcion: 'El centro de ayuda tiene guías paso a paso. Y en el dashboard encuentras «Primeros pasos» para seguir desde donde vas.',
  },
];
