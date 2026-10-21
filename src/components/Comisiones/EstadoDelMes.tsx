"use client";

import React from 'react';
import { Badge } from 'flowbite-react';
import type { EstadoDelMes } from '@/lib/api/fees';

const ESTADOS: Record<EstadoDelMes, { texto: string; color: string }> = {
  EN_CURSO: { texto: 'En curso', color: 'gray' },
  PENDIENTE: { texto: 'Por pagar', color: 'warning' },
  PARCIAL: { texto: 'Pago parcial', color: 'info' },
  PAGADO: { texto: 'Pagado', color: 'success' },
};

/** "2026-10" → "octubre de 2026". */
export function nombreDelMes(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

/** La etiqueta del estado de un mes, igual para el admin y para el anfitrión. */
export default function EstadoDelMesBadge({ estado }: { estado: EstadoDelMes }) {
  const { texto, color } = ESTADOS[estado];
  return (
    <Badge color={color} className="w-fit">
      {texto}
    </Badge>
  );
}
