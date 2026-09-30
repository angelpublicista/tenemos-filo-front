import { api } from '@/lib/api/client';

/**
 * CRM-12/13. Las oportunidades que miran a una fecha.
 *
 * No son reservas y no apartan nada: el cliente todavía no ha dicho que sí.
 * Se traen aparte justamente por eso — la pantalla tiene que poder
 * distinguirlas de lo que sí ocupa el espacio.
 */
export interface OportunidadEnAgenda {
  id: string;
  nombre: string;
  etapa: string;
  tipoDeExperiencia: string | null;
  tipoDeComprador: string | null;
  contacto: string | null;
  fechaTentativa: string;
  hora: string | null;
  personas: number | null;
  valor: number;
  /** Cuándo se pidió. Es lo que permite saber quién llegó primero. */
  solicitadaEl: string;
  versionDeCotizacion: number;
  cotizacionEnviada: boolean;
}

export const getAgenda = (desde: Date, hasta: Date) =>
  api.get<OportunidadEnAgenda[]>('/opportunities/agenda', {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
  });

/** Las de un día concreto, en el orden en que se pidieron. */
export function oportunidadesDelDia(
  todas: OportunidadEnAgenda[],
  dia: Date,
): OportunidadEnAgenda[] {
  const clave = dia.toDateString();
  return todas.filter((o) => new Date(o.fechaTentativa).toDateString() === clave);
}
