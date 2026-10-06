"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from 'flowbite-react';
import Swal from 'sweetalert2';
import { HiOutlineTicket, HiOutlineUserGroup, HiOutlineCheckCircle } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  actualizarVentaDeMiCanal,
  cancelarVentaDeMiCanal,
  getVentasDeMiCanal,
  type ResumenDeMiCanal,
  type VentaDeMiCanal,
} from '@/lib/api/ventasDeMiCanal';

/**
 * Lo que vendió este canal, con la asistencia de cada reserva (TR-25).
 *
 * Aparte de «Mis ingresos» a propósito: allí está el dinero y solo lo
 * cobrado. Aquí está la operación, incluida la que no se ha pagado todavía,
 * porque es lo que un revendedor necesita para contarle a su cliente
 * corporativo quién apareció y cuántos.
 */

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const COLOR_ESTADO: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'info',
  CANCELLED: 'gray',
  NO_SHOW: 'failure',
};

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
};

export default function VentasDeMiCanalPage() {
  const { showError, showSuccess } = useSweetAlert();
  const [ventas, setVentas] = useState<VentaDeMiCanal[]>([]);
  const [resumen, setResumen] = useState<ResumenDeMiCanal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await getVentasDeMiCanal();
      setVentas(r.items);
      setResumen(r.resumen);
    } catch (err) {
      showError('No se pudieron cargar tus ventas', mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * TR-27. Reflejar aquí lo que el cliente le dijo al canal.
   *
   * Hace falta porque no hay sincronización: si el cliente le cambia el plan
   * al revendedor y no se puede tocar aquí, el anfitrión guarda una mesa para
   * gente que ya no viene.
   */
  const editar = async (v: VentaDeMiCanal) => {
    const fechaLocal = new Date(v.reservationDate);
    const aInput = (f: Date) =>
      `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(
        f.getDate(),
      ).padStart(2, '0')}T${String(f.getHours()).padStart(2, '0')}:${String(
        f.getMinutes(),
      ).padStart(2, '0')}`;

    const { value, isConfirmed } = await Swal.fire({
      title: 'Cambiar la reserva',
      html: `
        <div style="text-align:left;font-size:14px">
          <p style="margin:0 0 12px;color:#4b5563">${v.reservationNumber} · ${
            v.experienceTitle ?? ''
          }</p>
          <label style="display:block;margin:8px 0 4px">Personas</label>
          <input id="pax" type="number" min="1" value="${v.participants}"
                 class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:12px 0 4px">Fecha y hora</label>
          <input id="fecha" type="datetime-local" value="${aInput(fechaLocal)}"
                 class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:12px 0 4px">Notas del cliente</label>
          <input id="notas" type="text" class="swal2-input" style="width:100%;margin:0"
                 placeholder="Alergias, preferencias…">
          <p style="margin:12px 0 0;font-size:12px;color:#6b7280">
            El anfitrión recibe el aviso de que lo cambiaste tú.
          </p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const pax = Number(g('pax'));
        const fecha = g('fecha');
        if (!pax || pax < 1) {
          Swal.showValidationMessage('Indica cuántas personas.');
          return false;
        }
        if (!fecha) {
          Swal.showValidationMessage('Indica la fecha.');
          return false;
        }
        return { pax, fecha, notas: g('notas').trim() };
      },
    });
    if (!isConfirmed || !value) return;

    const v2 = value as { pax: number; fecha: string; notas: string };
    setTrabajando(v.id);
    try {
      await actualizarVentaDeMiCanal(v.id, {
        participants: v2.pax,
        reservationDate: new Date(v2.fecha).toISOString(),
        ...(v2.notas ? { specialRequirements: v2.notas } : {}),
        // El anfitrión decide sobre su agenda, no el canal: si a esa hora ya
        // tiene algo en otra sede, no es asunto nuestro bloquearlo.
        permitirSolape: true,
      });
      await cargar();
      showSuccess('Reserva actualizada', 'El anfitrión ya tiene el aviso.');
    } catch (err) {
      showError('No se pudo actualizar', mensajeDeError(err));
    } finally {
      setTrabajando(null);
    }
  };

  const cancelar = async (v: VentaDeMiCanal) => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Cancelar esta reserva',
      input: 'text',
      inputLabel: `${v.reservationNumber} · ${v.experienceTitle ?? ''}`,
      inputPlaceholder: 'Por qué la cancela el cliente',
      showCancelButton: true,
      confirmButtonText: 'Cancelar la reserva',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#DC2626',
      inputValidator: (x) =>
        x.trim() ? null : 'Escribe el motivo: el anfitrión lo va a leer.',
    });
    if (!isConfirmed) return;

    setTrabajando(v.id);
    try {
      await cancelarVentaDeMiCanal(v.id, String(value));
      await cargar();
      showSuccess('Reserva cancelada', 'El cupo queda libre para el anfitrión.');
    } catch (err) {
      showError('No se pudo cancelar', mensajeDeError(err));
    } finally {
      setTrabajando(null);
    }
  };

  /** Lo pasado y lo cancelado ya no se toca: no hay nada que reflejar. */
  const sePuedeTocar = (v: VentaDeMiCanal) =>
    !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(v.status) &&
    new Date(v.reservationDate).getTime() > Date.now();

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        <AdminHeader
          titulo="Ventas de mi canal"
          descripcion="Lo que has vendido y cuánta gente apareció. La asistencia la registra el anfitrión al cerrar cada experiencia."
          total={resumen?.vendidas}
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <HiOutlineTicket className="h-8 w-8 text-[#F26726]" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {resumen?.vendidas ?? 0}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Reservas vendidas</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <HiOutlineUserGroup className="h-8 w-8 text-[#334C5D]" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {resumen?.personasVendidas ?? 0}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Personas vendidas</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <HiOutlineCheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {resumen?.personasAsistieron ?? 0}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Asistieron · {resumen?.conAsistenciaRegistrada ?? 0} de {resumen?.vendidas ?? 0}{' '}
                  cerradas
                </p>
              </div>
            </div>
          </Card>
        </div>

        <AdminTable
          columnas={[
            'Reserva',
            'Experiencia',
            'Anfitrión',
            'Fecha',
            'Personas',
            'Asistieron',
            'Estado',
            'Tu comisión',
            '',
          ]}
          cargando={cargando}
          vacio={ventas.length === 0}
          mensajeVacio="Todavía no has vendido nada por tu catálogo."
        >
          {ventas.map((v) => (
            <tr key={v.id} className="border-b bg-white dark:border-gray-700 dark:bg-gray-800">
              <td className="px-6 py-4">
                <p className="font-medium text-gray-900 dark:text-gray-100">{v.reservationNumber}</p>
                {v.clienteNombre && <p className="text-xs text-gray-500">{v.clienteNombre}</p>}
              </td>
              <td className="px-6 py-4">{v.experienceTitle ?? '—'}</td>
              <td className="px-6 py-4">{v.hostCompanyName ?? '—'}</td>
              <td className="px-6 py-4 tabular-nums">{fecha(v.reservationDate)}</td>
              <td className="px-6 py-4 tabular-nums">{v.participants}</td>
              <td className="px-6 py-4 tabular-nums">
                {/* Sin cerrar no se dice un número: decir "vinieron todos"
                    antes de saberlo es peor que no decir nada. */}
                {v.attendedCount === null ? (
                  <span className="text-xs text-gray-400">Sin cerrar</span>
                ) : (
                  <span
                    className={
                      v.attendedCount < v.participants ? 'text-amber-700 dark:text-amber-400' : ''
                    }
                  >
                    {v.attendedCount}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <Badge color={COLOR_ESTADO[v.status] ?? 'gray'}>
                  {ETIQUETA_ESTADO[v.status] ?? v.status}
                </Badge>
              </td>
              <td className="px-6 py-4 tabular-nums">{pesos(v.resellerCommission)}</td>
              <td className="px-6 py-4">
                {/* TR-27. Lo que el cliente le dijo al canal se refleja aquí:
                    no hay sincronización con su plataforma. */}
                {sePuedeTocar(v) && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="xs"
                      color="gray"
                      onClick={() => editar(v)}
                      disabled={trabajando === v.id}
                    >
                      Cambiar
                    </Button>
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => cancelar(v)}
                      disabled={trabajando === v.id}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </ProtectedRoute>
  );
}
