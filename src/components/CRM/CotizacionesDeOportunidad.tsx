"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HiCheckCircle, HiPaperAirplane, HiPlus } from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';
import { mensajeDeError } from '@/lib/api/client';
import {
  cotizacionesDeOportunidad,
  elegirOpcionDeCotizacion,
  guardarOpcionesDeCotizacion,
  marcarCotizacionEnviada,
  type CotizacionDeOportunidad,
  type OpcionDeCotizacion,
} from '@/lib/sanity/quoteService';

interface Props {
  opportunityId: string;
  /** Para saber si ofrecer "enviar enlace de catálogo" en vez de cotizar. */
  esAbierta?: boolean;
  onCambio?: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/** Lo que hay que escribir de una opción, en el orden en que se piensa. */
const CAMPOS = [
  { id: 'label', etiqueta: 'Cómo la llamas', tipo: 'text', ayuda: 'Ej: Terraza, sábado' },
  { id: 'eventDate', etiqueta: 'Fecha', tipo: 'date', ayuda: '' },
  { id: 'eventTime', etiqueta: 'Hora', tipo: 'time', ayuda: '' },
  { id: 'guests', etiqueta: 'Personas', tipo: 'number', ayuda: '' },
  { id: 'total', etiqueta: 'Valor', tipo: 'number', ayuda: 'Lo acordado para esta opción' },
] as const;

/**
 * Las cotizaciones de una oportunidad, con su historial.
 *
 * Todas se conservan y se ven. La VIGENTE es la enviada de versión más alta, y
 * viene marcada por el API: aquí no se vuelve a decidir cuál manda, porque dos
 * criterios acaban discrepando.
 *
 * Crear una cotización no mueve la oportunidad; marcarla enviada sí. Son dos
 * momentos distintos y el botón lo dice: se puede armar una propuesta y
 * mandarla tres días después.
 */
export default function CotizacionesDeOportunidad({
  opportunityId,
  esAbierta = false,
  onCambio,
}: Props) {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [items, setItems] = useState<CotizacionDeOportunidad[]>([]);
  const [vigenteId, setVigenteId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await cotizacionesDeOportunidad(opportunityId);
      setItems(r.items);
      setVigenteId(r.vigenteId);
    } catch (err) {
      console.error('Error cargando cotizaciones:', err);
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * TR-14. Las opciones se editan juntas, no de a una.
   *
   * Son tres como máximo y se piensan a la vez —«el sábado o el domingo»—, así
   * que editarlas por separado obligaría a tres pasos para un cambio que es
   * uno. Lo que el cliente ya eligió se conserva por posición.
   */
  const editarOpciones = async (q: CotizacionDeOportunidad) => {
    const previas = q.options ?? [];
    const valorDe = (i: number, campo: string): string => {
      const op = previas[i] as unknown as Record<string, unknown> | undefined;
      const v = op?.[campo];
      if (v === null || v === undefined) return '';
      if (campo === 'eventDate') return String(v).slice(0, 10);
      return String(v);
    };

    const bloque = (i: number) => `
      <fieldset style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:10px">
        <legend style="font-size:12px;color:#6b7280;padding:0 4px">Opción ${i + 1}</legend>
        ${CAMPOS.map(
          (c) => `
          <label style="display:block;margin:6px 0 2px;font-size:12px">${c.etiqueta}</label>
          <input id="${c.id}-${i}" type="${c.tipo}" value="${valorDe(i, c.id)}"
                 class="swal2-input" style="width:100%;margin:0;font-size:13px"
                 placeholder="${c.ayuda}">`,
        ).join('')}
      </fieldset>`;

    const { value, isConfirmed } = await Swal.fire({
      title: 'Opciones de la propuesta',
      html: `
        <div style="text-align:left;font-size:14px;max-height:55vh;overflow:auto">
          <p style="margin:0 0 10px;color:#4b5563">
            Hasta tres alternativas a la vez. Deja una en blanco si no la usas.
          </p>
          ${[0, 1, 2].map(bloque).join('')}
        </div>`,
      width: 560,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () => {
        const g = (id: string) =>
          (document.getElementById(id) as HTMLInputElement | null)?.value?.trim() ?? '';
        const opciones = [0, 1, 2]
          .map((i) => ({
            label: g(`label-${i}`) || undefined,
            eventDate: g(`eventDate-${i}`) || undefined,
            eventTime: g(`eventTime-${i}`) || undefined,
            guests: g(`guests-${i}`) ? Number(g(`guests-${i}`)) : undefined,
            total: g(`total-${i}`) ? Number(g(`total-${i}`)) : undefined,
          }))
          // Una opción vacía no es una opción: se descarta sin avisar, que es
          // lo que significa dejarla en blanco.
          .filter((o) => o.label || o.eventDate || o.total);
        if (opciones.length === 0) {
          Swal.showValidationMessage('Escribe al menos una opción.');
          return false;
        }
        return opciones;
      },
    });
    if (!isConfirmed || !value) return;

    setEnviando(q.id);
    try {
      await guardarOpcionesDeCotizacion(q.id, value as Parameters<typeof guardarOpcionesDeCotizacion>[1]);
      await cargar();
      onCambio?.();
      showSuccess('Opciones guardadas', '');
    } catch (err) {
      showError('No se pudieron guardar', mensajeDeError(err));
    } finally {
      setEnviando(null);
    }
  };

  const elegir = async (q: CotizacionDeOportunidad, op: OpcionDeCotizacion) => {
    setEnviando(q.id);
    try {
      await elegirOpcionDeCotizacion(q.id, op.id, !op.chosenAt);
      await cargar();
      onCambio?.();
    } catch (err) {
      showError('No se pudo marcar', mensajeDeError(err));
    } finally {
      setEnviando(null);
    }
  };

  const enviar = async (q: CotizacionDeOportunidad) => {
    const ok = await showConfirmation(
      `¿Marcar la versión ${q.version} como enviada?`,
      '',
      'Sí, ya la envié',
      'Cancelar',
      [
        'La oportunidad pasará a "Propuesta enviada" y esta versión quedará como',
        'la vigente. Las anteriores se conservan en el historial.',
      ],
    );
    if (!ok) return;

    setEnviando(q.id);
    try {
      await marcarCotizacionEnviada(q.id);
      await cargar();
      onCambio?.();
      showSuccess('Marcada como enviada', 'La oportunidad pasó a Propuesta enviada.');
    } catch (err) {
      console.error('Error marcando la cotización:', err);
      showError('No pudimos marcarla', 'Inténtalo de nuevo.');
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cotizaciones</h3>
          <p className="text-xs text-gray-500">
            {esAbierta
              ? 'En una experiencia abierta suele bastar con enviar el enlace del catálogo.'
              : 'Se conservan todas las versiones. La vigente es la última que enviaste.'}
          </p>
        </div>
        <Link
          href={`/dashboard/crm/cotizaciones?oportunidad=${opportunityId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F26726] px-3 py-1.5 text-sm text-[#F26726] transition-colors hover:bg-orange-50"
        >
          <HiPlus className="h-4 w-4" />
          Nueva cotización
        </Link>
      </div>

      {cargando ? (
        <p className="py-4 text-sm text-gray-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">
          Todavía no hay cotizaciones. Puedes crear una sin fecha ni hora: basta
          con la cantidad de personas.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((q) => {
            const esVigente = q.id === vigenteId;
            return (
              <li
                key={q.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                  esVigente
                    ? 'border-[#F26726] bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Versión {q.version}
                    {esVigente && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F26726] px-2 py-0.5 text-[10px] font-semibold text-white">
                        <HiCheckCircle className="h-3 w-3" />
                        Vigente
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[
                      q.guests ? `${q.guests} personas` : null,
                      // Sin fecha se dice: es una propuesta sujeta a
                      // disponibilidad, no un dato que falte por error.
                      q.eventDate ? fecha(q.eventDate) : 'sin fecha definida',
                      q.sentAt
                        ? `enviada el ${fecha(q.sentAt)}${q.sentVia === 'EXTERNO' ? ' (por fuera)' : ''}`
                        : 'sin enviar',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                {/* TR-14. Las opciones que se le pusieron sobre la mesa.
                    Hasta tres y simultáneas: el cliente elige una o varias, y
                    cada elegida autoriza una reserva. */}
                <div className="w-full">
                  {(q.options ?? []).length > 0 && (
                    <ul className="mb-2 flex flex-col gap-1 border-t border-gray-100 pt-2 dark:border-gray-700">
                      {(q.options ?? []).map((op) => (
                        <li
                          key={op.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>{op.label || `Opción ${op.position}`}</strong>
                            {op.eventDate ? ` · ${fecha(op.eventDate)}` : ''}
                            {op.eventTime ? ` ${op.eventTime}` : ''}
                            {op.experience?.title ? ` · ${op.experience.title}` : ''}
                            {op.total ? ` · ${pesos(Number(op.total))}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => elegir(q, op)}
                            disabled={enviando === q.id}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                              op.chosenAt
                                ? 'bg-green-600 text-white'
                                : 'border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {op.chosenAt ? 'La eligió' : 'Marcar elegida'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => editarOpciones(q)}
                    disabled={enviando === q.id}
                    className="text-xs text-[#F26726] hover:underline"
                  >
                    {(q.options ?? []).length > 0
                      ? 'Editar opciones'
                      : 'Poner opciones (hasta 3)'}
                  </button>
                </div>

                {!q.sentAt && (
                  <button
                    type="button"
                    onClick={() => enviar(q)}
                    disabled={enviando === q.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                  >
                    <HiPaperAirplane className="h-3.5 w-3.5" />
                    {enviando === q.id ? 'Marcando…' : 'Marcar enviada'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
