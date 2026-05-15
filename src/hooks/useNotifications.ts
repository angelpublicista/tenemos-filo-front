"use client";

// Stub temporal: las notificaciones vivian en Firestore con seguridad atada
// a Firebase Auth. Tras migrar a NextAuth no hay sesion de Firebase, por eso
// los listeners fallaban con permission-denied y llenaban la consola.
//
// TODO: implementar /notifications en el API (Postgres) y reemplazar este
// stub. Por ahora devolvemos lista vacia para no romper a los consumidores
// (Navbar/NotificationsBell, etc.).
import { useMemo } from "react";
import type { AppNotification } from "@/types";

const noop = () => {};

export function useNotifications() {
  return useMemo(
    () => ({
      notifications: [] as AppNotification[],
      unreadCount: 0,
      loading: false,
      markAsRead: noop as (id: string) => void,
      markAllAsRead: noop,
      deleteNotification: noop as (id: string) => void,
      deleteAll: noop,
    }),
    [],
  );
}
