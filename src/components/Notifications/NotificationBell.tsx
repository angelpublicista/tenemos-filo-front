"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { HiBell, HiCheckCircle, HiTrash, HiX } from 'react-icons/hi';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/types';

const TYPE_STYLES: Record<NotificationType, { bg: string; dot: string }> = {
  new_reservation:        { bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  reservation_confirmed:  { bg: 'bg-green-50',  dot: 'bg-green-500' },
  reservation_cancelled:  { bg: 'bg-red-50',    dot: 'bg-red-500' },
  reservation_rescheduled:{ bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  payment_received:       { bg: 'bg-emerald-50',dot: 'bg-emerald-500' },
  review_received:        { bg: 'bg-purple-50', dot: 'bg-purple-500' },
  system:                 { bg: 'bg-gray-50',   dot: 'bg-gray-400' },
};

function timeAgo(ts: AppNotification['createdAt']): string {
  const date = new Date(ts.seconds * 1000);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const preview = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      {/* Botón campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-[#F26726] hover:bg-gray-100 transition-colors"
        aria-label="Notificaciones"
      >
        <HiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#F26726] hover:underline font-medium"
                >
                  Marcar todo como leído
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {preview.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                <HiBell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Sin notificaciones
              </div>
            ) : (
              preview.map((n) => {
                const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.system;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 group transition-colors ${n.read ? 'bg-white' : style.bg}`}
                  >
                    {/* Dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <span className={`block w-2 h-2 rounded-full ${n.read ? 'bg-gray-200' : style.dot}`} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="p-1 text-green-500 hover:text-green-700"
                          title="Marcar como leída"
                        >
                          <HiCheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-[#F26726] hover:underline font-medium"
              >
                Ver todas las notificaciones →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
