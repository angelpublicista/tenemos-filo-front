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
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Total Experiencias */}
      <Card className="p-6">
        <div className="flex items-start">
          <div className="p-2 bg-[#F26726] rounded-lg">
            <HiStar className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Experiencias</p>
            <p className="text-2xl font-bold text-[#334C5D]">{stats.total}</p>
          </div>
        </div>
      </Card>

      {/* Experiencias Activas */}
      <Card className="p-6">
        <div className="flex items-start">
          <div className="p-2 bg-green-500 rounded-lg">
            <HiCheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Activas</p>
            <p className="text-2xl font-bold text-[#334C5D]">{stats.active}</p>
            <p className="text-xs text-gray-500">
              {stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% del total` : '0%'}
            </p>
          </div>
        </div>
      </Card>

      {/* Total Reservas */}
      <Card className="p-6">
        <div className="flex items-start">
          <div className="p-2 bg-blue-500 rounded-lg">
            <HiUsers className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Reservas</p>
            <p className="text-2xl font-bold text-[#334C5D]">{stats.totalBookings}</p>
            <p className="text-xs text-gray-500">
              {stats.total > 0 ? `${(stats.totalBookings / stats.total).toFixed(1)} por experiencia` : '0 por experiencia'}
            </p>
          </div>
        </div>
      </Card>

      {/* Ingresos Totales */}
      <Card className="p-6">
        <div className="flex items-start">
          <div className="p-2 bg-[#19A3A2] rounded-lg">
            <HiCurrencyDollar className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
            <p className="text-2xl font-bold text-[#334C5D]">
              ${stats.totalRevenue.toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-gray-500">
              {stats.totalBookings > 0 ? `$${(stats.totalRevenue / stats.totalBookings).toLocaleString('es-CO')} por reserva` : '$0 por reserva'}
            </p>
          </div>
        </div>
      </Card>

      {/* Calificación Promedio */}
      {stats.averageRating > 0 && (
        <Card className="p-6">
          <div className="flex items-start">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <HiStar className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Calificación Promedio</p>
              <p className="text-2xl font-bold text-[#334C5D]">
                {stats.averageRating.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.averageRating >= 4.5 ? 'Excelente' : 
                 stats.averageRating >= 4.0 ? 'Muy bueno' :
                 stats.averageRating >= 3.5 ? 'Bueno' :
                 stats.averageRating >= 3.0 ? 'Regular' : 'Necesita mejorar'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Estados Detallados */}
      <Card className="p-6 md:col-span-2 lg:col-span-3">
        <h3 className="text-lg font-semibold text-[#334C5D] mb-4">Estados de Experiencias</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Activas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <div className="text-sm text-gray-600">Borradores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.paused}</div>
            <div className="text-sm text-gray-600">Pausadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Inactivas</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
