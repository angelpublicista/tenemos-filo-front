import type { AvailabilitySchedule, Experience, LocationListing } from '@/types';

/**
 * Las condiciones que rigen para una experiencia en una sede.
 *
 * Una experiencia es una pieza con la que se arma el catálogo: la misma puede
 * estar en el local del centro como abierta —cupos que se compran sueltos— y
 * en la finca como privada, con otro aforo, otro precio y otra anticipación.
 *
 * Campo a campo: lo que diga la sede si lo dice, y si no lo que diga la
 * experiencia. Esta es la misma regla que aplica el API; vive aquí para que
 * las dos pantallas que la necesitan —el motor de reservas y la ficha de la
 * experiencia— no la escriban cada una a su manera.
 */
export interface Condiciones {
  kind: 'ABIERTA' | 'PRIVADA' | null;
  /**
   * El mínimo para que la experiencia se haga. NO es inventario: los cupos
   * que se venden son de la franja, y este es el tamaño de grupo por debajo
   * del cual la cena no sale.
   */
  minCapacity: number;
  basePrice: number;
  cleanupTime: number;
  /** Horas. */
  minimumNotice: number;
}

type ConLasCondiciones = Pick<
  Experience,
  'minCapacity' | 'basePrice' | 'cleanupTime' | 'minimumNotice'
> & { locationListings?: LocationListing[] };

export function condicionesDeSede(
  experience: ConLasCondiciones,
  locationId?: string | null,
): Condiciones {
  const f = locationId
    ? experience.locationListings?.find((x) => x.locationId === locationId)
    : undefined;

  return {
    kind: f?.kind ?? null,
    minCapacity: f?.minCapacity ?? experience.minCapacity ?? 1,
    basePrice: f?.basePrice ?? experience.basePrice ?? 0,
    cleanupTime: f?.cleanupTime ?? experience.cleanupTime ?? 0,
    minimumNotice: f?.minimumNotice ?? experience.minimumNotice ?? 0,
  };
}

/**
 * Los horarios que aplican en una sede, con la misma cascada que el API.
 *
 * Los de esa sede mandan; si no hay, los que no son de ninguna sede —valen
 * para todas—; y si tampoco, todos, que es como venía funcionando. Sin esto,
 * los sábados que solo abre la finca aparecían también en el local del centro.
 */
export function horariosDeSede(
  schedules: AvailabilitySchedule[],
  locationId?: string | null,
): AvailabilitySchedule[] {
  if (!locationId) return schedules;
  const deEsaSede = schedules.filter((s) => s.location?._ref === locationId);
  if (deEsaSede.length > 0) return deEsaSede;
  const sinSede = schedules.filter((s) => !s.location?._ref);
  return sinSede.length > 0 ? sinSede : schedules;
}

/**
 * El precio con que se anuncia una experiencia en el catálogo.
 *
 * Con sedes a precios distintos no hay «el precio»: se anuncia el más bajo y
 * se avisa de que depende de la sede. Decir uno a secas sería prometer en la
 * tarjeta un precio que al elegir la finca no se cumple.
 */
export function precioDesde(experience: ConLasCondiciones): {
  precio: number | null;
  varía: boolean;
} {
  const base = experience.basePrice ?? null;
  const propios = (experience.locationListings ?? [])
    .filter((f) => f.isPublished !== false && f.basePrice != null)
    .map((f) => f.basePrice as number);

  if (propios.length === 0) return { precio: base, varía: false };

  const todos = base == null ? propios : [base, ...propios];
  const min = Math.min(...todos);
  return { precio: min, varía: Math.max(...todos) !== min };
}

const DIAS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const enMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Las franjas de un día, con el nombre nuevo o con el viejo. */
function franjasDelDia(schedule: AvailabilitySchedule, date: Date) {
  const dia = schedule.weeklySchedule?.[DIAS[date.getDay()]!];
  if (!dia?.isActive) return [];
  return (dia.franjas ?? dia.timeSlots ?? []) as Array<{
    startTime: string;
    endTime: string;
    cupos?: number | null;
  }>;
}

/**
 * Cuánta gente cabe a esa hora.
 *
 * Los cupos son de la FRANJA: el almuerzo y la cena de un sábado son dos
 * inventarios distintos, así que «cuántos caben» no se puede saber hasta que
 * se elige la hora. Si dos horarios cubren la misma, manda el menor: es el
 * único que no promete sitio que el otro no tiene.
 *
 * `null` cuando ninguna franja de esa hora declara cupos: entonces no hay
 * máximo que imponer.
 */
export function cuposDeLaHora(
  schedules: AvailabilitySchedule[],
  date: Date,
  time: string,
): number | null {
  const minuto = enMinutos(time);
  let menor: number | null = null;
  for (const s of schedules) {
    for (const f of franjasDelDia(s, date)) {
      if (f.cupos === null || f.cupos === undefined) continue;
      if (minuto < enMinutos(f.startTime) || minuto >= enMinutos(f.endTime)) continue;
      if (menor === null || f.cupos < menor) menor = f.cupos;
    }
  }
  return menor;
}

/**
 * El grupo más grande que cabe en alguna franja de ese día.
 *
 * Sirve mientras no se ha elegido hora: es el tope que tiene sentido ofrecer
 * en el contador de personas, porque alguna franja lo admite.
 */
export function cuposDelDia(schedules: AvailabilitySchedule[], date: Date): number | null {
  let mayor: number | null = null;
  for (const s of schedules) {
    for (const f of franjasDelDia(s, date)) {
      if (f.cupos === null || f.cupos === undefined) continue;
      if (mayor === null || f.cupos > mayor) mayor = f.cupos;
    }
  }
  return mayor;
}

/**
 * El grupo más grande que cabe en alguna franja de estos horarios.
 *
 * «Cuánta gente cabe» ya no es un número de la experiencia: es el mayor de sus
 * franjas. Sirve para las fichas del catálogo, que tienen que decir un máximo
 * antes de que nadie haya elegido hora.
 */
export function cuposMaximos(schedules: AvailabilitySchedule[]): number | null {
  let mayor: number | null = null;
  const hoy = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + i);
    const delDia = cuposDelDia(schedules, d);
    if (delDia !== null && (mayor === null || delDia > mayor)) mayor = delDia;
  }
  return mayor;
}
