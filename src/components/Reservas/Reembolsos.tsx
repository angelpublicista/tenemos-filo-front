"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'flowbite-react';
import Swal from 'sweetalert2';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  getReembolsos,
  marcarReembolsoPagado,
  registrarReembolso,
  type ReembolsosDeReserva,
} from '@/lib/sanity/reservationService';
import { formatearMientrasEscribe, pesos, soloElNumero } from '@/lib/dinero';

/**
 * Lo devuelto de una reserva, y la forma de devolver más (TR-30).
 *
 * Vive aquí y no en el formulario de edición porque un reembolso no es un
 * campo que se guarda: baja lo vendido y, con ello, la comisión de FILO y lo
 * que se le dispersa al anfitrión. Si el dinero del período ya salió, el
 * saldo queda en negativo y se descuenta de la siguiente transferencia.
 */

const cuando = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const DE_DONDE: Record<string, string> = {
  CANCELACION: 'Por la cancelación',
  BAJA_PARCIAL: 'Por una baja parcial',
  AJUSTE: 'Ajuste',
};

export default function Reembolsos({
  reservationId,
  onCambio,
}: {
  reservationId: string;
  onCambio?: () => void;
}) {
  const { showError, showSuccess } = useSweetAlert();
  const [datos, setDatos] = useState<ReembolsosDeReserva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await getReembolsos(reservationId));
    } catch {
      // Sin reembolsos que mostrar no se estorba al resto del formulario.
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const devolver = async () => {
    const maximo = datos?.cobrado ?? 0;
    if (maximo <= 0) {
      showError('No hay nada que devolver', 'Esta reserva no tiene dinero cobrado.');
      return;
    }

    const { value, isConfirmed } = await Swal.fire({
      title: 'Registrar un reembolso',
      html: `
        <div style="text-align:left;font-size:14px">
          <p style="margin:0 0 12px;color:#4b5563">
            Cobrado ${pesos(maximo)} · vendido ${pesos(datos?.vendido ?? 0)}
          </p>
          <label style="display:block;margin:8px 0 4px">Cuánto devuelves (COP)</label>
          <input id="importe" type="text" inputmode="numeric" class="swal2-input"
                 style="width:100%;margin:0" placeholder="0">
          <label style="display:block;margin:12px 0 4px">Motivo</label>
          <input id="motivo" type="text" class="swal2-input" style="width:100%;margin:0"
                 placeholder="Por qué se devuelve">
          <p style="margin:12px 0 0;font-size:12px;color:#6b7280">
            Baja lo vendido y la comisión que se cobra sobre ello. Si ya se te
            transfirió este período, se descuenta de la siguiente.
          </p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      // El importe se escribe con separadores de miles, como cualquier precio:
      // un campo de dinero donde «150000» no se lee obliga a contar ceros.
      didOpen: () => {
        const campo = document.getElementById('importe') as HTMLInputElement | null;
        if (campo) formatearMientrasEscribe(campo);
      },
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const importe = soloElNumero(g('importe')) ?? 0;
        const motivo = g('motivo').trim();
        if (!importe || importe <= 0 || importe > maximo) {
          Swal.showValidationMessage(`Entre ${pesos(1)} y ${pesos(maximo)}.`);
          return false;
        }
        if (!motivo) {
          Swal.showValidationMessage('Escribe el motivo: un reembolso sin motivo es un descuadre.');
          return false;
        }
        return { importe, motivo };
      },
    });
    if (!isConfirmed || !value) return;

    const v = value as { importe: number; motivo: string };
    setTrabajando(true);
    try {
      await registrarReembolso(reservationId, v.importe, v.motivo);
      await cargar();
      onCambio?.();
      showSuccess('Reembolso registrado', 'Ya está descontado de lo vendido.');
    } catch (err) {
      showError('No se pudo registrar', mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  const marcarPagado = async (refundId: string) => {
    setTrabajando(true);
    try {
      await marcarReembolsoPagado(reservationId, refundId);
      await cargar();
      onCambio?.();
    } catch (err) {
      showError('No se pudo marcar', mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) return null;

  const lista = datos?.reembolsos ?? [];

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Reembolsos</p>
          <p className="text-xs text-gray-500">
            {lista.length === 0
              ? 'No se ha devuelto nada de esta reserva.'
              : `${pesos(datos?.totalReembolsado ?? 0)} devueltos de ${pesos(
                  (datos?.cobrado ?? 0) + (datos?.totalReembolsado ?? 0),
                )} cobrados`}
          </p>
        </div>
        <Button size="xs" color="gray" onClick={devolver} disabled={trabajando}>
          Registrar reembolso
        </Button>
      </div>

      {lista.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {lista.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs dark:border-gray-700"
            >
              <span className="text-gray-700 dark:text-gray-300">
                <strong>{pesos(r.importe)}</strong> · {DE_DONDE[r.origen] ?? r.origen} ·{' '}
                {cuando(r.fecha)}
                {r.motivo ? ` · ${r.motivo}` : ''}
              </span>
              {r.estado === 'pagado' ? (
                <span className="text-green-700 dark:text-green-400">
                  Pagado{r.pagadoEl ? ` el ${cuando(r.pagadoEl)}` : ''}
                </span>
              ) : (
                <Button size="xs" color="gray" onClick={() => marcarPagado(r.id)} disabled={trabajando}>
                  Marcar como pagado
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
