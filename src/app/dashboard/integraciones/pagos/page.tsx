"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import CobroPropio from '@/components/CobroPropio';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCompanyById } from '@/lib/sanity/companyService';
import type { Company } from '@/types';

/**
 * Con qué pasarela cobra el anfitrión.
 *
 * Tiene pantalla propia y no un bloque dentro de Configuración porque no es
 * una preferencia: decide a qué cuenta entra el dinero de cada venta y si FILO
 * cobra comisión sobre ella. Escondido entre los ajustes, nadie lo encontraba.
 */
export default function PagosPage() {
  const { sanityUser } = useAuth();
  const companyId = sanityUser?.companyId ?? null;
  const [company, setCompany] = useState<Company | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let vigente = true;
    getCompanyById(companyId)
      .then((c) => { if (vigente) setCompany(c); })
      .catch(() => { if (vigente) setCompany(null); })
      .finally(() => { if (vigente) setCargado(true); });
    return () => { vigente = false; };
  }, [companyId]);

  // Sin empresa no hay nada que esperar: se deduce en vez de apagar una
  // bandera dentro del efecto, que es lo que provocaba un render de más.
  const esperando = Boolean(companyId) && !cargado;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#334C5D]">Pagos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Con qué pasarela se cobran tus experiencias. Por defecto cobra Tenemos Filo y te
            dispersa lo tuyo; si conectas la tuya, el dinero entra directo a tu cuenta.
          </p>
        </div>

        {esperando ? null : company ? (
          <CobroPropio companyId={company._id} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Primero completa los datos de tu empresa en{' '}
            <Link href="/dashboard/company" className="text-marca hover:underline">
              Mi Empresa
            </Link>
            .
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
