"use client";

import React from 'react';
import { Company } from '@/types';
import { calcularCompletitud } from '@/lib/company/completitud';
import { HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';

interface CompanyProgressProps {
  company: Company | null;
  /** Que hacer al pulsar "Completar". Si no se pasa, no se pinta el boton. */
  onCompletar?: () => void;
  className?: string;
}

/**
 * Cuanto lleva rellenado la empresa y que le falta.
 *
 * Antes se anunciaba "Configuración Completada" en cuanto existia la empresa,
 * aunque le faltara media ficha: el aviso venia de una marca en localStorage,
 * no de mirar los datos. Quien lo leia daba el trabajo por hecho y su catalogo
 * salia sin logo ni descripcion.
 *
 * Asi que el mensaje sale de los datos, y hasta que no esten todos se enseña
 * lo que falta en vez de felicitar.
 */
export default function CompanyProgress({
  company,
  onCompletar,
  className = '',
}: CompanyProgressProps) {
  const { porcentaje, faltantes, faltantesObligatorios, rellenos, total, completa } =
    calcularCompletitud(company);

  if (completa) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 sm:p-5 ${className}`}>
        <div className="flex items-start gap-3">
          <HiCheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-[#334C5D]">Información completa</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              No falta nada por rellenar. Tu catálogo se ve con toda la información.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Falta algo obligatorio: ambar. Solo opcionales: azul, que no es un problema
  // sino una mejora — mezclarlos haria que lo urgente dejara de notarse.
  const urge = faltantesObligatorios.length > 0;
  const colores = urge
    ? { caja: 'bg-amber-50 border-amber-200', barra: 'bg-amber-500', icono: 'text-amber-600' }
    : { caja: 'bg-blue-50 border-blue-200', barra: 'bg-[#F26726]', icono: 'text-blue-600' };

  return (
    <div className={`${colores.caja} border rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <HiExclamationCircle className={`w-6 h-6 ${colores.icono} shrink-0 mt-0.5`} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[#334C5D]">
            {urge ? 'Falta información de tu empresa' : 'Completa tu perfil'}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {urge
              ? 'Hay datos necesarios sin rellenar. Complétalos para que tu empresa quede en orden.'
              : 'Solo quedan datos opcionales, pero ayudan a que tu catálogo se vea mejor.'}
          </p>
        </div>
      </div>

      {/* Barra */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm font-medium text-[#334C5D]">{porcentaje}% completado</span>
          <span className="text-xs text-gray-500">
            {rellenos} de {total} campos
          </span>
        </div>
        <div
          className="w-full bg-white/70 rounded-full h-2.5 overflow-hidden"
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de la información de la empresa"
        >
          <div
            className={`${colores.barra} h-full rounded-full transition-all duration-500`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Que falta, en su idioma, no con nombres de campo */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Te falta por llenar
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {faltantes.map((c) => (
            <li
              key={c.etiqueta}
              className={`text-xs px-2 py-1 rounded-full border ${
                c.obligatorio
                  ? 'bg-white border-amber-300 text-amber-800'
                  : 'bg-white border-gray-300 text-gray-600'
              }`}
              title={c.obligatorio ? 'Necesario' : 'Opcional'}
            >
              {c.etiqueta}
              {!c.obligatorio && <span className="text-gray-400 ml-1">· opcional</span>}
            </li>
          ))}
        </ul>
      </div>

      {onCompletar && (
        <button
          type="button"
          onClick={onCompletar}
          className="px-5 py-2 bg-[#F26726] text-white text-sm rounded-lg hover:bg-[#d9571f] transition-colors cursor-pointer"
        >
          Completar información
        </button>
      )}
    </div>
  );
}
