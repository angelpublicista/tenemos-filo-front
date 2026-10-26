"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  TextInput,
} from 'flowbite-react';
import { HiCash, HiEye } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import EstadoDelMesBadge, { nombreDelMes } from '@/components/Comisiones/EstadoDelMes';
import PrecioInput from '@/components/PrecioInput';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  deshacerPagoDeComision,
  getDetalleDelBalance,
  listBalancesDeComision,
  marcarComisionPagada,
  type BalanceMensual,
  type EstadoDelMes,
  type ReservaDelBalance,
} from '@/lib/api/fees';
import { pesos, soloElNumero } from '@/lib/dinero';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminComisionesPage() {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [filas, setFilas] = useState<BalanceMensual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | EstadoDelMes>('TODOS');

  const [pagando, setPagando] = useState<BalanceMensual | null>(null);
  const [importe, setImporte] = useState('');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [viendo, setViendo] = useState<BalanceMensual | null>(null);
  const [detalle, setDetalle] = useState<ReservaDelBalance[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setFilas(await listBalancesDeComision());
    } catch (err) {
      showError('No se pudieron cargar las comisiones', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(
    () => (filtro === 'TODOS' ? filas : filas.filter((f) => f.estado === filtro)),
    [filas, filtro],
  );

  // Solo lo que ya se puede cobrar: un mes en curso todavía cambia.
  const porCobrar = filas
    .filter((f) => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL')
    .reduce((acc, f) => acc + f.pending, 0);
  const enCurso = filas.filter((f) => f.estado === 'EN_CURSO').reduce((acc, f) => acc + f.accrued, 0);

  const abrirPago = (f: BalanceMensual) => {
    setPagando(f);
    // Por defecto, todo lo pendiente: lo normal es que pague el mes completo.
    setImporte(String(f.pending));
    setReferencia('');
  };

  const registrar = async () => {
    if (!pagando) return;
    const monto = Number(importe);
    if (!Number.isFinite(monto) || monto <= 0) return;

    setGuardando(true);
    try {
      await marcarComisionPagada({
        companyId: pagando.companyId,
        period: pagando.period,
        amount: monto,
        reference: referencia.trim() || undefined,
      });
      showSuccess(
        'Pago registrado',
        `${pesos(monto)} de ${pagando.companyName} por ${nombreDelMes(pagando.period)}.`,
      );
      setPagando(null);
      await cargar();
    } catch (err) {
      showError('No se pudo registrar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const deshacer = async (f: BalanceMensual, pagoId: string, monto: number) => {
    const ok = await showConfirmation(
      '¿Deshacer este pago?',
      `Se quitarán ${pesos(monto)} de ${f.companyName} (${nombreDelMes(f.period)}) y volverán a figurar como pendientes.`,
      'Sí, deshacer',
      'Cancelar',
    );
    if (!ok) return;
    try {
      await deshacerPagoDeComision(pagoId);
      showSuccess('Pago deshecho', '');
      await cargar();
    } catch (err) {
      showError('No se pudo deshacer', err instanceof Error ? err.message : undefined);
    }
  };

  const verDetalle = async (f: BalanceMensual) => {
    setViendo(f);
    setDetalle([]);
    setCargandoDetalle(true);
    try {
      setDetalle(await getDetalleDelBalance(f.companyId, f.period));
    } catch (err) {
      showError('No se pudo cargar el detalle', err instanceof Error ? err.message : undefined);
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Comisiones por cobrar"
        descripcion="Lo que los anfitriones que cobran con su propia pasarela le deben a Tenemos Filo, mes a mes"
      />

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mb-6">
        <Card>
          <div className="text-sm text-gray-600">Por cobrar</div>
          <div className="text-2xl font-bold text-[#F26726]">{pesos(porCobrar)}</div>
          <div className="text-xs text-gray-500 -mt-2">De meses ya cerrados</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Mes en curso</div>
          <div className="text-2xl font-bold text-gray-900">{pesos(enCurso)}</div>
          <div className="text-xs text-gray-500 -mt-2">Todavía puede cambiar; se cobra al cerrar</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="filtro-estado" className="text-sm text-gray-600">
          Ver
        </label>
        <Select
          id="filtro-estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as 'TODOS' | EstadoDelMes)}
          className="w-48"
        >
          <option value="TODOS">Todos</option>
          <option value="PENDIENTE">Por pagar</option>
          <option value="PARCIAL">Pago parcial</option>
          <option value="PAGADO">Pagados</option>
          <option value="EN_CURSO">En curso</option>
        </Select>
      </div>

      <AdminTable
        columnas={['Mes', 'Anfitrión', 'Reservas', 'Comisión', 'Pagado', 'Pendiente', 'Estado', '']}
        cargando={cargando}
        vacio={visibles.length === 0}
        mensajeVacio="Ningún anfitrión ha cobrado con su propia pasarela generando comisión para FILO."
      >
        {visibles.map((f) => (
          <tr key={`${f.companyId}:${f.period}`} className="bg-white border-b hover:bg-gray-50 align-top">
            <td className="px-6 py-4 capitalize whitespace-nowrap">{nombreDelMes(f.period)}</td>
            <td className="px-6 py-4 font-medium text-gray-900">{f.companyName}</td>
            <td className="px-6 py-4">{f.reservas}</td>
            <td className="px-6 py-4">{pesos(f.accrued)}</td>
            <td className="px-6 py-4 text-gray-500">
              {pesos(f.paid)}
              {/* Lo que consta de cada pago: la referencia es el nº de la
                  factura, que es lo que se busca al cuadrar. */}
              {f.pagos.map((p) => (
                <div key={p.id} className="mt-1 text-xs text-gray-500">
                  {fecha(p.paidAt)} · {pesos(p.amount)}
                  {p.reference ? ` · ${p.reference}` : ''}{' '}
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void deshacer(f, p.id, p.amount)}
                  >
                    deshacer
                  </button>
                </div>
              ))}
            </td>
            <td className="px-6 py-4 font-semibold text-gray-900">{pesos(Math.max(f.pending, 0))}</td>
            <td className="px-6 py-4">
              <EstadoDelMesBadge estado={f.estado} />
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="xs" color="light" onClick={() => void verDetalle(f)} title="Ver reservas">
                  <HiEye className="w-4 h-4" />
                </Button>
                <Button
                  size="xs"
                  color="primary"
                  onClick={() => abrirPago(f)}
                  disabled={f.estado === 'EN_CURSO' || f.pending <= 0}
                >
                  <HiCash className="w-4 h-4 mr-1" />
                  Marcar pagado
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <p className="mt-3 max-w-3xl text-xs text-gray-500">
        Los meses se cuentan por la fecha de la reserva, en hora de Bogotá. FILO factura por fuera
        de la plataforma; aquí solo se deja constancia de lo que ya se pagó. Este balance no se
        envía solo: el anfitrión lo ve en sus ingresos.
      </p>

      <Modal show={!!pagando} onClose={() => setPagando(null)} size="md">
        <ModalHeader>Marcar comisión como pagada</ModalHeader>
        <ModalBody>
          {pagando && (
            <div className="space-y-3">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{pagando.companyName}</div>
                <div className="text-gray-600 capitalize">
                  {nombreDelMes(pagando.period)} · pendiente{' '}
                  <span className="font-medium">{pesos(pagando.pending)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importe *</label>
                <PrecioInput
                  value={soloElNumero(importe)}
                  onChange={(v) => setImporte(v === null ? '' : String(v))}
                  placeholder="0"
                  aria-label="Importe pagado"
                />
                {Number(importe) > pagando.pending && (
                  <p className="text-xs text-red-600 mt-1">
                    No puede superar lo pendiente ({pesos(pagando.pending)}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factura o comprobante
                </label>
                <TextInput
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Nº de la factura de FILO"
                />
              </div>

              <p className="text-xs text-gray-500">
                Esto deja constancia de un pago ya recibido; no cobra nada por sí mismo.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={registrar}
            disabled={
              guardando ||
              !Number(importe) ||
              Number(importe) <= 0 ||
              Number(importe) > (pagando?.pending ?? 0)
            }
          >
            {guardando ? 'Registrando...' : 'Registrar pago'}
          </Button>
          <Button color="light" onClick={() => setPagando(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={!!viendo} onClose={() => setViendo(null)} size="3xl">
        <ModalHeader>
          {viendo ? `${viendo.companyName} · ${nombreDelMes(viendo.period)}` : ''}
        </ModalHeader>
        <ModalBody>
          {cargandoDetalle ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : detalle.length === 0 ? (
            <p className="text-sm text-gray-500">Este mes no tiene reservas con comisión.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Reserva</th>
                    <th className="py-2 pr-4">Experiencia</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4 whitespace-nowrap">{fecha(r.reservationDate)}</td>
                      <td className="py-2 pr-4">{r.reservationNumber}</td>
                      <td className="py-2 pr-4">{r.experienceTitle ?? '—'}</td>
                      <td className="py-2 pr-4 text-right">{pesos(r.total)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {pesos(r.filoCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setViendo(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
