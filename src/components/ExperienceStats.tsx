"use client";

import React from 'react';
import { HiStar, HiCheckCircle, HiPencilAlt, HiPause } from 'react-icons/hi';

/**
 * Las cifras del catálogo: cuántas experiencias hay y en qué estado.
 *
 * Reservas e ingresos no salen aquí a propósito. Son otra cosa y tienen su
 * sitio: las reservas en Reservas, el dinero en Ingresos —que además lo
 * desglosa por experiencia—. Tenerlos también aquí significaba mantener dos
 * cifras de lo mismo, y las que había llevaban en cero desde siempre porque
 * nadie las escribía: la pantalla prometía «0 reservas» y «$0» a quien sí
 * había vendido.
 */
interface ExperienceStatsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    pending: number;
    /** Cuántas tienen alguna publicación en pausa. */
    pausadas: number;
    inactive: number;
    averageRating: number;
  };
  className?: string;
}

const cardClass = "bg-white rounded-lg shadow-sm border border-gray-200 p-3";

export default function ExperienceStats({ stats, className = "" }: ExperienceStatsProps) {
  const showRating = stats.averageRating > 0;
  return (
    <div className={`grid grid-cols-2 ${showRating ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4 lg:grid-cols-4'} gap-3 ${className}`}>
      {/* Total Experiencias */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-[#F26726] rounded-lg shrink-0">
            <HiStar className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Total</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Experiencias Activas */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-green-500 rounded-lg shrink-0">
            <HiCheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Activas</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.active}</p>
          </div>
        </div>
      </div>

      {/* Borradores: lo que está a medias y nadie puede comprar todavía. */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-gray-400 rounded-lg shrink-0">
            <HiPencilAlt className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Borradores</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.draft}</p>
          </div>
        </div>
      </div>

      {/* Retiradas y con alguna publicación en pausa: las dos significan que
          hay algo que ahora mismo no se está vendiendo. Pausar es de la
          publicación, así que una misma pieza puede estar vendiéndose en una
          sede y en pausa en otra. */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-amber-500 rounded-lg shrink-0">
            <HiPause className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Sin vender</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">
              {stats.pausadas + stats.inactive}
            </p>
          </div>
        </div>
      </div>

      {/* Calificación Promedio */}
      {showRating && (
        <div className={cardClass}>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500 rounded-lg shrink-0">
              <HiStar className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-gray-600 truncate">Calificación</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">
                {stats.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
