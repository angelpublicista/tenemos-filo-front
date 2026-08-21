"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { HiShare } from 'react-icons/hi';
import SharingPanel from '@/components/BookingEngine/SharingPanel';
import EmbedDomains from '@/components/BookingEngine/EmbedDomains';
import { getCompanyByUserId } from '@/lib/sanity/companyService';

export default function BookingLinkPage() {
  const { sanityUser } = useAuth();
  // El enlace usa el slug de la empresa ("filo-demo"), no su id. Hay que
  // pedir la empresa porque el perfil del usuario solo trae el companyId.
  const [slug, setSlug] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [embedDomains, setEmbedDomains] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!sanityUser?.companyId) {
      setCargando(false);
      return;
    }
    getCompanyByUserId()
      .then((c) => {
        // El tipo Company conserva el shape de Sanity: { _type, current }.
        setSlug(c?.slug?.current ?? null);
        setCompanyId(c?._id ?? null);
        setEmbedDomains(c?.embedDomains ?? []);
      })
      .catch(() => setSlug(null))
      .finally(() => setCargando(false));
  }, [sanityUser?.companyId]);

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HiShare className="w-6 h-6 sm:w-8 sm:h-8 text-[#334C5D] dark:text-gray-100 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Catálogo digital
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Comparte tu catálogo digital o incrústalo en tu sitio web
              </p>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            Cargando tu enlace...
          </div>
        ) : slug ? (
          <div className="max-w-2xl space-y-4">
            <SharingPanel slug={slug} />
            {companyId && <EmbedDomains companyId={companyId} iniciales={embedDomains} />}
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
