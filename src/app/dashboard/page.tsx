"use client";

import { useAuth } from "@/lib/auth/AuthContext";
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
import { BiBuildingHouse, BiStore } from 'react-icons/bi';
import { useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivities, DashboardStats, RecentActivity } from '@/lib/sanity/dashboardService';
import { SkeletonStatCard, SkeletonActivityItem } from '@/components/Skeleton';
import { getResumenIngresos, type ResumenIngresos } from '@/lib/api/earnings';
import { listarMisReservas, ETIQUETA_ESTADO, type MiReserva } from '@/lib/api/misReservas';
import Link from 'next/link';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

export default function Dashboard() {
  const { user, sanityUser, activeCompanyId, esPanelRevendedor } = useAuth();
  const { isSetupCompleted } = useCompanySetup();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [misReservas, setMisReservas] = useState<MiReserva[]>([]);
  const esComensal = sanityUser?.role === 'guest';
  const proximas = misReservas
    .filter((r) => new Date(r.reservationDate).getTime() >= Date.now() && r.status !== 'CANCELLED')
    .sort((a, b) => +new Date(a.reservationDate) - +new Date(b.reservationDate));

  const [ingresosReseller, setIngresosReseller] = useState<ResumenIngresos | null>(null);
  const esReseller = esPanelRevendedor;
  // Solo la fila de revendedor: si su empresa ademas es anfitriona, sus
  // ingresos como tal no son cosa suya.
  const totalesReseller = (ingresosReseller?.balances ?? [])
    .filter((b) => b.role === 'RESELLER')
    .reduce(
      (acc, b) => ({
        accrued: acc.accrued + b.accrued,
        paid: acc.paid + b.paid,
        pending: acc.pending + b.pending,
      }),
      { accrued: 0, paid: 0, pending: 0 },
    );
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      // El ADMIN no tiene empresa propia: pide las metricas de toda la
      // plataforma (sin companyId). El resto necesita su empresa.
      const esAdmin = sanityUser?.role === 'admin';
      const esComensal = sanityUser?.role === 'guest';
      if (!sanityUser?.companyId && !esAdmin && !esComensal) {
        setIsLoading(false);
        return;
      }

      // Un comensal no tiene empresa ni estadisticas de negocio: lo suyo
      // son las reservas que ha hecho.
      if (sanityUser?.role === 'guest') {
        try {
          setIsLoading(true);
          setError(null);
          setMisReservas(await listarMisReservas());
        } catch (err) {
          console.error('Error cargando las reservas del comensal:', err);
          setError('No se pudieron cargar tus reservas.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Un revendedor pertenece a una empresa anfitriona pero no la opera.
      // /dashboard/stats le responde 403, y aunque respondiera le estaria
      // enseñando las experiencias y los ingresos de otro. Lo suyo son sus
      // comisiones, que vienen de /payouts/me. Un admin actuando como una
      // empresa de revendedor mira ese mismo panel.
      if (esReseller) {
        try {
          setIsLoading(true);
          setError(null);
          setIngresosReseller(await getResumenIngresos());
        } catch (err) {
          console.error('Error cargando los ingresos del revendedor:', err);
          setError('No se pudieron cargar tus comisiones.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const companyId = sanityUser?.companyId ?? undefined;
        const [statsData, activitiesData] = await Promise.all([
          getDashboardStats(companyId),
          getRecentActivities(companyId, 5)
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
  }, [sanityUser?.companyId, sanityUser?.role, esReseller]);

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
    },
    // Solo en modo plataforma. Actuando como una empresa, un total global de
    // empresas y usuarios no dice nada del contexto en el que estas.
    ...(sanityUser?.role === 'admin' && !activeCompanyId
      ? [
          {
            title: 'Empresas',
            key: 'totalCompanies' as keyof DashboardStats,
            icon: BiStore,
            color: 'bg-[#2C6E7F]'
          },
          {
            title: 'Usuarios',
            key: 'totalUsers' as keyof DashboardStats,
            icon: AiOutlineTeam,
            color: 'bg-[#7C5CBF]'
          }
        ]
      : [])
  ];

  // En modo plataforma el admin no tiene empresa: estas acciones operan sobre
  // una y acabarian mandandolo a /company-setup. Le ofrecemos las del panel.
  const esAdminSinEmpresa = sanityUser?.role === 'admin' && !activeCompanyId;

  const quickActions = esAdminSinEmpresa
    ? [
        {
          title: 'Empresas',
          description: 'Revisa y gestiona las empresas',
          icon: BiStore,
          href: '/dashboard/admin/empresas',
          destacada: true
        },
        {
          title: 'Usuarios',
          description: 'Administra las cuentas de la plataforma',
          icon: AiOutlineTeam,
          href: '/dashboard/admin/usuarios',
          destacada: false
        },
        {
          title: 'Actividad',
          description: 'Quién cambió qué',
          icon: AiOutlineCalendar,
          href: '/dashboard/admin/actividad',
          destacada: false
        }
      ]
    : [
        {
          title: 'Crear Experiencia',
          description: 'Organiza una nueva experiencia',
          icon: BiBuildingHouse,
          href: '/dashboard/experiences/create',
          destacada: true
        },
        {
          title: 'Ver Reservas',
          description: 'Gestiona las reservas pendientes',
          icon: AiOutlineTeam,
          href: '/dashboard/reservations',
          destacada: false
        },
        {
          title: 'Mis Experiencias',
          description: 'Revisa tus experiencias activas',
          icon: AiOutlineCalendar,
          href: '/dashboard/experiences',
          destacada: false
        }
      ];

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                ¡Hola, {sanityUser?.name?.split(' ')[0] || 'Usuario'}! 👋
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bienvenido de vuelta. Aquí tienes un resumen de tu actividad.
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <div className="text-left sm:text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Hoy es</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <span className="sm:hidden">
                    {new Date().toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="hidden sm:inline">
                    {new Date().toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </p>
              </div>
              <ThemeToggleButton />
            </div>
          </div>
        </div>

        {/* Company Setup Alert */}
        <CompanySetupAlert 
          userRole={sanityUser?.role || 'guest'}
          hasCompletedSetup={isSetupCompleted()}
          hasCompanyId={!!sanityUser?.companyId}
        />

        {/* Panel del comensal: lo que ha reservado. */}
        {esComensal ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Tus próximas reservas
                </h2>
                <Link
                  href="/dashboard/mis-reservas"
                  className="text-sm text-[#F26726] hover:underline"
                >
                  Ver todas
                </Link>
              </div>

              {isLoading ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : proximas.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    No tienes ninguna reserva próxima.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Cuando reserves una experiencia la verás aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {proximas.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {r.experience?.title ?? 'Experiencia'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(r.reservationDate).toLocaleDateString('es-CO', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}{' '}
                          · {r.company?.companyName}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{ETIQUETA_ESTADO[r.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : esReseller ? (
          // Panel del revendedor: sus comisiones, no las de la empresa
          // anfitriona a la que pertenece.
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              {[
                { titulo: 'Comisiones generadas', valor: totalesReseller.accrued },
                { titulo: 'Ya recibido', valor: totalesReseller.paid },
                { titulo: 'Por recibir', valor: totalesReseller.pending, destacar: true },
              ].map((t) => (
                <div
                  key={t.titulo}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.titulo}</p>
                  <p
                    className={`text-2xl font-bold ${
                      t.destacar ? 'text-[#F26726]' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {isLoading ? '—' : pesos(t.valor)}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Vender desde tu plataforma
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Crea una clave de API y conecta tu sistema. Cada reserva que hagas con ella se te
                atribuye y genera comisión.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/api-keys"
                  className="px-4 py-2 rounded-full bg-[#F26726] text-white text-sm font-medium hover:bg-[#E05617] transition-colors"
                >
                  Claves de API
                </Link>
                <Link
                  href="/dashboard/ingresos"
                  className="px-4 py-2 rounded-full border border-gray-300 text-[#334C5D] text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Ver mis comisiones
                </Link>
              </div>
            </div>
          </>
        ) : (
        <>
        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {statsConfig.map((statConfig, index) => {
              const Icon = statConfig.icon;
              // totalCompanies/totalUsers solo llegan en modo plataforma.
              const value = stats?.[statConfig.key] ?? 0;
              const displayValue = statConfig.format ? statConfig.format(value) : value.toString();

              const isGrowthStat = statConfig.key === 'growth';
              const growth = stats?.growth || 0;
              const changeType = growth >= 0 ? 'positive' : 'negative';

              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{statConfig.title}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">{displayValue}</p>
                    </div>
                    <div className={`${statConfig.color} p-2 rounded-lg shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  {isGrowthStat && (
                    <div className="mt-2 flex items-center">
                      <span className={`text-xs font-medium ${
                        changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        vs mes anterior
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Acciones Rápidas</h2>
              <div className="space-y-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className={
                        action.destacada
                          ? 'bg-[#F26726] hover:bg-[#E05617] text-white p-3 rounded-lg flex items-center space-x-3 transition-colors'
                          : 'bg-white hover:bg-gray-50 border border-gray-200 text-[#334C5D] p-3 rounded-lg flex items-center space-x-3 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700'
                      }
                    >
                      <Icon className={action.destacada ? 'w-5 h-5' : 'w-5 h-5 text-[#F26726]'} />
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className={action.destacada ? 'text-xs opacity-90' : 'text-xs text-gray-500 dark:text-gray-400'}>
                          {action.description}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Actividad Reciente</h2>
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

        </>
        )}

        {/* User Info Card */}
        <div className="mt-4 bg-gradient-to-r from-[#f26726] to-[#f26726]/80 rounded-lg p-4 text-white">
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
                     sanityUser?.role === 'admin' ? 'Administrador' :
                     sanityUser?.role === 'reseller' ? 'Revendedor' : 'Comensal'}
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