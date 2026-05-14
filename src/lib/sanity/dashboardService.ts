// Reescrito sobre el API. Mismas firmas para no romper callers.
import { api } from '@/lib/api/client';

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

export const getDashboardStats = async (companyId: string): Promise<DashboardStats> => {
  return api.get<DashboardStats>('/dashboard/stats', { companyId });
};

interface ApiActivity {
  id: string;
  type: 'experience' | 'reservation' | 'payment';
  title: string;
  description: string;
  timestamp: string;
}

export const getRecentActivities = async (
  companyId: string,
  limit: number = 5,
): Promise<RecentActivity[]> => {
  const items = await api.get<ApiActivity[]>('/dashboard/recent-activities', {
    companyId,
    limit,
  });
  return items.map((a) => ({ ...a, time: formatRelativeTime(a.timestamp) }));
};

// Formatear tiempo relativo (queda en el front por ser pura UI)
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace menos de 1 minuto';
  if (diffInSeconds < 3600) {
    const m = Math.floor(diffInSeconds / 60);
    return `Hace ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffInSeconds < 86400) {
    const h = Math.floor(diffInSeconds / 3600);
    return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  }
  if (diffInSeconds < 604800) {
    const d = Math.floor(diffInSeconds / 86400);
    return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  if (diffInSeconds < 2592000) {
    const w = Math.floor(diffInSeconds / 604800);
    return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  }
  const months = Math.floor(diffInSeconds / 2592000);
  return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}
