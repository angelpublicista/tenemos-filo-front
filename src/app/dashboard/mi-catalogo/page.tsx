"use client";

import React, { useEffect, useState } from 'react';
import { Card } from 'flowbite-react';
import { HiExternalLink, HiInformationCircle } from 'react-icons/hi';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import SharingPanel from '@/components/BookingEngine/SharingPanel';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCompanyByUserId } from '@/lib/sanity/companyService';

export default function MiCatalogoPage() {
  const { sanityUser } = useAuth();
  // El enlace lleva el slug de la empresa, y el perfil solo trae su id.
  const [slug, setSlug] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!sanityUser?.companyId) {
      setCargando(false);
      return;
    }
    getCompanyByUserId()
      .then((c) => setSlug(c?.slug?.current ?? null))
      .catch(() => setSlug(null))
      .finally(() => setCargando(false));
  }, [sanityUser?.companyId]);

  return (
    <ProtectedRoute roles={['reseller', 'admin']}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi catálogo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Comparte las experiencias de Tenemos Filo y gana comisión por cada reserva
        </p>
      </div>

      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <HiInformationCircle className="w-5 h-5 text-[#F26726] shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Tu catálogo se actualiza solo
            </p>
            <p className="mt-1">
              Muestra todas las experiencias publicadas en la plataforma. Cuando un anfitrión
              publica una nueva, aparece aquí sin que tengas que hacer nada.
            </p>
            <p className="mt-2">
              Toda reserva que entre por tu enlace o por tu iframe queda atribuida a ti y genera
              tu comisión automáticamente. El cobro lo procesa Tenemos Filo.
            </p>
            <Link href="/dashboard/ingresos" className="mt-2 inline-block text-[#F26726] hover:underline">
              Ver tus comisiones
            </Link>
          </div>
        </div>
      </Card>

      {cargando ? (
        <Card>
          <p className="text-sm text-gray-500">Cargando tu enlace...</p>
        </Card>
      ) : !slug ? (
        <Card>
          <p className="text-sm text-gray-600">
            Tu cuenta todavía no tiene una empresa asociada, y el enlace lleva su nombre.
            Escríbenos para asociarla y podrás compartir tu catálogo.
          </p>
        </Card>
      ) : (
        <>
          <SharingPanel slug={slug} base="r" />

          <div className="mt-6">
            <a
              href={`/r/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#F26726] hover:underline"
            >
              Ver mi catálogo como lo verá un cliente <HiExternalLink className="w-4 h-4" />
            </a>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
