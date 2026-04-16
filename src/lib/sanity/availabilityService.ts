import { sanityClient } from './sanityClient';
import { 
  AvailabilitySchedule, 
  CreateAvailabilityScheduleData, 
  UpdateAvailabilityScheduleData,
  WeeklySchedule
} from '@/types';

/**
 * Crea un nuevo calendario de disponibilidad para una sede o experiencia
 */
export const createAvailabilitySchedule = async (
  data: CreateAvailabilityScheduleData
): Promise<AvailabilitySchedule> => {
  try {
    const doc = {
      _type: 'availability' as const,
      name: data.name,
      isMain: data.isMain ?? false,
      isActive: data.isActive ?? true,
      description: data.description,
      weeklySchedule: data.weeklySchedule,
      bufferTime: data.bufferTime ?? 0,
      minimumNotice: data.minimumNotice ?? 24,
      notes: data.notes,
      blockedDates: data.blockedDates || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(data.location ? { location: { _ref: data.location, _type: 'reference' as const } } : {}),
      ...(data.experience ? { experience: { _ref: data.experience, _type: 'reference' as const } } : {}),
    };

    const result = await sanityClient.create(doc);
    return result as unknown as AvailabilitySchedule;
  } catch (error) {
    console.error('Error creating availability schedule:', error);
    throw new Error('Failed to create availability schedule');
  }
};

/**
 * Obtiene un calendario de disponibilidad por ID
 */
export const getAvailabilityScheduleById = async (
  scheduleId: string
): Promise<AvailabilitySchedule | null> => {
  try {
    const query = `*[_type == "availability" && _id == $scheduleId][0] {
      _id,
      _type,
      name,
      location,
      isMain,
      isActive,
      description,
      weeklySchedule,
      bufferTime,
      minimumNotice,
      notes,
      blockedDates,
      createdAt,
      updatedAt
    }`;
    const schedule = await sanityClient.fetch(query, { scheduleId });
    return schedule;
  } catch (error) {
    console.error('Error fetching availability schedule:', error);
    throw new Error('Failed to fetch availability schedule');
  }
};

/**
 * Obtiene todos los calendarios de disponibilidad de una sede
 */
export const getAvailabilitySchedulesByLocation = async (
  locationId: string
): Promise<AvailabilitySchedule[]> => {
  try {
    const query = `*[_type == "availability" && location._ref == $locationId] | order(isMain desc, createdAt desc) {
      _id,
      _type,
      name,
      location,
      isMain,
      isActive,
      description,
      weeklySchedule,
      bufferTime,
      minimumNotice,
      notes,
      blockedDates,
      createdAt,
      updatedAt
    }`;
    const schedules = await sanityClient.fetch(query, { locationId });
    return schedules;
  } catch (error) {
    console.error('Error fetching availability schedules by location:', error);
    throw new Error('Failed to fetch availability schedules');
  }
};

/**
 * Obtiene todos los calendarios de disponibilidad de una empresa
 */
export const getAvailabilitySchedulesByCompany = async (
  companyId: string
): Promise<AvailabilitySchedule[]> => {
  try {
    const query = `*[_type == "availability" && location->company._ref == $companyId] | order(isMain desc, createdAt desc) {
      _id,
      _type,
      name,
      location->{
        _id,
        name,
        slug
      },
      isMain,
      isActive,
      description,
      weeklySchedule,
      bufferTime,
      minimumNotice,
      notes,
      blockedDates,
      createdAt,
      updatedAt
    }`;
    const schedules = await sanityClient.fetch(query, { companyId });
    return schedules;
  } catch (error) {
    console.error('Error fetching availability schedules by company:', error);
    throw new Error('Failed to fetch availability schedules');
  }
};

/**
 * Obtiene todos los calendarios de disponibilidad de una experiencia
 */
export const getAvailabilitySchedulesByExperience = async (
  experienceId: string
): Promise<AvailabilitySchedule[]> => {
  try {
    const query = `*[_type == "availability" && experience._ref == $experienceId] | order(isMain desc, createdAt desc) {
      _id,
      _type,
      name,
      experience,
      location,
      isMain,
      isActive,
      description,
      weeklySchedule,
      bufferTime,
      minimumNotice,
      notes,
      blockedDates,
      createdAt,
      updatedAt
    }`;
    const schedules = await sanityClient.fetch(query, { experienceId });
    return schedules;
  } catch (error) {
    console.error('Error fetching availability schedules by experience:', error);
    throw new Error('Failed to fetch availability schedules');
  }
};

/**
 * Actualiza un calendario de disponibilidad
 */
export const updateAvailabilitySchedule = async (
  data: UpdateAvailabilityScheduleData
): Promise<AvailabilitySchedule> => {
  try {
    const { _id, ...updateData } = data;
    
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;
    if (updateData.isMain !== undefined) updates.isMain = updateData.isMain;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.bufferTime !== undefined) updates.bufferTime = updateData.bufferTime;
    if (updateData.minimumNotice !== undefined) updates.minimumNotice = updateData.minimumNotice;
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    if (updateData.weeklySchedule !== undefined) updates.weeklySchedule = updateData.weeklySchedule;
    if (updateData.blockedDates !== undefined) updates.blockedDates = updateData.blockedDates;

    const result = await sanityClient.patch(_id).set(updates).commit();
    return result as unknown as AvailabilitySchedule;
  } catch (error) {
    console.error('Error updating availability schedule:', error);
    throw new Error('Failed to update availability schedule');
  }
};

/**
 * Elimina un calendario de disponibilidad
 */
export const deleteAvailabilitySchedule = async (scheduleId: string): Promise<void> => {
  try {
    await sanityClient.delete(scheduleId);
  } catch (error) {
    console.error('Error deleting availability schedule:', error);
    throw new Error('Failed to delete availability schedule');
  }
};

/**
 * Establece un calendario como principal para una sede o experiencia
 * (desactiva los demás calendarios principales del mismo contexto)
 */
export const setPrimarySchedule = async (
  scheduleId: string,
  contextId: string,
  contextType: 'location' | 'experience' = 'location'
): Promise<void> => {
  try {
    const field = contextType === 'experience' ? 'experience._ref' : 'location._ref';
    const currentPrimaryQuery = `*[_type == "availability" && ${field} == $contextId && isMain == true]`;
    const currentPrimary = await sanityClient.fetch(currentPrimaryQuery, { contextId });

    if (currentPrimary && currentPrimary.length > 0) {
      const transaction = sanityClient.transaction();
      currentPrimary.forEach((schedule: AvailabilitySchedule) => {
        transaction.patch(schedule._id, { set: { isMain: false } });
      });
      await transaction.commit();
    }

    await sanityClient
      .patch(scheduleId)
      .set({ isMain: true, updatedAt: new Date().toISOString() })
      .commit();
  } catch (error) {
    console.error('Error setting primary schedule:', error);
    throw new Error('Failed to set primary schedule');
  }
};

/**
 * Obtiene el calendario principal activo de una sede
 */
export const getPrimaryScheduleByLocation = async (
  locationId: string
): Promise<AvailabilitySchedule | null> => {
  try {
    const query = `*[_type == "availability" && location._ref == $locationId && isMain == true && isActive == true][0] {
      _id,
      _type,
      name,
      location,
      isMain,
      isActive,
      description,
      weeklySchedule,
      bufferTime,
      minimumNotice,
      notes,
      blockedDates,
      createdAt,
      updatedAt
    }`;
    const schedule = await sanityClient.fetch(query, { locationId });
    return schedule;
  } catch (error) {
    console.error('Error fetching primary schedule:', error);
    throw new Error('Failed to fetch primary schedule');
  }
};

/**
 * Genera un calendario de disponibilidad por defecto con horario laboral estándar
 */
export const generateDefaultSchedule = (): WeeklySchedule => {
  return {
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
    saturday: {
      isActive: false,
      timeSlots: [],
    },
    sunday: {
      isActive: false,
      timeSlots: [],
    },
  };
};

