"use client";

import { useEffect, useState } from 'react';
import {
  AiOutlineLink,
  AiOutlineDollar,
  AiOutlineRise,
  AiOutlineShoppingCart,
  AiOutlineAppstore,
  AiOutlineFire,
} from 'react-icons/ai';
import { SkeletonStatCard, SkeletonActivityItem } from '@/components/Skeleton';
import {
  getRecentResellerActivities,
  getResellerStats,
  formatCOP,
  ResellerStats,
  RecentResellerActivity,
} from '@/lib/sanity/resellerService';
import { useAuth } from '@/lib/auth/AuthContext';
import ThemeToggleButton from '@/components/ThemeToggleButton';

export default function ResellerDashboard() {
  const { user, sanityUser } = useAuth();
  const [stats, setStats] = useState<ResellerStats | null>(null);
  const [activities, setActivities] = useState<RecentResellerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [s, a] = await Promise.all([
          getResellerStats(),
          getRecentResellerActivities(5),
        ]);
        if (!cancelled) {
          setStats(s);
          setActivities(a);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Error al cargar el dashboard de reventa');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statsConfig: Array<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    sub?: string;
  }> = [
    {
      title: 'Comisión del mes',
      value: stats ? formatCOP(stats.monthlyCommission) : '—',
      icon: AiOutlineDollar,
      color: 'bg-[#F26726]',
      sub: stats ? `${stats.monthlyResales} reventas` : undefined,
    },
    {
      title: 'Links activos',
      value: stats ? String(stats.activeLinks) : '—',
      icon: AiOutlineLink,
      color: 'bg-[#19A3A2]',
    },
    {
      title: 'Reventas pendientes',
      value: stats ? String(stats.pendingResales) : '—',
      icon: AiOutlineShoppingCart,
      color: 'bg-[#EBD52C]',
    },
    {
      title: 'Conversión',
      value: stats ? `${(stats.conversionRate * 100).toFixed(1)}%` : '—',
      icon: AiOutlineRise,
      color: 'bg-[#E23694]',
      sub: stats ? `Crecimiento ${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%` : undefined,
    },
  ];

  const quickActions = [
    {
      title: 'Explorar catálogo',
      description: 'Descubre experiencias para revender',
      icon: AiOutlineAppstore,
      href: '/dashboard/catalog',
      color: 'bg-[#F26726] hover:bg-[#F26726]/80',
    },
    {
      title: 'Ver mis reventas',
      description: 'Revisa estados y comisiones',
      icon: AiOutlineDollar,
      href: '/dashboard/resales',
      color: 'bg-[#19A3A2] hover:bg-[#19A3A2]/80',
    },
    {
      title: 'Mis links',
      description: 'Gestiona links de reventa',
      icon: AiOutlineLink,
      href: '/dashboard/resale-links',
      color: 'bg-[#334C5D] hover:bg-[#334C5D]/80',
    },
  ];

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              ¡Hola, {sanityUser?.name?.split(' ')[0] || 'Revendedor'}! 👋
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aquí tienes el resumen de tus reventas y comisiones.
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Hoy es</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <ThemeToggleButton />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {statsConfig.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {s.title}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                      {s.value}
                    </p>
                  </div>
                  <div className={`${s.color} p-2 rounded-lg shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                {s.sub && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {s.sub}
                  </p>
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
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Acciones rápidas
            </h2>
            <div className="space-y-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <a
                    key={idx}
                    href={action.href}
                    className={`${action.color} text-white p-3 rounded-lg flex items-center space-x-3 transition-colors`}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs opacity-90">{action.description}</p>
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
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Reventas recientes
              </h2>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonActivityItem key={i} />
                ))
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Aún no tienes reventas. Empieza generando un link desde el catálogo.
                  </p>
                </div>
              ) : (
                activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                      <AiOutlineShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {a.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {a.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {a.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="mt-4 bg-gradient-to-r from-[#f26726] to-[#f26726]/80 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Información de tu cuenta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-90">Nombre</p>
                <p className="font-medium">{sanityUser?.name || 'No disponible'}</p>
              </div>
              <div>
                <p className="opacity-90">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="opacity-90">Rol</p>
                <p className="font-medium">Revendedor</p>
              </div>
              <div>
                <p className="opacity-90">Comisión total acumulada</p>
                <p className="font-medium">
                  {stats ? formatCOP(stats.totalCommission) : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <AiOutlineFire className="w-16 h-16 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
