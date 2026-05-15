import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Bloque base animado
const Base = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// ── Variantes ────────────────────────────────────────────────

// Tarjeta de estadística (dashboard, reservas)
export const SkeletonStatCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <Base className="h-3 w-28" />
        <Base className="h-7 w-16 mt-1" />
      </div>
      <Base className="h-12 w-12 rounded-lg shrink-0" />
    </div>
  </div>
);

// Fila de tabla
export const SkeletonTableRow = ({ cols = 5 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Base className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Tarjeta de experiencia / reserva
export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Base className="h-4 w-3/4" />
        <Base className="h-3 w-1/2" />
      </div>
      <Base className="h-6 w-20 rounded-full shrink-0 ml-3" />
    </div>
    <div className="grid grid-cols-3 gap-3 pt-1">
      <Base className="h-3" />
      <Base className="h-3" />
      <Base className="h-3" />
    </div>
    <div className="flex justify-between pt-1">
      <Base className="h-3 w-24" />
      <Base className="h-3 w-16" />
    </div>
  </div>
);

// Elemento de actividad reciente
export const SkeletonActivityItem = () => (
  <div className="flex items-start gap-3">
    <Base className="h-8 w-8 rounded-full shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Base className="h-3 w-3/4" />
      <Base className="h-3 w-1/2" />
    </div>
    <Base className="h-3 w-14 shrink-0" />
  </div>
);

// Texto genérico
export const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Base key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export default Base;
