// Reescrito sobre el API. Conserva las firmas de las funciones publicas
// para no tocar callers (CompanySetupForm, dashboard/availability,
// dashboard/experiences/create|edit, etc.).
import { api } from '@/lib/api/client';
import {
  AvailabilitySchedule,
  CreateAvailabilityScheduleData,
  UpdateAvailabilityScheduleData,
  WeeklySchedule,
} from '@/types';

interface ApiAvailability {
  id: string;
  name: string;
  description: string | null;
  locationId: string | null;
  isMain: boolean;
  isActive: boolean;
  weeklySchedule: WeeklySchedule;
  notes: string | null;
  blockedDates: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; name: string; slug: string | null; companyId: string };
}

function toSchedule(a: ApiAvailability): AvailabilitySchedule {
  return {
    _id: a.id,
    _type: 'availability',
    name: a.name,
    location: a.locationId ? { _ref: a.locationId, _type: 'reference' } : undefined,
    isMain: a.isMain,
    isActive: a.isActive,
    description: a.description ?? undefined,
    // Lo que llega puede traer `franjas` o, si es un horario de antes del
    // renombre, `timeSlots`. Se normaliza aquí para que el resto del front
    // tenga una sola forma que mirar.
    weeklySchedule: aFranjas(a.weeklySchedule),
    // Solo el día: la vigencia se piensa y se escribe en días, y la hora que
    // trae el ISO no significa nada aquí.
    validFrom: a.validFrom ? a.validFrom.slice(0, 10) : undefined,
    validUntil: a.validUntil ? a.validUntil.slice(0, 10) : null,
    notes: a.notes ?? undefined,
    blockedDates: (a.blockedDates ?? []).map((d) => ({ date: d })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * TR-35. La vigencia de un horario que se crea solo, sin que nadie la pida.
 *
 * Pasa cuando se crea una experiencia y se le genera un calendario por
 * defecto. Un año: suficiente para que nadie choque con el corte mientras
 * monta su catálogo, y poco para que no quede una agenda abierta por décadas
 * si se olvida de revisarla. El anfitrión la extiende cuando quiera.
 */
export function vigenciaPorDefecto(): { validFrom: string; validUntil: string } {
  const hoy = new Date();
  const enUnAno = new Date(hoy);
  enUnAno.setFullYear(enUnAno.getFullYear() + 1);
  return { validFrom: dia(hoy), validUntil: dia(enUnAno) };
}

export const createAvailabilitySchedule = async (
  data: CreateAvailabilityScheduleData,
): Promise<AvailabilitySchedule> => {
  const created = await api.post<ApiAvailability>('/availabilities', {
    name: data.name,
    description: data.description,
    location: data.location,
    experience: data.experience,
    isMain: data.isMain,
    isActive: data.isActive,
    weeklySchedule: data.weeklySchedule,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    notes: data.notes,
    // El API acepta tanto strings ISO como objetos { date }
    blockedDates: data.blockedDates,
  });
  return toSchedule(created);
};

export const getAvailabilityScheduleById = async (
  scheduleId: string,
): Promise<AvailabilitySchedule | null> => {
  try {
    const av = await api.get<ApiAvailability>(`/availabilities/${encodeURIComponent(scheduleId)}`);
    return toSchedule(av);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const getAvailabilitySchedulesByLocation = async (
  locationId: string,
): Promise<AvailabilitySchedule[]> => {
  const items = await api.get<ApiAvailability[]>('/availabilities', { locationId });
  return items.map(toSchedule);
};

export const getAvailabilitySchedulesByCompany = async (
  companyId: string,
): Promise<AvailabilitySchedule[]> => {
  const items = await api.get<ApiAvailability[]>('/availabilities', { companyId });
  return items.map(toSchedule);
};

/**
 * TR-21. La agenda propia del anfitrión: los horarios que no son de ninguna
 * sede ni de ninguna experiencia.
 *
 * Hace falta porque un cocinero que va a casa del cliente no tiene dónde
 * colgar su calendario, y sin esto su catálogo ofrecía las horas por defecto
 * —de ocho a ocho, todos los días—, que no son las suyas.
 */
export const getAgendaDelAnfitrion = async (): Promise<AvailabilitySchedule[]> => {
  const items = await api.get<ApiAvailability[]>('/availabilities', { soloPropias: true });
  return items.map(toSchedule);
};

export const getAvailabilitySchedulesByExperience = async (
  experienceId: string,
): Promise<AvailabilitySchedule[]> => {
  const items = await api.get<ApiAvailability[]>('/availabilities', { experienceId });
  return items.map(toSchedule);
};

export const updateAvailabilitySchedule = async (
  data: UpdateAvailabilityScheduleData,
): Promise<AvailabilitySchedule> => {
  const { _id, ...rest } = data;
  const updated = await api.patch<ApiAvailability>(
    `/availabilities/${encodeURIComponent(_id)}`,
    {
      name: rest.name,
      description: rest.description,
      isMain: rest.isMain,
      isActive: rest.isActive,
      weeklySchedule: rest.weeklySchedule,
      validFrom: rest.validFrom,
      validUntil: rest.validUntil,
      notes: rest.notes,
      blockedDates: rest.blockedDates,
    },
  );
  return toSchedule(updated);
};

export const deleteAvailabilitySchedule = async (scheduleId: string): Promise<void> => {
  await api.delete(`/availabilities/${encodeURIComponent(scheduleId)}`);
};

export const setPrimarySchedule = async (
  scheduleId: string,
  contextId: string,
  contextType: 'location' | 'experience' = 'location',
): Promise<void> => {
  await api.post(`/availabilities/${encodeURIComponent(scheduleId)}/set-primary`, {
    contextId,
    contextType,
  });
};

export const getPrimaryScheduleByLocation = async (
  locationId: string,
): Promise<AvailabilitySchedule | null> => {
  const items = await api.get<ApiAvailability[]>('/availabilities', {
    locationId,
    primaryOnly: true,
  });
  return items[0] ? toSchedule(items[0]) : null;
};

/** Normaliza un horario a `franjas`, venga como venga. */
function aFranjas(semana: WeeklySchedule): WeeklySchedule {
  const salida = {} as WeeklySchedule;
  for (const [dia, valor] of Object.entries(semana ?? {})) {
    const d = valor as { isActive?: boolean; franjas?: unknown[]; timeSlots?: unknown[] };
    salida[dia as keyof WeeklySchedule] = {
      isActive: d?.isActive ?? false,
      franjas: (d?.franjas ?? d?.timeSlots ?? []) as WeeklySchedule['monday']['franjas'],
    };
  }
  return salida;
}

export const generateDefaultSchedule = (): WeeklySchedule => ({
  monday: {
    isActive: true,
    franjas: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  tuesday: {
    isActive: true,
    franjas: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  wednesday: {
    isActive: true,
    franjas: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  thursday: {
    isActive: true,
    franjas: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  friday: {
    isActive: true,
    franjas: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  saturday: { isActive: false, franjas: [] },
  sunday: { isActive: false, franjas: [] },
});
