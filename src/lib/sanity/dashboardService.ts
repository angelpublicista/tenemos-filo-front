import { sanityClient } from './sanityClient';

export interface DashboardStats {
  activeExperiences: number;
  pendingReservations: number;
  monthlyRevenue: number;
  growth: number;
}

export interface RecentActivity {
  id: string;
  type: 'experience' | 'reservation' | 'payment';
  title: string;
  description: string;
  time: string;
  timestamp: string;
}

// Interfaces para los datos de Sanity
interface RevenueItem {
  total?: number;
}

interface ExperienceData {
  _id: string;
  title: string;
  _createdAt: string;
}

interface ReservationData {
  _id: string;
  reservationNumber: string;
  client?: {
    name?: string;
  };
  participants?: number;
  _createdAt: string;
}

interface PaymentData {
  _id: string;
  reservationNumber: string;
  pricing?: {
    total?: number;
  };
  _updatedAt: string;
}

// Obtener estadísticas del dashboard por compañía
export const getDashboardStats = async (companyId: string): Promise<DashboardStats> => {
  try {
    // Contar experiencias activas
    const activeExperiencesQuery = `count(*[
      _type == "experience" &&
      !(_id in path("drafts.**")) &&
      company._ref == $companyId &&
      status == "active"
    ])`;
    const activeExperiences = await sanityClient.fetch(activeExperiencesQuery, { companyId });

    // Contar reservas pendientes
    const pendingReservationsQuery = `count(*[_type == "reservation" && company._ref == $companyId && status == "pending"])`;
    const pendingReservations = await sanityClient.fetch(pendingReservationsQuery, { companyId });

    // Calcular ingresos del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const monthlyRevenueQuery = `
      *[_type == "reservation" && 
        company._ref == $companyId && 
        reservationDate >= $startOfMonth && 
        reservationDate <= $endOfMonth &&
        (status == "confirmed" || status == "completed")
      ] {
        "total": pricing.total
      }
    `;
    
    const monthlyRevenueData = await sanityClient.fetch<RevenueItem[]>(monthlyRevenueQuery, { 
      companyId, 
      startOfMonth, 
      endOfMonth 
    });
    
    const monthlyRevenue = monthlyRevenueData.reduce((sum: number, item: RevenueItem) => {
      return sum + (item.total || 0);
    }, 0);

    // Calcular ingresos del mes anterior para el crecimiento
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    
    const lastMonthRevenueQuery = `
      *[_type == "reservation" && 
        company._ref == $companyId && 
        reservationDate >= $startOfLastMonth && 
        reservationDate <= $endOfLastMonth &&
        (status == "confirmed" || status == "completed")
      ] {
        "total": pricing.total
      }
    `;
    
    const lastMonthRevenueData = await sanityClient.fetch<RevenueItem[]>(lastMonthRevenueQuery, { 
      companyId, 
      startOfLastMonth, 
      endOfLastMonth 
    });
    
    const lastMonthRevenue = lastMonthRevenueData.reduce((sum: number, item: RevenueItem) => {
      return sum + (item.total || 0);
    }, 0);

    // Calcular porcentaje de crecimiento
    let growth = 0;
    if (lastMonthRevenue > 0) {
      growth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (monthlyRevenue > 0) {
      growth = 100; // Si no había ingresos el mes pasado y ahora sí, es 100% de crecimiento
    }

    return {
      activeExperiences,
      pendingReservations,
      monthlyRevenue,
      growth: Math.round(growth * 10) / 10, // Redondear a 1 decimal
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
};

// Obtener actividades recientes
export const getRecentActivities = async (companyId: string, limit: number = 5): Promise<RecentActivity[]> => {
  try {
    const activities: RecentActivity[] = [];

    // Obtener experiencias recientes
    const experiencesQuery = `
      *[_type == "experience" && company._ref == $companyId] | order(_createdAt desc) [0...3] {
        _id,
        title,
        _createdAt
      }
    `;
    const experiences = await sanityClient.fetch<ExperienceData[]>(experiencesQuery, { companyId });
    
    experiences.forEach((exp: ExperienceData) => {
      activities.push({
        id: exp._id,
        type: 'experience',
        title: 'Nueva experiencia creada',
        description: exp.title,
        timestamp: exp._createdAt,
        time: formatRelativeTime(exp._createdAt),
      });
    });

    // Obtener reservas recientes
    const reservationsQuery = `
      *[_type == "reservation" && company._ref == $companyId] | order(_createdAt desc) [0...3] {
        _id,
        reservationNumber,
        client,
        participants,
        _createdAt
      }
    `;
    const reservations = await sanityClient.fetch<ReservationData[]>(reservationsQuery, { companyId });
    
    reservations.forEach((res: ReservationData) => {
      activities.push({
        id: res._id,
        type: 'reservation',
        title: 'Nueva reserva recibida',
        description: `${res.client?.name || 'Cliente'} reservó para ${res.participants || 0} personas`,
        timestamp: res._createdAt,
        time: formatRelativeTime(res._createdAt),
      });
    });

    // Obtener pagos procesados recientes
    const paymentsQuery = `
      *[_type == "reservation" && 
        company._ref == $companyId && 
        paymentStatus == "paid"
      ] | order(_updatedAt desc) [0...3] {
        _id,
        reservationNumber,
        pricing,
        _updatedAt
      }
    `;
    const payments = await sanityClient.fetch<PaymentData[]>(paymentsQuery, { companyId });
    
    payments.forEach((payment: PaymentData) => {
      activities.push({
        id: payment._id,
        type: 'payment',
        title: 'Pago procesado',
        description: `Reserva #${payment.reservationNumber} - $${payment.pricing?.total?.toFixed(2) || '0.00'}`,
        timestamp: payment._updatedAt,
        time: formatRelativeTime(payment._updatedAt),
      });
    });

    // Ordenar por timestamp y limitar
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    throw new Error('Failed to fetch recent activities');
  }
};

// Formatear tiempo relativo
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Hace menos de 1 minuto';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
}

