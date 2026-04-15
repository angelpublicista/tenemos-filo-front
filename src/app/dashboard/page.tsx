"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CompanySetupAlert from "@/components/CompanySetupAlert";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useCompanySetup } from "@/hooks/useCompanySetup";
import { 
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineDollar,
  AiOutlineRise,
  AiOutlineFire
} from 'react-icons/ai';
import { BiBuildingHouse } from 'react-icons/bi';
import { useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivities, DashboardStats, RecentActivity } from '@/lib/sanity/dashboardService';
import { SkeletonStatCard, SkeletonActivityItem } from '@/components/Skeleton';

export default function Dashboard() {
  const { user, sanityUser } = useAuth();
  const { isSetupCompleted } = useCompanySetup();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!sanityUser?.companyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const [statsData, activitiesData] = await Promise.all([
          getDashboardStats(sanityUser.companyId),
          getRecentActivities(sanityUser.companyId, 5)
        ]);

        setStats(statsData);
        setRecentActivities(activitiesData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [sanityUser?.companyId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'experience':
        return AiOutlineCalendar;
      case 'reservation':
        return AiOutlineTeam;
      case 'payment':
        return AiOutlineDollar;
      default:
        return AiOutlineCalendar;
    }
  };

  const statsConfig: Array<{
    title: string;
    key: keyof DashboardStats;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    format?: (value: number) => string;
  }> = [
    {
      title: 'Experiencias Activas',
      key: 'activeExperiences',
      icon: AiOutlineCalendar,
      color: 'bg-[#F26726]' // Naranja principal
    },
    {
      title: 'Reservas Pendientes',
      key: 'pendingReservations',
      icon: AiOutlineTeam,
      color: 'bg-[#19A3A2]' // Teal/Cyan
    },
    {
      title: 'Ingresos del Mes',
      key: 'monthlyRevenue',
      icon: AiOutlineDollar,
      color: 'bg-[#EBD52C]', // Amarillo
      format: (value: number) => `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    },
    {
      title: 'Crecimiento',
      key: 'growth',
      icon: AiOutlineRise,
      color: 'bg-[#E23694]', // Rosa/Magenta
      format: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
    }
  ];

  const quickActions = [
    {
      title: 'Crear Experiencia',
      description: 'Organiza una nueva experiencia',
      icon: BiBuildingHouse,
      href: '/dashboard/experiences/create',
      color: 'bg-[#F26726] hover:bg-[#F26726]/80' // Naranja principal
    },
    {
      title: 'Ver Reservas',
      description: 'Gestiona las reservas pendientes',
      icon: AiOutlineTeam,
      href: '/reservations',
      color: 'bg-[#19A3A2] hover:bg-[#19A3A2]/80' // Teal/Cyan
    },
    {
      title: 'Mis Experiencias',
      description: 'Revisa tus experiencias activas',
      icon: AiOutlineCalendar,
      href: '/dashboard/experiences',
      color: 'bg-[#334C5D] hover:bg-[#334C5D]/80' // Azul oscuro
    }
  ];

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                ¡Hola, {sanityUser?.name?.split(' ')[0] || 'Usuario'}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Bienvenido de vuelta. Aquí tienes un resumen de tu actividad.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggleButton />
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Hoy es</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Setup Alert */}
        <CompanySetupAlert 
          userRole={sanityUser?.role || 'guest'}
          hasCompletedSetup={isSetupCompleted()}
          hasCompanyId={!!sanityUser?.companyId}
        />

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsConfig.map((statConfig, index) => {
              const Icon = statConfig.icon;
              const value = stats ? stats[statConfig.key] : 0;
              const displayValue = statConfig.format ? statConfig.format(value) : value.toString();
              
              // Para el crecimiento, determinar si es positivo o negativo
              const isGrowthStat = statConfig.key === 'growth';
              const growth = stats?.growth || 0;
              const changeType = growth >= 0 ? 'positive' : 'negative';
              
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{statConfig.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{displayValue}</p>
                    </div>
                    <div className={`${statConfig.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  {isGrowthStat && (
                    <div className="mt-4 flex items-center">
                      <span className={`text-sm font-medium ${
                        changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {displayValue}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs mes anterior</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className={`${action.color} text-white p-4 rounded-lg flex items-center space-x-3 transition-colors`}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="font-medium">{action.title}</p>
                        <p className="text-sm opacity-90">{action.description}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actividad Reciente</h2>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonActivityItem key={i} />)}
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No hay actividades recientes</p>
                  </div>
                ) : (
                  recentActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{activity.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="mt-8 bg-gradient-to-r from-[#f26726] to-[#f26726]/80 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Información de tu cuenta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="opacity-90">Nombre completo</p>
                  <p className="font-medium">{sanityUser?.name || 'No disponible'}</p>
                </div>
                <div>
                  <p className="opacity-90">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="opacity-90">Rol</p>
                  <p className="font-medium">
                    {sanityUser?.role === 'host' ? 'Anfitrión' : 
                     sanityUser?.role === 'admin' ? 'Administrador' : 'Comensal'}
                  </p>
                </div>
                <div>
                  <p className="opacity-90">Teléfono</p>
                  <p className="font-medium">{sanityUser?.phone || 'No disponible'}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <AiOutlineFire className="w-16 h-16 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 