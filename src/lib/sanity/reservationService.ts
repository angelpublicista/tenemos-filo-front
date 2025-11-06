import { sanityClient } from './sanityClient';
import { Reservation, CreateReservationData, UpdateReservationData, ReservationSearchParams } from '@/types';

// Generar número de reserva único
const generateReservationNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RES-${timestamp}-${random}`;
};

// Crear una nueva reserva
export const createReservationInSanity = async (reservationData: CreateReservationData) => {
  try {
    const doc = {
      _type: 'reservation',
      reservationNumber: generateReservationNumber(),
      experience: {
        _ref: reservationData.experience,
        _type: 'reference',
      },
      company: {
        _ref: reservationData.company,
        _type: 'reference',
      },
      client: reservationData.client,
      reservationDate: reservationData.reservationDate,
      duration: reservationData.duration,
      participants: reservationData.participants,
      status: reservationData.status || 'pending',
      paymentStatus: reservationData.paymentStatus || 'pending',
      pricing: reservationData.pricing,
      paymentMethod: reservationData.paymentMethod,
      paymentDetails: reservationData.paymentDetails,
      location: reservationData.location ? {
        _ref: reservationData.location,
        _type: 'reference',
      } : undefined,
      isVirtual: reservationData.isVirtual || false,
      virtualDetails: reservationData.virtualDetails,
      specialRequirements: reservationData.specialRequirements,
      notes: reservationData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating reservation in Sanity:', error);
    throw new Error('Failed to create reservation in Sanity');
  }
};

// Obtener todas las reservas con filtros
export const getReservations = async (searchParams: ReservationSearchParams = {}): Promise<Reservation[]> => {
  try {
    const {
      query = '',
      filters = {},
      sortBy = 'reservationDate',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = searchParams;

    let groqQuery = `*[_type == "reservation"`;
    
    // Filtros
    if (query) {
      groqQuery += ` && (reservationNumber match "*${query}*" || client.name match "*${query}*" || client.email match "*${query}*")`;
    }
    
    if (filters.status) {
      groqQuery += ` && status == "${filters.status}"`;
    }
    
    if (filters.paymentStatus) {
      groqQuery += ` && paymentStatus == "${filters.paymentStatus}"`;
    }
    
    if (filters.dateFrom) {
      groqQuery += ` && reservationDate >= "${filters.dateFrom}"`;
    }
    
    if (filters.dateTo) {
      groqQuery += ` && reservationDate <= "${filters.dateTo}"`;
    }
    
    if (filters.experience) {
      groqQuery += ` && experience._ref == "${filters.experience}"`;
    }
    
    if (filters.isVirtual !== undefined) {
      groqQuery += ` && isVirtual == ${filters.isVirtual}`;
    }

    groqQuery += `]`;

    // Ordenamiento
    const sortField = sortBy === 'total' ? 'pricing.total' : sortBy;
    groqQuery += ` | order(${sortField} ${sortOrder})`;

    // Paginación
    const start = (page - 1) * limit;
    const end = start + limit;
    groqQuery += `[${start}...${end}]`;

    // Campos a obtener
    groqQuery += `{
      _id,
      _type,
      reservationNumber,
      experience->{
        _id,
        title,
        category,
        duration,
        capacity
      },
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      client,
      clientType,
      clientInfo,
      user->{
        _id,
        name,
        email,
        phone
      },
      source,
      reservationDate,
      duration,
      participants,
      status,
      paymentStatus,
      pricing,
      paymentMethod,
      paymentDetails,
      location->{
        _id,
        name,
        address
      },
      isVirtual,
      virtualDetails,
      specialRequirements,
      cancellation,
      rescheduling,
      rating,
      notes,
      createdAt,
      updatedAt
    }`;

    const reservations = await sanityClient.fetch(groqQuery);
    return reservations;
  } catch (error) {
    console.error('Error fetching reservations:', error);
    throw new Error('Failed to fetch reservations');
  }
};

// Obtener reservas por empresa
export const getReservationsByCompany = async (companyId: string): Promise<Reservation[]> => {
  try {
    const query = `*[_type == "reservation" && company._ref == $companyId] | order(reservationDate desc) {
      _id,
      _type,
      reservationNumber,
      experience->{
        _id,
        title,
        category,
        duration,
        capacity
      },
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      client,
      clientType,
      clientInfo,
      user->{
        _id,
        name,
        email,
        phone
      },
      source,
      reservationDate,
      duration,
      participants,
      status,
      paymentStatus,
      pricing,
      paymentMethod,
      paymentDetails,
      location->{
        _id,
        name,
        address
      },
      isVirtual,
      virtualDetails,
      specialRequirements,
      cancellation,
      rescheduling,
      rating,
      notes,
      createdAt,
      updatedAt
    }`;

    const reservations = await sanityClient.fetch(query, { companyId });
    return reservations;
  } catch (error) {
    console.error('Error fetching reservations by company:', error);
    throw new Error('Failed to fetch reservations by company');
  }
};

// Obtener reserva por ID
export const getReservationById = async (reservationId: string): Promise<Reservation | null> => {
  try {
    const query = `*[_type == "reservation" && _id == $reservationId][0] {
      _id,
      _type,
      reservationNumber,
      experience->{
        _id,
        title,
        category,
        duration,
        capacity,
        description
      },
      company->{
        _id,
        companyName,
        companyEmail,
        companyPhone
      },
      client,
      clientType,
      clientInfo,
      user->{
        _id,
        name,
        email,
        phone
      },
      source,
      reservationDate,
      duration,
      participants,
      status,
      paymentStatus,
      pricing,
      paymentMethod,
      paymentDetails,
      location->{
        _id,
        name,
        address
      },
      isVirtual,
      virtualDetails,
      specialRequirements,
      cancellation,
      rescheduling,
      rating,
      notes,
      createdAt,
      updatedAt
    }`;

    const reservation = await sanityClient.fetch(query, { reservationId });
    return reservation;
  } catch (error) {
    console.error('Error fetching reservation by ID:', error);
    throw new Error('Failed to fetch reservation by ID');
  }
};

// Actualizar reserva
export const updateReservationInSanity = async (reservationData: UpdateReservationData) => {
  try {
    const updateData: Record<string, unknown> = {
      client: reservationData.client,
      reservationDate: reservationData.reservationDate,
      duration: reservationData.duration,
      participants: reservationData.participants,
      status: reservationData.status,
      paymentStatus: reservationData.paymentStatus,
      pricing: reservationData.pricing,
      paymentMethod: reservationData.paymentMethod,
      paymentDetails: reservationData.paymentDetails,
      isVirtual: reservationData.isVirtual,
      virtualDetails: reservationData.virtualDetails,
      specialRequirements: reservationData.specialRequirements,
      notes: reservationData.notes,
      updatedAt: new Date().toISOString(),
    };

    // Actualizar ubicación si se proporcionó
    if (reservationData.location) {
      updateData.location = {
        _ref: reservationData.location,
        _type: 'reference',
      };
    }

    const result = await sanityClient
      .patch(reservationData._id)
      .set(updateData)
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating reservation in Sanity:', error);
    throw new Error('Failed to update reservation in Sanity');
  }
};

// Cambiar estado de reserva
export const updateReservationStatus = async (reservationId: string, status: Reservation['status']) => {
  try {
    const result = await sanityClient
      .patch(reservationId)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating reservation status:', error);
    throw new Error('Failed to update reservation status');
  }
};

// Cambiar estado de pago
export const updateReservationPaymentStatus = async (reservationId: string, paymentStatus: Reservation['paymentStatus']) => {
  try {
    const result = await sanityClient
      .patch(reservationId)
      .set({
        paymentStatus,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating reservation payment status:', error);
    throw new Error('Failed to update reservation payment status');
  }
};

// Cancelar reserva
export const cancelReservation = async (
  reservationId: string, 
  cancelledBy: 'client' | 'host' | 'system',
  reason: string,
  refundAmount?: number
) => {
  try {
    const result = await sanityClient
      .patch(reservationId)
      .set({
        status: 'cancelled',
        cancellation: {
          cancelledAt: new Date().toISOString(),
          cancelledBy,
          cancellationReason: reason,
          refundAmount: refundAmount || 0,
          refundStatus: refundAmount ? 'pending' : undefined,
        },
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    throw new Error('Failed to cancel reservation');
  }
};

// Reagendar reserva
export const rescheduleReservation = async (
  reservationId: string,
  newDate: string,
  reason: string,
  requestedBy: 'client' | 'host'
) => {
  try {
    // Primero obtener la fecha original
    const reservation = await getReservationById(reservationId);
    
    const result = await sanityClient
      .patch(reservationId)
      .set({
        status: 'rescheduled',
        reservationDate: newDate,
        rescheduling: {
          originalDate: reservation?.reservationDate,
          newDate,
          reason,
          requestedBy,
        },
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error rescheduling reservation:', error);
    throw new Error('Failed to reschedule reservation');
  }
};

// Eliminar reserva
export const deleteReservationInSanity = async (reservationId: string) => {
  try {
    const result = await sanityClient.delete(reservationId);
    return result;
  } catch (error) {
    console.error('Error deleting reservation:', error);
    throw new Error('Failed to delete reservation');
  }
};

// Obtener estadísticas de reservas por empresa
export const getReservationStatsByCompany = async (companyId: string) => {
  try {
    const query = `*[_type == "reservation" && company._ref == $companyId] {
      status,
      paymentStatus,
      pricing,
      participants,
      reservationDate,
      createdAt
    }`;

    const reservations = await sanityClient.fetch(query, { companyId });
    
    const stats = {
      total: reservations.length,
      pending: reservations.filter((r: Record<string, unknown>) => r.status === 'pending').length,
      confirmed: reservations.filter((r: Record<string, unknown>) => r.status === 'confirmed').length,
      inProgress: reservations.filter((r: Record<string, unknown>) => r.status === 'in_progress').length,
      completed: reservations.filter((r: Record<string, unknown>) => r.status === 'completed').length,
      cancelled: reservations.filter((r: Record<string, unknown>) => r.status === 'cancelled').length,
      noShow: reservations.filter((r: Record<string, unknown>) => r.status === 'no_show').length,
      rescheduled: reservations.filter((r: Record<string, unknown>) => r.status === 'rescheduled').length,
      totalRevenue: reservations.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.pricing as Record<string, unknown>)?.total as number) || 0), 0),
      totalParticipants: reservations.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.participants as number) || 0), 0),
      averageParticipants: reservations.length > 0 
        ? reservations.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.participants as number) || 0), 0) / reservations.length 
        : 0,
      pendingPayments: reservations.filter((r: Record<string, unknown>) => r.paymentStatus === 'pending').length,
      paidReservations: reservations.filter((r: Record<string, unknown>) => r.paymentStatus === 'paid').length,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching reservation stats by company:', error);
    throw new Error('Failed to fetch reservation stats by company');
  }
};

/**
 * Crear una reserva manual (para anfitriones)
 */
export interface CreateManualReservationData {
  experience: string; // Experience ID
  location: string; // Location ID
  reservationDate: string; // ISO date string
  participants: number;
  specialRequests?: string;
  clientType: 'guest' | 'registered';
  source?: string; // Origen de la reserva
  guestInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  registeredUserId?: string; // Para clientes registrados (futuro)
  selectedAddons?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export const createReservationManually = async (data: CreateManualReservationData) => {
  try {
    console.log('🔄 Iniciando creación de reserva manual...');
    console.log('📋 Datos recibidos:', data);

    // Obtener información de la experiencia para calcular precios
    const experienceQuery = `*[_type == "experience" && _id == $experienceId][0]{
      _id,
      title,
      basePrice,
      currency,
      duration,
      company
    }`;
    const experience = await sanityClient.fetch(experienceQuery, { experienceId: data.experience });

    console.log('🎯 Experiencia encontrada:', experience);

    if (!experience) {
      throw new Error('Experiencia no encontrada');
    }

    if (!experience.company || !experience.company._ref) {
      throw new Error('La experiencia no tiene una empresa asociada');
    }

    const totalPrice = experience.basePrice * data.participants;

    const reservationDoc = {
      _type: 'reservation',
      reservationNumber: generateReservationNumber(),
      experience: {
        _ref: data.experience,
        _type: 'reference',
      },
      company: {
        _ref: experience.company._ref,
        _type: 'reference',
      },
      location: {
        _ref: data.location,
        _type: 'reference',
      },
      clientType: data.clientType,
      source: data.source || 'manual',
      user: data.registeredUserId ? {
        _ref: data.registeredUserId,
        _type: 'reference',
      } : undefined,
      clientInfo: data.guestInfo ? {
        name: data.guestInfo.name,
        email: data.guestInfo.email,
        phone: data.guestInfo.phone,
      } : undefined,
      reservationDate: data.reservationDate,
      duration: experience.duration,
      participants: data.participants,
      status: 'confirmed', // Reservas manuales se confirman automáticamente
      paymentStatus: 'pending',
      pricing: {
        basePrice: experience.basePrice,
        subtotal: totalPrice,
        addons: data.selectedAddons || [],
        addonsTotal: data.selectedAddons?.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0) || 0,
        discount: 0,
        tax: 0,
        commission: 0,
        total: totalPrice + (data.selectedAddons?.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0) || 0),
        hostEarnings: totalPrice + (data.selectedAddons?.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0) || 0),
      },
      specialRequirements: data.specialRequests,
      notes: `Reserva creada manualmente. Cliente tipo: ${data.clientType === 'guest' ? 'Invitado' : 'Registrado'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('💾 Documento a guardar en Sanity:', reservationDoc);

    const result = await sanityClient.create(reservationDoc);
    
    console.log('✅ Reserva guardada exitosamente:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error al crear reserva manual:', error);
    
    // Proporcionar mensaje de error más específico
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error al crear la reserva manual. Por favor verifica los datos e intenta nuevamente.');
  }
};