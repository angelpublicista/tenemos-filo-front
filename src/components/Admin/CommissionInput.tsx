"use client";

import React from 'react';
import { Select, TextInput } from 'flowbite-react';
import type { CommissionType } from '@/lib/api/admin';

type Props = {
  etiqueta: string;
  ayuda?: string;
  tipo: CommissionType | null;
  valor: number | null;
  /** Si se pasa, se ofrece la opción de heredar el valor de la plataforma. */
  heredable?: { texto: string };
  onChange: (tipo: CommissionType | null, valor: number | null) => void;
};

/**
 * Par tipo + valor de una comisión.
 *
 * Con `heredable`, el desplegable añade "Heredar": elegirlo manda null en
 * ambos campos, que es como el API vuelve al valor por defecto.
 */
export default function CommissionInput({
  etiqueta,
  ayuda,
  tipo,
  valor,
  heredable,
  onChange,
}: Props) {
  const hereda = tipo === null;

  const cambiarTipo = (v: string) => {
    if (v === 'INHERIT') return onChange(null, null);
    // Al pasar de heredado a propio arrancamos en 0, no en null: el API
    // exige tipo y valor juntos.
    onChange(v as CommissionType, valor ?? 0);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{etiqueta}</label>
      <div className="flex gap-2">
        <Select
          value={hereda ? 'INHERIT' : tipo}
          onChange={(e) => cambiarTipo(e.target.value)}
          className="w-44"
        >
          {heredable && <option value="INHERIT">Heredar</option>}
          <option value="PERCENT">Porcentaje</option>
          <option value="FIXED">Monto fijo</option>
        </Select>
        <div className="relative flex-1">
          <TextInput
            type="number"
            min={0}
            max={tipo === 'PERCENT' ? 100 : undefined}
            value={hereda ? '' : String(valor ?? 0)}
            disabled={hereda}
            onChange={(e) => onChange(tipo, e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder={hereda ? heredable?.texto : '0'}
          />
          {!hereda && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {tipo === 'PERCENT' ? '%' : 'COP'}
            </span>
          )}
        </div>
      </div>
      {ayuda && <p className="text-xs text-gray-500 mt-1">{ayuda}</p>}
      {tipo === 'PERCENT' && (valor ?? 0) > 100 && (
        <p className="text-xs text-red-600 mt-1">Un porcentaje no puede ser mayor que 100</p>
      )}
    </div>
  );
}
