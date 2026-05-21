"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HiCalendar } from 'react-icons/hi';
import { AiOutlineKey, AiOutlineArrowRight } from 'react-icons/ai';
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
                Integraciones
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Conecta tenemosfilo con tus herramientas externas
              </p>
            </div>
          </div>
        </div>

        {/* Calendarios (no aplica a revendedores) */}
        {sanityUser?.role !== 'reseller' && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Calendario
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ICalIntegrationCard companyId={sanityUser?.companyId || undefined} />
            </div>
          </section>
        )}

        {/* Desarrolladores: solo RESELLER y ADMIN pueden emitir API keys
            (ver tenemosfilo-api/src/modules/api-keys/api-keys.routes.ts). */}
        {(sanityUser?.role === 'reseller' || sanityUser?.role === 'admin') && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Desarrolladores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <Link
                href="/dashboard/integrations/api-keys"
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-[#F26726] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-[#334C5D] p-2.5 rounded-lg">
                    <AiOutlineKey className="w-6 h-6 text-white" />
                  </div>
                  <AiOutlineArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#F26726] transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  API Keys
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Genera tokens para integrar tu cuenta con servicios externos y consulta los snippets de uso.
                </p>
              </Link>
            </div>
          </section>
        )}

      </div>
    </ProtectedRoute>
  );
}
