"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HiBell, HiCheckCircle, HiTrash, HiFilter } from 'react-icons/hi';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/types';
import { SkeletonCard } from '@/components/Skeleton';

const TYPE_LABEL: Record<NotificationType, string> = {
  new_reservation:         'Nueva reserva',
  reservation_confirmed:   'Reserva confirmada',
  reservation_cancelled:   'Reserva cancelada',
  reservation_rescheduled: 'Reserva reprogramada',
  payment_received:        'Pago recibido',
  review_received:         'Nueva reseña',
  system:                  'Sistema',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  new_reservation:         'bg-blue-100 text-blue-700',
  reservation_confirmed:   'bg-green-100 text-green-700',
  reservation_cancelled:   'bg-red-100 text-red-700',
  reservation_rescheduled: 'bg-yellow-100 text-yellow-700',
  payment_received:        'bg-emerald-100 text-emerald-700',
  review_received:         'bg-purple-100 text-purple-700',
  system:                  'bg-gray-100 text-gray-600',
};

const DOT_COLOR: Record<NotificationType, string> = {
  new_reservation:         'bg-blue-500',
  reservation_confirmed:   'bg-green-500',
  reservation_cancelled:   'bg-red-500',
  reservation_rescheduled: 'bg-yellow-500',
  payment_received:        'bg-emerald-500',
  review_received:         'bg-purple-500',
  system:                  'bg-gray-400',
};

function formatDate(ts: AppNotification['createdAt']): string {
  return new Date(ts.seconds * 1000).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

type FilterState = 'all' | 'unread' | NotificationType;

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAll } =
    useNotifications();
  const [filter, setFilter] = useState<FilterState>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });


  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <HiBell className="w-7 h-7 text-[#334C5D]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <HiCheckCircle className="w-4 h-4" />
                Marcar todo como leído
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <HiTrash className="w-4 h-4" />
                Eliminar todo
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <HiFilter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {(['all', 'unread', ...Object.keys(TYPE_LABEL)] as FilterState[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                filter === f
                  ? 'bg-[#F26726] text-white border-[#F26726]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#F26726] hover:text-[#F26726]'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'unread' ? `Sin leer (${unreadCount})` : TYPE_LABEL[f as NotificationType]}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HiBell className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-lg font-medium">Sin notificaciones</p>
            <p className="text-sm mt-1">Aquí aparecerán tus alertas cuando haya actividad</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border group transition-colors ${
                  n.read
                    ? 'bg-white border-gray-100'
                    : 'bg-white border-l-4 shadow-sm'
                } ${!n.read ? `border-l-${DOT_COLOR[n.type].replace('bg-', '')}` : ''}`}
                style={!n.read ? { borderLeftColor: getBorderColor(n.type) } : {}}
              >
                {/* Dot */}
                <div className="mt-1 flex-shrink-0">
                  <span className={`block w-2.5 h-2.5 rounded-full ${n.read ? 'bg-gray-200' : DOT_COLOR[n.type]}`} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOR[n.type]}`}>
                      {TYPE_LABEL[n.type]}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>

                {/* Acciones */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      title="Marcar como leída"
                    >
                      <HiCheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function getBorderColor(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    new_reservation:         '#3b82f6',
    reservation_confirmed:   '#22c55e',
    reservation_cancelled:   '#ef4444',
    reservation_rescheduled: '#eab308',
    payment_received:        '#10b981',
    review_received:         '#a855f7',
    system:                  '#9ca3af',
  };
  return map[type];
}
