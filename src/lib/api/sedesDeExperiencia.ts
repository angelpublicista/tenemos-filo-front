// Las condiciones con que una experiencia se ofrece en cada sede.
//
// Una experiencia es una pieza con la que se arma el catálogo: la misma puede
// estar en el local del centro como abierta —cupos que se compran sueltos— y
// en la finca como privada, con otro aforo, otro precio y otra anticipación.
import { api } from './client';
import type { SedeDeExperiencia } from '@/types';

/**
 * Lo que una sede cambia respecto a la experiencia.
 *
 * `null` en un campo es «aquí vale lo que diga la experiencia», y es la
 * respuesta más común: lo normal es que una sede cambie una cosa.
 */
export interface CondicionesDeSede {
  kind?: 'ABIERTA' | 'PRIVADA' | null;
  capacity?: number | null;
  minCapacity?: number | null;
  basePrice?: number | null;
  prepTime?: number | null;
  cleanupTime?: number | null;
  minimumNotice?: number | null;
  isPublished?: boolean;
  notes?: string | null;
}

export async function getSedesDeExperiencia(experienceId: string): Promise<SedeDeExperiencia[]> {
  const r = await api.get<{ data: SedeDeExperiencia[] }>(`/experiences/${experienceId}/sedes`);
  return r.data ?? [];
}

export async function fijarCondicionesDeSede(
  experienceId: string,
  locationId: string,
  condiciones: CondicionesDeSede,
): Promise<SedeDeExperiencia[]> {
  const r = await api.put<{ data: SedeDeExperiencia[] }>(
    `/experiences/${experienceId}/sedes/${locationId}`,
    condiciones,
  );
  return r.data ?? [];
}

/** Devuelve la sede a las condiciones de la experiencia. */
export async function soltarCondicionesDeSede(
  experienceId: string,
  locationId: string,
): Promise<SedeDeExperiencia[]> {
  const r = await api.delete<{ data: SedeDeExperiencia[] }>(
    `/experiences/${experienceId}/sedes/${locationId}`,
  );
  return r.data ?? [];
}
