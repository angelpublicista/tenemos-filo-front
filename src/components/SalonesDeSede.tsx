"use client";

import React from 'react';
import { HiPlus, HiTrash } from 'react-icons/hi';
import GaleriaDeFotos from './GaleriaDeFotos';

export interface Salon {
  /** Solo si ya existe. Se conserva y se reenvía: sin él el API lo tomaría
   *  por nuevo y le cambiaría el identificador en cada guardado. */
  id?: string;
  name: string;
  description?: string;
  /** Texto mientras se escribe; se convierte a número al guardar. */
  maxCapacity: string;
  photos: string[];
  isActive: boolean;
}

export const MAX_SALONES = 30;

export function salonVacio(): Salon {
  return { name: '', description: '', maxCapacity: '', photos: [], isActive: true };
}

/** Qué le falta a un salón para poder guardarse, o null. */
export function errorDeSalon(s: Salon): string | null {
  if (!s.name.trim()) return 'Falta el nombre del salón';
  const cap = Number(s.maxCapacity);
  if (!s.maxCapacity.trim() || !Number.isInteger(cap) || cap < 1) {
    return 'La capacidad máxima debe ser un número de al menos 1';
  }
  return null;
}

interface Props {
  valor: Salon[];
  onChange: (salones: Salon[]) => void;
  mostrarErrores?: boolean;
  disabled?: boolean;
}

/**
 * Los salones de una sede.
 *
 * Solo lo que se pidió: nombre, descripción, capacidad, fotos y activo. NO hay
 * capacidades por montaje —auditorio, cóctel, escuela, imperial— ni planos.
 * Eso es otro producto; meterlo aquí sin necesitarlo llenaría el formulario de
 * campos que nadie rellena.
 *
 * Un salón inactivo se atenúa pero se sigue editando: desactivar es decir "hoy
 * no se usa", no "ya no me interesa", y esconderlo obligaría a reactivarlo solo
 * para corregir una errata.
 */
export default function SalonesDeSede({
  valor,
  onChange,
  mostrarErrores = false,
  disabled = false,
}: Props) {
  const cambiar = (i: number, parche: Partial<Salon>) =>
    onChange(valor.map((s, j) => (j === i ? { ...s, ...parche } : s)));

  return (
    <div className="space-y-4 text-left">
      {valor.map((s, i) => {
        const error = mostrarErrores ? errorDeSalon(s) : null;
        return (
          <div
            key={s.id ?? i}
            className={`rounded-xl border p-4 transition-opacity ${
              error ? 'border-red-300' : 'border-gray-200'
            } ${s.isActive ? '' : 'opacity-70'}`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.isActive}
                  onChange={(e) => cambiar(i, { isActive: e.target.checked })}
                  disabled={disabled}
                  className="accent-[#F26726]"
                />
                <span className={s.isActive ? 'text-gray-700' : 'text-gray-500'}>
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => onChange(valor.filter((_, j) => j !== i))}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                <HiTrash className="h-3.5 w-3.5" />
                Quitar salón
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,9rem)]">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre del salón <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => cambiar(i, { name: e.target.value })}
                  disabled={disabled}
                  placeholder="Ej: Salón Principal"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Capacidad máxima <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={s.maxCapacity}
                  onChange={(e) => cambiar(i, { maxCapacity: e.target.value })}
                  disabled={disabled}
                  placeholder="Ej: 80"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                rows={2}
                value={s.description ?? ''}
                onChange={(e) => cambiar(i, { description: e.target.value })}
                disabled={disabled}
                placeholder="Para qué se usa, qué tiene, cómo se accede…"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fotos del salón
              </label>
              <GaleriaDeFotos
                valor={s.photos}
                onChange={(photos) => cambiar(i, { photos })}
                disabled={disabled}
                queEs="el salón"
              />
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...valor, salonVacio()])}
        disabled={disabled || valor.length >= MAX_SALONES}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F26726] px-4 py-2 text-sm text-[#F26726] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <HiPlus className="h-4 w-4" />
        Agregar salón
      </button>

      {valor.length === 0 && (
        <p className="text-sm text-gray-500">
          Añade cada espacio que se pueda reservar por separado.
        </p>
      )}
    </div>
  );
}
