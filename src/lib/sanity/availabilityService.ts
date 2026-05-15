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
  bufferTime: number;
  minimumNotice: number;
  notes: string | null;
  blockedDates: string[];
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
    weeklySchedule: a.weeklySchedule,
    bufferTime: a.bufferTime,
    minimumNotice: a.minimumNotice,
    notes: a.notes ?? undefined,
    blockedDates: (a.blockedDates ?? []).map((d) => ({ date: d })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
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
    bufferTime: data.bufferTime,
    minimumNotice: data.minimumNotice,
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
      bufferTime: rest.bufferTime,
      minimumNotice: rest.minimumNotice,
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

export const generateDefaultSchedule = (): WeeklySchedule => ({
  monday: {
    isActive: true,
    timeSlots: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  tuesday: {
    isActive: true,
    timeSlots: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  wednesday: {
    isActive: true,
    timeSlots: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  thursday: {
    isActive: true,
    timeSlots: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  friday: {
    isActive: true,
    timeSlots: [
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  },
  saturday: { isActive: false, timeSlots: [] },
  sunday: { isActive: false, timeSlots: [] },
});
