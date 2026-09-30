"use client";

import React, { useState } from 'react';
import { Button } from 'flowbite-react';
import Swal from 'sweetalert2';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  MOTIVOS_DE_PERDIDA,
  autorizarCondicionDePago,
  confirmarVenta,
  crearPreReserva,
  faltaParaConfirmar,
  perderOportunidad,
  registrarPago,
  type ReservaDeOportunidad,
} from '@/lib/crm/venta';
import type { Experience } from '@/types';

interface Props {
  opportunityId: string;
  experienceKind: 'ABIERTA' | 'PRIVADA' | null;
  status: string;
  reservations?: ReservaDeOportunidad[];
  condicionDePago?: string | null;
  experiencias: Experience[];
  onCambio: () => void;
}

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * El tramo final: apartar el espacio, cobrar y cerrar.
 *
 * Solo se ofrece lo que aplica en cada momento. Una experiencia abierta no
 * tiene pre-reserva —sus cupos se pagan enteros—, y una oportunidad cerrada no
 * tiene nada que hacer aquí salvo mirarse.
 *
 * Las reglas de cuánto hay que cobrar las decide el API. Lo de aquí solo sirve
 * para que el botón diga cuánto falta en lugar de fallar sin explicar.
 */
export default function GestionDeVenta({
  opportunityId,
  experienceKind,
  status,
  reservations = [],
  condicionDePago,
  experiencias,
  onCambio,
}: Props) {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [trabajando, setTrabajando] = useState(false);

  const esAbierta = experienceKind === 'ABIERTA';
  const abierta = status === 'OPEN' || status === 'open';
  const reserva = reservations.find((r) => r.status === 'PRE_RESERVED' || r.status === 'CONFIRMED');
  const preReservada = reserva?.status === 'PRE_RESERVED';
  const { total, pagado, falta } = faltaParaConfirmar(reserva, esAbierta);

  const conError = async (fn: () => Promise<unknown>, exito: string) => {
    setTrabajando(true);
    try {
      await fn();
      onCambio();
      showSuccess(exito, '');
    } catch (err) {
      // El API explica por qué no se puede —cuánto falta, qué condición—, así
      // que su mensaje vale más que uno genérico nuestro.
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo completar', msg || 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  const apartar = async () => {
    if (experiencias.length === 0) {
      showError('No tienes experiencias', 'Crea una experiencia antes de apartar un espacio.');
      return;
    }
    const { value, isConfirmed } = await Swal.fire({
      title: 'Apartar el espacio',
      html: `
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">Experiencia</label>
          <select id="exp" class="swal2-input" style="width:100%;margin:0">
            ${experiencias.map((e) => `<option value="${e._id}">${e.title}</option>`).join('')}
          </select>
          <label style="display:block;margin:8px 0 4px">Fecha y hora</label>
          <input id="fecha" type="datetime-local" class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:8px 0 4px">Personas</label>
          <input id="pax" type="number" min="1" value="10" class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:8px 0 4px">Valor acordado (COP)</label>
          <input id="total" type="number" min="0" class="swal2-input" style="width:100%;margin:0">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Apartar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const fecha = g('fecha');
        const pax = Number(g('pax'));
        const tot = Number(g('total'));
        if (!fecha) return Swal.showValidationMessage('Indica la fecha');
        if (!pax || pax < 1) return Swal.showValidationMessage('Indica cuántas personas');
        if (!tot || tot <= 0) return Swal.showValidationMessage('Indica el valor acordado');
        return { experienceId: g('exp'), reservationDate: new Date(fecha).toISOString(), participants: pax, total: tot };
      },
    });
    if (!isConfirmed || !value) return;
    await conError(
      () => crearPreReserva(opportunityId, value as never),
      'Espacio apartado. Queda bloqueado hasta que confirmes o cierres.',
    );
  };

  const abonar = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Registrar un abono',
      input: 'number',
      inputLabel: total > 0 ? `Lleva pagado ${pesos(pagado)} de ${pesos(total)}` : 'Monto recibido',
      inputAttributes: { min: '1' },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
    });
    if (!isConfirmed || !value) return;
    await conError(() => registrarPago(opportunityId, Number(value)), 'Abono registrado');
  };

  const autorizar = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: '¿Qué se acordó?',
      input: 'text',
      inputPlaceholder: 'Ej: orden de compra 4501 a 30 días',
      text: 'Quedará registrado que tú autorizaste esta condición.',
      showCancelButton: true,
      confirmButtonText: 'Autorizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
    });
    if (!isConfirmed || !value) return;
    await conError(
      () => autorizarCondicionDePago(opportunityId, String(value)),
      'Condición autorizada',
    );
  };

  const confirmar = async () => {
    const ok = await showConfirmation(
      '¿Confirmar la venta?',
      '',
      'Sí, confirmar',
      'Cancelar',
      [
        'La reserva quedará confirmada y la oportunidad pasará a Ganado cerrado.',
        'El espacio sigue bloqueado.',
      ],
    );
    if (!ok) return;
    await conError(() => confirmarVenta(opportunityId), 'Venta confirmada');
  };

  const perder = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Cerrar como perdida',
      html: `
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">Motivo</label>
          <select id="motivo" class="swal2-input" style="width:100%;margin:0">
            ${MOTIVOS_DE_PERDIDA.map((m) => `<option value="${m.valor}">${m.etiqueta}</option>`).join('')}
          </select>
          <label style="display:block;margin:8px 0 4px">Detalle (opcional)</label>
          <input id="notas" class="swal2-input" style="width:100%;margin:0" placeholder="Qué pasó exactamente">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Cerrar como perdida',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      preConfirm: () => ({
        motivo: (document.getElementById('motivo') as HTMLSelectElement)?.value,
        notas: (document.getElementById('notas') as HTMLInputElement)?.value || undefined,
      }),
    });
    if (!isConfirmed || !value) return;
    const v = value as { motivo: string; notas?: string };
    await conError(
      () => perderOportunidad(opportunityId, v.motivo, v.notas),
      'Oportunidad cerrada. El espacio apartado quedó libre.',
    );
  };

  if (!abierta) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Venta</h3>
        <p className="mt-1 text-sm text-gray-500">
          Esta oportunidad ya está cerrada. Su historial se conserva.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Venta</h3>

      {reserva ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {preReservada ? 'Espacio apartado' : 'Reserva confirmada'} · {reserva.reservationNumber}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(reserva.reservationDate).toLocaleString('es-CO', {
                day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
              })}{' '}
              · {reserva.participants} personas
            </p>
            {total > 0 && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Pagado <strong>{pesos(pagado)}</strong> de {pesos(total)}
                {falta > 0 && !condicionDePago && (
                  <span className="text-gray-500">
                    {' '}· faltan {pesos(falta)} para poder confirmar
                    {!esAbierta && ' (el 50%)'}
                  </span>
                )}
              </p>
            )}
            {/* La pre-reserva no caduca sola: se dice, para que nadie asuma
                que se liberará por su cuenta. */}
            {preReservada && (
              <p className="mt-1 text-xs text-amber-700">
                El espacio queda bloqueado hasta que confirmes o cierres la oportunidad.
                No se libera solo.
              </p>
            )}
          </div>

          {condicionDePago && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">
              Condición de pago autorizada: {condicionDePago}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {preReservada && (
              <>
                <Button size="sm" color="secondary" onClick={abonar} disabled={trabajando}>
                  Registrar abono
                </Button>
                {!condicionDePago && (
                  <Button size="sm" color="secondary" onClick={autorizar} disabled={trabajando}>
                    Autorizar otra condición
                  </Button>
                )}
                <Button size="sm" onClick={confirmar} disabled={trabajando}>
                  Confirmar venta
                </Button>
              </>
            )}
            <Button size="sm" color="danger" onClick={perder} disabled={trabajando}>
              Cerrar como perdida
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {esAbierta ? (
            <p className="text-sm text-gray-500">
              Es una experiencia abierta: sus cupos se pagan completos y no se
              apartan. Crea la reserva o envíale el enlace del catálogo.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Cuando le mandes los medios de pago, aparta el espacio. Quedará
              bloqueado hasta que confirmes o cierres la oportunidad.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!esAbierta && (
              <Button size="sm" onClick={apartar} disabled={trabajando}>
                Medios de pago enviados
              </Button>
            )}
            <Button size="sm" color="danger" onClick={perder} disabled={trabajando}>
              Cerrar como perdida
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
