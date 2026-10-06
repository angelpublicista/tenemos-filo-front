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
  capacity: number;
  minCapacity: number;
  basePrice: number;
  cleanupTime: number;
  /** Horas. */
  minimumNotice: number;
}

type ConLasCondiciones = Pick<
  Experience,
  'capacity' | 'minCapacity' | 'basePrice' | 'cleanupTime' | 'minimumNotice'
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
    capacity: f?.capacity ?? experience.capacity ?? 0,
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
