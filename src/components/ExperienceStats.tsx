"use client";

import React from 'react';
import { Card } from 'flowbite-react';
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

export default function ExperienceStats({ stats, className = "" }: ExperienceStatsProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}>
      {/* Total Experiencias */}
      <Card className="p-2">
        <div className="flex items-center">
          <div className="p-2 bg-[#F26726] rounded-lg">
            <HiStar className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Total</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight">{stats.total}</p>
          </div>
        </div>
      </Card>

      {/* Experiencias Activas */}
      <Card className="p-2">
        <div className="flex items-center">
          <div className="p-2 bg-green-500 rounded-lg">
            <HiCheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Activas</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight">{stats.active}</p>
          </div>
        </div>
      </Card>

      {/* Total Reservas */}
      <Card className="p-2">
        <div className="flex items-center">
          <div className="p-2 bg-blue-500 rounded-lg">
            <HiUsers className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Reservas</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight">{stats.totalBookings}</p>
          </div>
        </div>
      </Card>

      {/* Ingresos Totales */}
      <Card className="p-2">
        <div className="flex items-center">
          <div className="p-2 bg-[#19A3A2] rounded-lg">
            <HiCurrencyDollar className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-xs font-medium text-gray-600">Ingresos</p>
            <p className="text-xl font-bold text-[#334C5D] leading-tight truncate">
              ${stats.totalRevenue.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </Card>

      {/* Calificación Promedio */}
      {stats.averageRating > 0 && (
        <Card className="p-2">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <HiStar className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Calificación</p>
              <p className="text-xl font-bold text-[#334C5D] leading-tight">
                {stats.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
