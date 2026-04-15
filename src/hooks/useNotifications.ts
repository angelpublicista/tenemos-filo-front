"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/lib/firebase/notificationService';
import type { AppNotification } from '@/types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    if (!user?.uid) return;
    markAsRead(user.uid, id);
  };

  const handleMarkAllAsRead = () => {
    if (!user?.uid) return;
    markAllAsRead(user.uid);
  };

  const handleDelete = (id: string) => {
    if (!user?.uid) return;
    deleteNotification(user.uid, id);
  };

  const handleDeleteAll = () => {
    if (!user?.uid) return;
    deleteAllNotifications(user.uid);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    deleteAll: handleDeleteAll,
  };
}
