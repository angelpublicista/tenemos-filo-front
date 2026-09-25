"use client";

import React from 'react';
import {
  DIAS,
  cruzaMedianoche,
  type ClaveDia,
  type HorarioSemanal as Horario,
} from '@/lib/company/horarios';

interface Props {
  valor: Horario;
  onChange: (h: Horario) => void;
  /** Cambia solo el titulo: el dato es el mismo. */
  abiertoAlPublico: boolean;
  disabled?: boolean;
}

/**
 * El horario de la semana, un tramo por dia.
 *
 * El mismo componente sirve para las dos preguntas —horario de atencion si la
 * sede esta abierta al publico, horario disponible para eventos si no— porque
 * lo que se pregunta es lo mismo: cuando se puede estar ahi. Solo cambia el
 * titulo, y las columnas se llaman "Desde"/"Hasta" en vez de
 * "Apertura"/"Cierre" cuando no es un local de cara al publico.
 */
export default function HorarioSemanal({
  valor,
  onChange,
  abiertoAlPublico,
  disabled = false,
}: Props) {
  const cambiar = (clave: ClaveDia, parche: Partial<Horario[ClaveDia]>) =>
    onChange({ ...valor, [clave]: { ...valor[clave], ...parche } });

  return (
    <div className="text-left">
      <h3 className="mb-1 text-lg font-medium text-gray-900">
        {abiertoAlPublico
          ? 'Horario de atención'
          : 'Horario disponible para experiencias o eventos'}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        {abiertoAlPublico
          ? 'Cuándo está abierta la sede al público.'
          : 'Cuándo se puede montar algo en la sede.'}
      </p>

      <div className="space-y-2">
        {DIAS.map((d) => {
          const dia = valor[d.clave];
          return (
            <div
              key={d.clave}
              className={`grid grid-cols-1 items-center gap-2 rounded-lg border px-3 py-2 sm:grid-cols-[minmax(0,8rem)_1fr] ${
                dia.isOpen ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dia.isOpen}
                  onChange={(e) => cambiar(d.clave, { isOpen: e.target.checked })}
                  disabled={disabled}
                  className="accent-[#F26726]"
                />
                <span className={dia.isOpen ? 'text-gray-900' : 'text-gray-500'}>
                  {d.nombre}
                </span>
              </label>

              {dia.isOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-gray-500">
                    {abiertoAlPublico ? 'Apertura' : 'Desde'}
                  </label>
                  <input
                    type="time"
                    value={dia.from}
                    onChange={(e) => cambiar(d.clave, { from: e.target.value })}
                    disabled={disabled}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                  />
                  <label className="text-xs text-gray-500">
                    {abiertoAlPublico ? 'Cierre' : 'Hasta'}
                  </label>
                  <input
                    type="time"
                    value={dia.to}
                    onChange={(e) => cambiar(d.clave, { to: e.target.value })}
                    disabled={disabled}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                  />
                  {/* Un bar que cierra a las 2 de la madrugada es un horario
                      normal; se confirma para que no parezca una errata. */}
                  {cruzaMedianoche(dia) && (
                    <span className="text-xs text-gray-500">cierra al día siguiente</span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
