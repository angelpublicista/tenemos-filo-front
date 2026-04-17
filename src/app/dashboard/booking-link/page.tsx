"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/firebase/AuthContext';
import { HiShare } from 'react-icons/hi';
import SharingPanel from '@/components/BookingEngine/SharingPanel';

export default function BookingLinkPage() {
  const { sanityUser } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HiShare className="w-8 h-8 text-[#334C5D] dark:text-gray-100" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Catálogo digital
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Comparte tu catálogo digital o incrústalo en tu sitio web
              </p>
            </div>
          </div>
        </div>

        {sanityUser?.companyId ? (
          <div className="max-w-2xl">
            <SharingPanel companyId={sanityUser.companyId} />
          </div>
        ) : (
          <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <HiShare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              Completa la configuración de tu empresa para obtener tu enlace de reservas.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
