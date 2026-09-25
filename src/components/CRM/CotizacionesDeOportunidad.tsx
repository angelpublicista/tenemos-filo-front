"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HiCheckCircle, HiPaperAirplane, HiPlus } from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  cotizacionesDeOportunidad,
  marcarCotizacionEnviada,
  type CotizacionDeOportunidad,
} from '@/lib/sanity/quoteService';

interface Props {
  opportunityId: string;
  /** Para saber si ofrecer "enviar enlace de catálogo" en vez de cotizar. */
  esAbierta?: boolean;
  onCambio?: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

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
