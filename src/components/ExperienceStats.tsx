"use client";

import React from 'react';
import {
  HiStar,
  HiCheckCircle,
  HiUsers,
  HiCurrencyDollar
} from 'react-icons/hi';

interface ExperienceStatsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    pending: number;
    paused: number;
    inactive: number;
    totalBookings: number;
    totalRevenue: number;
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

      {/* Total Reservas */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-blue-500 rounded-lg shrink-0">
            <HiUsers className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Reservas</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">{stats.totalBookings}</p>
          </div>
        </div>
      </div>

      {/* Ingresos Totales */}
      <div className={cardClass}>
        <div className="flex items-center">
          <div className="p-2 bg-[#19A3A2] rounded-lg shrink-0">
            <HiCurrencyDollar className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">Ingresos</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">
              ${stats.totalRevenue.toLocaleString('es-CO')}
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
