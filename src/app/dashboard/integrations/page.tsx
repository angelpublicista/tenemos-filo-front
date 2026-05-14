"use client";

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HiCalendar } from 'react-icons/hi';
import ICalIntegrationCard from '@/components/IntegrationCards/ICalIntegrationCard';

export default function IntegrationsPage() {
  const { sanityUser } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HiCalendar className="w-6 h-6 sm:w-8 sm:h-8 text-[#334C5D] dark:text-gray-100 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Integraciones de Calendario
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Mantén tu agenda sincronizada con las herramientas que ya usas
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ICalIntegrationCard companyId={sanityUser?.companyId || undefined} />
        </div>

      </div>
    </ProtectedRoute>
  );
}
