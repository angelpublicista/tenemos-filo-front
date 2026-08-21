"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from 'flowbite-react';
import { HiCash, HiCheckCircle, HiClock } from 'react-icons/hi';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable from '@/components/Admin/AdminTable';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  getResumenIngresos,
  listIngresosPorReserva,
  type IngresoPorReserva,
  type PayoutRole,
  type PayoutRecibido,
  type Saldo,
} from '@/lib/api/earnings';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const POR_PAGINA = 20;

export default function IngresosPage() {
  const { sanityUser } = useAuth();
  const { showError } = useSweetAlert();

  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [recibidas, setRecibidas] = useState<PayoutRecibido[]>([]);
  const [totales, setTotales] = useState({ accrued: 0, paid: 0, pending: 0 });
  const [cargando, setCargando] = useState(true);

  const [rol, setRol] = useState<PayoutRole>('HOST');
  const [reservas, setReservas] = useState<IngresoPorReserva[]>([]);
  const [totalReservas, setTotalReservas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargandoDetalle, setCargandoDetalle] = useState(true);

  const cargarResumen = useCallback(async () => {
    setCargando(true);
    try {
      const r = await getResumenIngresos();
      setSaldos(r.balances);
      setRecibidas(r.payouts);
      setTotales(r.totals);
    } catch (err) {
      showError('No se pudieron cargar tus ingresos', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  const cargarDetalle = useCallback(async () => {
    setCargandoDetalle(true);
    try {
      const { items, total } = await listIngresosPorReserva({ role: rol, page: pagina, pageSize: POR_PAGINA });
      setReservas(items);
      setTotalReservas(total);
    } catch (err) {
      showError('No se pudo cargar el detalle', err instanceof Error ? err.message : undefined);
    } finally {
      setCargandoDetalle(false);
    }
  }, [rol, pagina, showError]);

  useEffect(() => {
    void cargarResumen();
  }, [cargarResumen]);

  useEffect(() => {
    void cargarDetalle();
  }, [cargarDetalle]);

  // Solo tiene sentido ofrecer la vista de revendedor si de verdad ha
  // vendido experiencias de otros.
  const revende = useMemo(() => saldos.some((s) => s.role === 'RESELLER'), [saldos]);

  const cambiarRol = (nuevo: PayoutRole) => {
    setRol(nuevo);
    setPagina(1);
  };

  const paginas = Math.max(1, Math.ceil(totalReservas / POR_PAGINA));

  return (
    <ProtectedRoute roles={['host', 'admin', 'reseller']}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis ingresos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Lo que han generado tus reservas cobradas y lo que Tenemos Filo ya te transfirió
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HiCash className="w-4 h-4 text-[#F26726]" /> Generado
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pesos(totales.accrued)}</div>
          <div className="text-xs text-gray-500 -mt-2">Después de comisiones</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HiCheckCircle className="w-4 h-4 text-green-600" /> Ya recibido
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pesos(totales.paid)}</div>
          <div className="text-xs text-gray-500 -mt-2">Transferencias registradas</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HiClock className="w-4 h-4 text-[#F26726]" /> Por recibir
          </div>
          <div className="text-2xl font-bold text-[#F26726]">{pesos(totales.pending)}</div>
          <div className="text-xs text-gray-500 -mt-2">Pendiente de dispersar</div>
        </Card>
      </div>

      {/* Desglose por rol: una misma empresa puede ganar como anfitriona y
          ademas cobrar comisiones por vender experiencias de otras. */}
      {saldos.length > 1 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Por concepto</h2>
          <AdminTable
            columnas={['Concepto', 'Generado', 'Recibido', 'Por recibir']}
            cargando={cargando}
            vacio={false}
            mensajeVacio=""
          >
            {saldos.map((s) => (
              <tr key={`${s.companyId}:${s.role}`} className="bg-white border-b">
                <td className="px-6 py-4">
                  <Badge color={s.role === 'HOST' ? 'info' : 'warning'} className="w-fit">
                    {s.role === 'HOST' ? 'Mis experiencias' : 'Comisión por reventa'}
                  </Badge>
                </td>
                <td className="px-6 py-4">{pesos(s.accrued)}</td>
                <td className="px-6 py-4 text-gray-500">{pesos(s.paid)}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{pesos(s.pending)}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reservas cobradas</h2>
        {revende && (
          <div className="flex gap-2">
            <Button size="xs" color={rol === 'HOST' ? 'primary' : 'light'} onClick={() => cambiarRol('HOST')}>
              Mis experiencias
            </Button>
            <Button
              size="xs"
              color={rol === 'RESELLER' ? 'primary' : 'light'}
              onClick={() => cambiarRol('RESELLER')}
            >
              Las que revendo
            </Button>
          </div>
        )}
      </div>

      <AdminTable
        columnas={
          rol === 'RESELLER'
            ? ['Fecha', 'Reserva', 'Experiencia', 'Anfitrión', 'Total', 'Tu comisión']
            : ['Fecha', 'Reserva', 'Experiencia', 'Total', 'Comisiones', 'Para ti']
        }
        cargando={cargandoDetalle}
        vacio={reservas.length === 0}
        mensajeVacio={
          rol === 'RESELLER'
            ? 'Todavía no has cobrado comisiones por reventa.'
            : 'Aún no tienes reservas pagadas. Cuando un cliente complete el pago aparecerá aquí.'
        }
      >
        {reservas.map((r) => (
          <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-xs whitespace-nowrap">{fecha(r.reservationDate)}</td>
            <td className="px-6 py-4 font-medium text-gray-900">{r.reservationNumber}</td>
            <td className="px-6 py-4">{r.experienceTitle ?? '—'}</td>
            {rol === 'RESELLER' && <td className="px-6 py-4 text-xs">{r.companyName ?? '—'}</td>}
            <td className="px-6 py-4">{pesos(r.total)}</td>
            {rol === 'HOST' && (
              <td className="px-6 py-4 text-xs text-gray-500">
                <div>Tenemos Filo {pesos(r.filoCommission)}</div>
                {r.resellerCommission > 0 && <div>Revendedor {pesos(r.resellerCommission)}</div>}
              </td>
            )}
            <td className="px-6 py-4 font-semibold text-gray-900">{pesos(r.earnings)}</td>
          </tr>
        ))}
      </AdminTable>

      {paginas > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            Página {pagina} de {paginas} · {totalReservas} reservas
          </span>
          <div className="flex gap-2">
            <Button size="xs" color="light" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              size="xs"
              color="light"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Transferencias recibidas
        </h2>
        <AdminTable
          columnas={['Fecha', 'Concepto', 'Importe', 'Referencia']}
          cargando={cargando}
          vacio={recibidas.length === 0}
          mensajeVacio="Todavía no has recibido transferencias de Tenemos Filo."
        >
          {recibidas.map((p) => (
            <tr key={p.id} className="bg-white border-b">
              <td className="px-6 py-4 text-xs whitespace-nowrap">{fecha(p.paidAt)}</td>
              <td className="px-6 py-4">
                {p.role === 'HOST' ? 'Mis experiencias' : 'Comisión por reventa'}
              </td>
              <td className="px-6 py-4 font-semibold text-gray-900">{pesos(p.amount)}</td>
              <td className="px-6 py-4 text-xs">{p.reference ?? '—'}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      {/* Un admin sin empresa activa no tiene cuentas propias que mirar. */}
      {sanityUser?.role === 'admin' && (
        <p className="text-xs text-gray-500 mt-6">
          Estás viendo las cuentas de la empresa activa. Para el panorama completo de la plataforma,
          usa{' '}
          <Link href="/dashboard/admin/dispersiones" className="text-[#F26726] hover:underline">
            Dispersiones
          </Link>
          .
        </p>
      )}
    </ProtectedRoute>
  );
}
