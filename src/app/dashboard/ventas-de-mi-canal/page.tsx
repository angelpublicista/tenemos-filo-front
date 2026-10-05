"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Card } from 'flowbite-react';
import { HiOutlineTicket, HiOutlineUserGroup, HiOutlineCheckCircle } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
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
  const { showError } = useSweetAlert();
  const [ventas, setVentas] = useState<VentaDeMiCanal[]>([]);
  const [resumen, setResumen] = useState<ResumenDeMiCanal | null>(null);
  const [cargando, setCargando] = useState(true);

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
            </tr>
          ))}
        </AdminTable>
      </div>
    </ProtectedRoute>
  );
}
