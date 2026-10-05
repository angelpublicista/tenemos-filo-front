"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'flowbite-react';
import Swal from 'sweetalert2';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  getHistorial,
  registrarCargoAdicional,
  type HistorialDeReserva as Historial,
} from '@/lib/sanity/reservationService';

/**
 * Qué le fue pasando a esta reserva (TR-39) y los cargos de más (TR-12).
 *
 * Una reserva editada o reagendada sigue siendo la misma —mismo número— y eso
 * solo sirve de algo si se puede ver qué le pasó. Es lo que hay que mirar
 * cuando un cliente llama a reclamar que su reserva era otro día.
 *
 * Los cargos van aquí y no en el precio porque el precio original no se
 * recalcula: lo vendido es lo vendido, y un cambio de fecha o de cantidad no
 * mueve el dinero por su cuenta.
 */

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Un valor del historial en algo legible: las fechas vienen en ISO. */
function legible(v: string | null): string {
  if (!v) return '—';
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return cuando(v);
  return v;
}

interface Linea {
  fecha: string;
  texto: string;
  quien?: string | null;
}

function aLineas(h: Historial): Linea[] {
  const lineas: Linea[] = [{ fecha: h.creada, texto: 'Se creó la reserva' }];

  for (const c of h.cambios ?? []) {
    lineas.push({
      fecha: c.fecha,
      quien: c.quien,
      texto:
        c.campo === 'cargo adicional'
          ? `Cargo adicional${c.motivo ? `: ${c.motivo}` : ''}`
          : `${c.campo}: ${legible(c.antes)} → ${legible(c.despues)}${
              c.motivo ? ` · ${c.motivo}` : ''
            }`,
    });
  }

  for (const b of h.bajasParciales ?? []) {
    lineas.push({
      fecha: b.fecha,
      texto: `Se dieron de baja ${b.personas} ${b.personas === 1 ? 'persona' : 'personas'}${
        b.motivo ? ` · ${b.motivo}` : ''
      }`,
    });
  }

  for (const r of h.reembolsos ?? []) {
    lineas.push({
      fecha: r.fecha,
      texto: `Reembolso de ${pesos(r.importe)}${r.motivo ? ` · ${r.motivo}` : ''}`,
    });
  }

  if (h.cancelacion) {
    lineas.push({
      fecha: h.cancelacion.cancelledAt,
      texto: `Cancelada por ${
        h.cancelacion.cancelledBy === 'host' ? 'el anfitrión' : 'el comensal'
      }${h.cancelacion.cancellationReason ? ` · ${h.cancelacion.cancellationReason}` : ''}`,
    });
  }

  // Lo más reciente arriba: es lo que se viene a mirar.
  return lineas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export default function HistorialDeReserva({
  reservationId,
  onCambio,
}: {
  reservationId: string;
  onCambio?: () => void;
}) {
  const { showError, showSuccess } = useSweetAlert();
  const [h, setH] = useState<Historial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setH(await getHistorial(reservationId));
    } catch {
      setH(null);
    } finally {
      setCargando(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cobrarMas = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Cobrar algo más',
      html: `
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">Cuánto</label>
          <input id="importe" type="number" min="1" class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:12px 0 4px">Concepto</label>
          <input id="concepto" type="text" class="swal2-input" style="width:100%;margin:0"
                 placeholder="Ej: dos botellas de vino de más">
          <p style="margin:12px 0 0;font-size:12px;color:#6b7280">
            Suma al total de la reserva y queda pendiente de cobro. El precio
            original no se toca.
          </p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const importe = Number(g('importe'));
        const concepto = g('concepto').trim();
        if (!importe || importe <= 0) {
          Swal.showValidationMessage('Indica cuánto se cobra de más.');
          return false;
        }
        if (!concepto) {
          Swal.showValidationMessage('Escribe el concepto: el comensal va a preguntar.');
          return false;
        }
        return { importe, concepto };
      },
    });
    if (!isConfirmed || !value) return;

    const v = value as { importe: number; concepto: string };
    setTrabajando(true);
    try {
      await registrarCargoAdicional(reservationId, v.importe, v.concepto);
      await cargar();
      onCambio?.();
      showSuccess('Cargo registrado', 'Ya suma al total de la reserva.');
    } catch (err) {
      showError('No se pudo registrar', mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) return null;

  const lineas = h ? aLineas(h) : [];
  const cargos = h?.cargosAdicionales ?? [];

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Historial y cargos
          </p>
          <p className="text-xs text-gray-500">
            {lineas.length <= 1
              ? 'Sin cambios desde que se creó.'
              : `${lineas.length - 1} ${lineas.length - 1 === 1 ? 'cambio' : 'cambios'}`}
            {cargos.length > 0 &&
              ` · ${pesos(cargos.reduce((s, c) => s + c.importe, 0))} en cargos adicionales`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="xs" color="gray" onClick={cobrarMas} disabled={trabajando}>
            Cobrar algo más
          </Button>
          {lineas.length > 1 && (
            <Button size="xs" color="gray" onClick={() => setAbierto((v) => !v)}>
              {abierto ? 'Ocultar' : 'Ver historial'}
            </Button>
          )}
        </div>
      </div>

      {abierto && (
        <ul className="mt-3 flex flex-col gap-2">
          {lineas.map((l, i) => (
            <li
              key={`${l.fecha}-${i}`}
              className="border-t border-gray-100 pt-2 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              <span className="text-gray-500">{cuando(l.fecha)}</span> · {l.texto}
              {l.quien && <span className="text-gray-500"> · {l.quien}</span>}
            </li>
          ))}
        </ul>
      )}

      {cargos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {cargos.map((c) => (
            <li key={c.id} className="text-xs text-gray-700 dark:text-gray-300">
              <strong>{pesos(c.importe)}</strong> · {c.concepto} ·{' '}
              <span className="text-gray-500">
                {c.estado === 'cobrado' ? 'cobrado' : 'pendiente de cobro'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
