"use client";

import React from 'react';
import { HiExclamationTriangle, HiArrowRight } from 'react-icons/hi2';
import Link from 'next/link';

interface CompanySetupAlertProps {
  userRole: 'host' | 'guest' | 'admin';
  hasCompletedSetup: boolean;
  hasCompanyId: boolean;
}

export default function CompanySetupAlert({ userRole, hasCompletedSetup, hasCompanyId }: CompanySetupAlertProps) {
  // Solo mostrar si el usuario saltó el setup anteriormente
  if (hasCompletedSetup && hasCompanyId) {
    return null; // Usuario ya completó realmente el setup
  }

  if (!hasCompletedSetup) {
    return null; // Usuario nunca inició el setup
  }

  // Usuario saltó el setup anteriormente
  const isHost = userRole === 'host';
  const limitationText = isHost 
    ? 'no podrás crear experiencias' 
    : 'no podrás cotizar experiencias';

  return (
    <div className="mb-6 bg-gradient-to-r from-[#EBD52C] to-[#EBD52C]/80 border border-[#EBD52C] rounded-lg p-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0">
            <HiExclamationTriangle className="w-6 h-6 text-[#334C5D]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#334C5D] mb-1">
              Configuración de Empresa Pendiente
            </h3>
            <p className="text-[#334C5D]/80 text-sm">
              Anteriormente saltaste la configuración de empresa. 
              Recuerda que {limitationText} hasta completar esta información.
            </p>
          </div>
        </div>
        <Link 
          href="/company-setup"
          className="ml-4 flex items-center space-x-2 bg-[#F26726] hover:bg-[#F26726]/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <span>Completar Ahora</span>
          <HiArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}