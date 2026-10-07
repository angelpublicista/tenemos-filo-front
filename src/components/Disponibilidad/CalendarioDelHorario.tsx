"use client";

/**
 * El mes de un horario, para tocar fechas sueltas.
 *
 * El patrón semanal dice lo que pasa «todos los jueves», pero un negocio tiene
 * días que se salen: el 24 no se abre, el 31 solo la cena, el martes de la
 * boda está cerrado. Eso no cabe en un patrón, y hasta ahora no había dónde
 * decirlo: la vista semanal es buena para la regla y ciega para la excepción.
 *
 * Cada día pintado dice lo que de verdad va a pasar —lo que diga su excepción,
 * y si no, el patrón—, y al tocarlo se abre para cerrarlo, abrirlo o darle sus
 * propias franjas.
 */

import React, { useMemo, useState } from 'react';
import { Button } from 'flowbite-react';
import { AiOutlineDelete, AiOutlineLeft, AiOutlinePlus, AiOutlineRight } from 'react-icons/ai';
import type { AvailabilitySchedule, DaySchedule, Franja } from '@/types';

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CLAVES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const soloElDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** El lunes de la semana en que cae el 1 del mes, para empezar la cuadrícula. */
function primerLunes(mes: Date): Date {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const desplazamiento = (primero.getDay() + 6) % 7;
  primero.setDate(primero.getDate() - desplazamiento);
  return primero;
}

interface Props {
  schedule: AvailabilitySchedule;
  /** Guarda las excepciones. Devuelve cuando el API ya contestó. */
  onGuardar: (dateOverrides: Record<string, DaySchedule>) => Promise<void>;
}

export default function CalendarioDelHorario({ schedule, onGuardar }: Props) {
  const [mes, setMes] = useState(() => new Date());
  const [elegido, setElegido] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<DaySchedule | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sueltas = useMemo(() => schedule.dateOverrides ?? {}, [schedule.dateOverrides]);

  /** Lo que de verdad pasa ese día: su excepción si la hay, o el patrón. */
  const comoQueda = (d: Date): { dia: DaySchedule | undefined; esSuelta: boolean } => {
    const suelta = sueltas[soloElDia(d)];
    if (suelta) return { dia: suelta, esSuelta: true };
    return { dia: schedule.weeklySchedule?.[CLAVES[(d.getDay() + 6) % 7]!], esSuelta: false };
  };

  /** TR-35. Fuera de vigencia el horario no ofrece nada, diga lo que diga. */
  const rige = (d: Date): boolean => {
    const clave = soloElDia(d);
    if (schedule.validFrom && clave < schedule.validFrom) return false;
    if (schedule.validUntil && clave > schedule.validUntil) return false;
    return true;
  };

  const dias = useMemo(() => {
    const inicio = primerLunes(mes);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [mes]);

  const abrirDia = (d: Date) => {
    const clave = soloElDia(d);
    const { dia } = comoQueda(d);
    setElegido(clave);
    // Se parte de lo que hoy pasa ese día: lo normal es cambiar una cosa, no
    // escribirlo todo de cero.
    setBorrador({
      isActive: dia?.isActive ?? false,
      franjas: (dia?.franjas ?? dia?.timeSlots ?? []).map((f) => ({ ...f })),
    });
  };

  const guardar = async (quitar = false) => {
    if (!elegido) return;
    const siguientes = { ...sueltas };
    if (quitar) delete siguientes[elegido];
    else siguientes[elegido] = borrador ?? { isActive: false, franjas: [] };
    setGuardando(true);
    try {
      await onGuardar(siguientes);
      setElegido(null);
      setBorrador(null);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarFranja = (i: number, campo: keyof Franja, valor: string) => {
    setBorrador((prev) => {
      if (!prev) return prev;
      const franjas = prev.franjas.map((f, j) =>
        j === i
          ? { ...f, [campo]: campo === 'cupos' ? (valor === '' ? null : Number(valor)) : valor }
          : f,
      );
      return { ...prev, franjas };
    });
  };

  const hoy = soloElDia(new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Mes anterior"
        >
          <AiOutlineLeft />
        </button>
        <p className="font-semibold text-gray-900 capitalize">
          {mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Mes siguiente"
        >
          <AiOutlineRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {DIAS_CORTOS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map((d) => {
          const clave = soloElDia(d);
          const deEsteMes = d.getMonth() === mes.getMonth();
          const { dia, esSuelta } = comoQueda(d);
          const vigente = rige(d);
          const abierto = vigente && !!dia?.isActive;
          const franjas = (dia?.franjas ?? dia?.timeSlots ?? []).length;

          return (
            <button
              key={clave}
              type="button"
              onClick={() => abrirDia(d)}
              className={`min-h-[62px] rounded-lg border p-1.5 text-left transition-colors ${
                !deEsteMes ? 'opacity-40' : ''
              } ${
                !vigente
                  ? 'border-gray-100 bg-gray-50 text-gray-400'
                  : abierto
                    ? 'border-green-200 bg-green-50 hover:border-green-400'
                    : 'border-gray-200 bg-white hover:border-gray-400'
              } ${elegido === clave ? 'ring-2 ring-[#F26726]' : ''}`}
            >
              <span
                className={`text-xs font-semibold ${
                  clave === hoy ? 'text-[#F26726]' : 'text-gray-700'
                }`}
              >
                {d.getDate()}
              </span>
              <span className="block text-[10px] leading-tight mt-0.5">
                {!vigente ? (
                  <span className="text-gray-400">fuera de vigencia</span>
                ) : abierto ? (
                  <span className="text-green-700">
                    {franjas} {franjas === 1 ? 'franja' : 'franjas'}
                  </span>
                ) : (
                  <span className="text-gray-400">cerrado</span>
                )}
              </span>
              {esSuelta && vigente && (
                <span className="block text-[10px] text-amber-600 leading-tight">a mano</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Verde: abierto. Toca un día para cerrarlo, abrirlo o darle sus propias franjas. «A mano»
        marca los que se salen del patrón semanal.
      </p>

      {elegido && borrador && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-gray-900">
              {new Date(`${elegido}T12:00:00`).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            {sueltas[elegido] && (
              <Button
                size="xs"
                color="light"
                disabled={guardando}
                onClick={() => void guardar(true)}
              >
                Volver al patrón
              </Button>
            )}
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={borrador.isActive}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  isActive: e.target.checked,
                  // Abrir un día sin franjas no sirve de nada: se arranca con
                  // una, que es lo que el anfitrión iba a poner de todos modos.
                  franjas:
                    e.target.checked && borrador.franjas.length === 0
                      ? [{ startTime: '12:00', endTime: '16:00', cupos: 10 }]
                      : borrador.franjas,
                })
              }
              className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
            />
            <span className="text-sm text-gray-700">Abierto este día</span>
          </label>

          {borrador.isActive && (
            <div className="space-y-2">
              {borrador.franjas.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={f.startTime}
                    onChange={(e) => cambiarFranja(i, 'startTime', e.target.value)}
                    className="flex-1 min-w-[110px] px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={f.endTime}
                    onChange={(e) => cambiarFranja(i, 'endTime', e.target.value)}
                    className="flex-1 min-w-[110px] px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    min="1"
                    aria-label="Cupos de esta franja"
                    value={f.cupos ?? ''}
                    onChange={(e) => cambiarFranja(i, 'cupos', e.target.value)}
                    placeholder="Cupos *"
                    className={`w-[92px] px-3 py-2 border rounded-lg ${
                      f.cupos ? 'border-gray-300' : 'border-red-400 bg-red-50'
                    }`}
                  />
                  {borrador.franjas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setBorrador({
                          ...borrador,
                          franjas: borrador.franjas.filter((_, j) => j !== i),
                        })
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Quitar esta franja"
                    >
                      <AiOutlineDelete />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const ultima = borrador.franjas[borrador.franjas.length - 1];
                  setBorrador({
                    ...borrador,
                    franjas: [
                      ...borrador.franjas,
                      {
                        startTime: ultima ? ultima.endTime : '12:00',
                        endTime: '20:00',
                        cupos: ultima?.cupos ?? 10,
                      },
                    ],
                  });
                }}
                className="text-sm text-[#F26726] hover:underline flex items-center gap-1"
              >
                <AiOutlinePlus /> Agregar franja
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              size="sm"
              color="light"
              onClick={() => {
                setElegido(null);
                setBorrador(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={guardando || (borrador.isActive && borrador.franjas.some((f) => !f.cupos))}
              onClick={() => void guardar()}
              className="bg-[#F26726] hover:bg-[#d9551c]"
            >
              {guardando ? 'Guardando…' : 'Guardar este día'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
