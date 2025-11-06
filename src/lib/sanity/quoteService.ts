import { sanityClient } from './sanityClient';
import { Experience } from '@/types';

interface SearchParams {
  companyId: string;
  date: string;
  time: string;
  guests: number;
  location?: string;
}

export interface QuoteData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventDate: string;
  eventTime: string;
  guests: number;
  location?: string;
  experiences: string[]; // Array de IDs de experiencias
  notes?: string;
  companyId: string;
  hostId: string;
}

// Buscar experiencias disponibles para cotización
export const searchExperiencesForQuote = async (params: SearchParams): Promise<Experience[]> => {
  try {
    const { companyId, guests, location, date } = params;

    // Query GROQ para buscar experiencias
    let query = `
      *[_type == "experience" 
        && company._ref == $companyId
        && status == "active"
        && capacity >= $guests
        && (minCapacity == null || minCapacity <= $guests)
    `;

    // Si se especifica ubicación, filtrar por ciudad
    if (location) {
      query += ` && (presentialCity match $location || location->city match $location)`;
    }

    query += `] {
      _id,
      title,
      description,
      category,
      categories,
      duration,
      capacity,
      minCapacity,
      basePrice,
      currency,
      experienceType,
      presentialCity,
      presentialAddress,
      presentialLocation,
      featuredImage,
      includes,
      requirements,
      addons,
      "companyName": company->companyName,
      "locationName": location->name,
      "availabilitySchedule": availabilitySchedule->{
        _id,
        weeklySchedule
      },
      status
    }`;

    const queryParams: Record<string, string | number> = {
      companyId,
      guests,
    };

    if (location) {
      queryParams.location = `*${location}*`;
    }

    let experiences = await sanityClient.fetch(query, queryParams);
    
    // Filtrar por disponibilidad del día si se especificó una fecha
    if (date && experiences) {
      const selectedDate = new Date(date + 'T12:00:00'); // Agregar hora para evitar problemas de zona horaria
      const dayOfWeek = getDayOfWeekFromDate(selectedDate);
      
      experiences = experiences.filter((exp: Experience & { availabilitySchedule?: { weeklySchedule: Record<string, { isActive: boolean }> } }) => {
        // Si no tiene availabilitySchedule configurado, no la incluimos
        if (!exp.availabilitySchedule?.weeklySchedule) {
          return false;
        }
        
        // Verificar si el día está activo en el horario semanal
        const daySchedule = exp.availabilitySchedule.weeklySchedule[dayOfWeek];
        return daySchedule?.isActive === true;
      });
    }
    
    return experiences || [];
  } catch (error) {
    console.error('Error searching experiences for quote:', error);
    throw new Error('Failed to search experiences');
  }
};

// Helper para convertir fecha a día de la semana
function getDayOfWeekFromDate(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

// Crear cotización
export const createQuote = async (quoteData: QuoteData) => {
  try {
    const doc = {
      _type: 'quote',
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      customerPhone: quoteData.customerPhone || '',
      eventDate: quoteData.eventDate,
      eventTime: quoteData.eventTime,
      guests: quoteData.guests,
      location: quoteData.location || '',
      experiences: quoteData.experiences.map(expId => ({
        _type: 'reference',
        _ref: expId,
      })),
      notes: quoteData.notes || '',
      company: {
        _type: 'reference',
        _ref: quoteData.companyId,
      },
      host: {
        _type: 'reference',
        _ref: quoteData.hostId,
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(doc);
    return result;
  } catch (error) {
    console.error('Error creating quote:', error);
    throw new Error('Failed to create quote');
  }
};

// Obtener cotizaciones por empresa
export const getQuotesByCompany = async (companyId: string) => {
  try {
    const query = `
      *[_type == "quote" && company._ref == $companyId] | order(createdAt desc) {
        _id,
        customerName,
        customerEmail,
        customerPhone,
        eventDate,
        eventTime,
        guests,
        location,
        experiences[]->{
          _id,
          title,
          basePrice,
          currency
        },
        notes,
        status,
        createdAt,
        updatedAt,
        "companyName": company->companyName,
        "hostName": host->name
      }
    `;

    const quotes = await sanityClient.fetch(query, { companyId });
    return quotes || [];
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw new Error('Failed to fetch quotes');
  }
};

// Actualizar estado de cotización
export const updateQuoteStatus = async (quoteId: string, status: string) => {
  try {
    const result = await sanityClient
      .patch(quoteId)
      .set({ 
        status,
        updatedAt: new Date().toISOString()
      })
      .commit();

    return result;
  } catch (error) {
    console.error('Error updating quote status:', error);
    throw new Error('Failed to update quote status');
  }
};



