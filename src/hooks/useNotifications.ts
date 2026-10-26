"use client";

// Bandeja de notificaciones del usuario.
//
// Vive contra /notifications del API. Antes era un stub que devolvía lista
// vacía: las notificaciones estaban en Firestore con la seguridad atada a
// Firebase Auth, y al migrar a NextAuth dejaron de funcionar.
import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "@/types";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  borrarNotificacion,
  borrarTodas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from "@/lib/api/notifications";

/** Cada cuánto se vuelve a mirar si hay algo nuevo. */
const INTERVALO_MS = 60_000;

export function useNotifications() {
  const { sanityUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!sanityUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const { items, sinLeer } = await listarNotificaciones();
      setNotifications(items);
      setUnreadCount(sinLeer);
    } catch {
      // Un fallo al consultar la bandeja no debe romper la pantalla que la
      // contiene: la campana vive en el encabezado de todo el panel.
    } finally {
      setLoading(false);
    }
  }, [sanityUser]);

  useEffect(() => {
    void cargar();
    if (!sanityUser) return;
    // Sondeo simple en vez de websockets: llegan pocas y no urge el
    // segundo exacto. Si algún día importa, se cambia aquí.
    const id = setInterval(() => void cargar(), INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar, sanityUser]);

  const markAsRead = useCallback(async (id: string) => {
    // Se pinta como leída antes de que responda el servidor: es lo que el
    // usuario acaba de hacer y esperar medio segundo se nota.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await marcarLeida(id);
    } catch {
      void cargar();
    }
  }, [cargar]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await marcarTodasLeidas();
    } catch {
      void cargar();
    }
  }, [cargar]);

  const deleteNotification = useCallback(async (id: string) => {
    const previas = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await borrarNotificacion(id);
      await cargar();
    } catch {
      setNotifications(previas);
    }
  }, [notifications, cargar]);

  const deleteAll = useCallback(async () => {
    const previas = notifications;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await borrarTodas();
    } catch {
      setNotifications(previas);
      void cargar();
    }
  }, [notifications, cargar]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    recargar: cargar,
  };
}
