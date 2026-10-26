"use client";

/**
 * Un campo para escribir dinero.
 *
 * Enseña la moneda y separa los miles con punto mientras se escribe, sin
 * decimales: es como se escribe un precio en Colombia, y un campo que acepta
 * «150000» pero enseña «150000» obliga a contar ceros para saber si son ciento
 * cincuenta mil o un millón y medio.
 *
 * Por dentro es texto, no `type="number"`: un input numérico no deja pintar los
 * puntos. El teclado numérico en el móvil se pide con `inputMode`.
 */

import React from 'react';
import { conSeparadores, soloElNumero } from '@/lib/dinero';

interface Props {
  id?: string;
  value: number | null | undefined;
  onChange: (valor: number | null) => void;
  /** Lo que se enseña cuando está vacío. Se escribe ya formateado. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  moneda?: string;
}

export default function PrecioInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className = '',
  moneda = 'COP',
  ...resto
}: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={conSeparadores(value ?? null)}
        onChange={(e) => onChange(soloElNumero(e.target.value))}
        placeholder={placeholder}
        aria-label={resto['aria-label']}
        className={`block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-7 pr-14 text-sm text-gray-900 focus:border-[#F26726] focus:ring-[#F26726] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${className}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
        {moneda}
      </span>
    </div>
  );
}
