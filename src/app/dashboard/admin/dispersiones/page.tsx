"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from 'flowbite-react';
import { HiCash } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { listBalances, createPayout, listPayouts, type Payout, type Saldo } from '@/lib/api/admin';

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminDispersionesPage() {
  const { showSuccess, showError } = useSweetAlert();

  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [retenido, setRetenido] = useState(0);
  const [historial, setHistorial] = useState<Payout[]>([]);
  const [cargando, setCargando] = useState(true);

  const [pagando, setPagando] = useState<Saldo | null>(null);
  const [importe, setImporte] = useState('');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [{ items, filoRetained }, pagos] = await Promise.all([listBalances(), listPayouts()]);
      setSaldos(items);
      setRetenido(filoRetained);
      setHistorial(pagos.items);
    } catch (err) {
      showError('No se pudieron cargar las dispersiones', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirPago = (s: Saldo) => {
    setPagando(s);
    // Por defecto se dispersa todo lo pendiente, que es el caso normal.
    setImporte(String(s.pending));
    setReferencia('');
  };

  const registrar = async () => {
    if (!pagando) return;
    const monto = Number(importe);
    if (!Number.isFinite(monto) || monto <= 0) return;

    setGuardando(true);
    try {
      await createPayout({
        companyId: pagando.companyId,
        role: pagando.role,
        amount: monto,
        reference: referencia.trim() || undefined,
      });
      showSuccess('Dispersión registrada', `${pesos(monto)} a ${pagando.companyName}.`);
      setPagando(null);
      await cargar();
    } catch (err) {
      showError('No se pudo registrar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const totalPendiente = saldos.reduce((acc, s) => acc + s.pending, 0);

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Dispersiones"
        descripcion="Fondos que Tenemos Filo debe transferir a cada empresa y revendedor"
      />

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mb-6">
        <Card>
          <div className="text-sm text-gray-600">Pendiente por dispersar</div>
          <div className="text-2xl font-bold text-[#F26726]">{pesos(totalPendiente)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Retenido por Tenemos Filo</div>
          <div className="text-2xl font-bold text-gray-900">{pesos(retenido)}</div>
          <div className="text-xs text-gray-500 -mt-2">Comisiones sobre reservas cobradas</div>
        </Card>
      </div>

      <AdminTable
        columnas={['Destinatario', 'Acumulado', 'Dispersado', 'Pendiente', '']}
        cargando={cargando}
        vacio={saldos.length === 0}
        mensajeVacio="Todavía no hay reservas cobradas que generen fondos por dispersar."
      >
        {saldos.map((s) => (
          <tr key={`${s.companyId}:${s.role}`} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{s.companyName}</div>
              <Badge color={s.role === 'HOST' ? 'info' : 'warning'} className="w-fit mt-1">
                {s.role === 'HOST' ? 'Anfitrión' : 'Revendedor'}
              </Badge>
            </td>
            <td className="px-6 py-4">{pesos(s.accrued)}</td>
            <td className="px-6 py-4 text-gray-500">{pesos(s.paid)}</td>
            <td className="px-6 py-4 font-semibold text-gray-900">{pesos(s.pending)}</td>
            <td className="px-6 py-4">
              <Button
                size="xs"
                color="primary"
                onClick={() => abrirPago(s)}
                disabled={s.pending <= 0}
              >
                <HiCash className="w-4 h-4 mr-1" />
                Registrar pago
              </Button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {historial.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Dispersiones registradas</h2>
          <AdminTable
            columnas={['Fecha', 'Destinatario', 'Importe', 'Referencia', 'Registró']}
            cargando={false}
            vacio={false}
            mensajeVacio=""
          >
            {historial.map((p) => (
              <tr key={p.id} className="bg-white border-b">
                <td className="px-6 py-4 text-xs whitespace-nowrap">{fecha(p.paidAt)}</td>
                <td className="px-6 py-4">
                  {p.company?.companyName ?? '—'}
                  <span className="block text-xs text-gray-500">
                    {p.role === 'HOST' ? 'Anfitrión' : 'Revendedor'}
                  </span>
                </td>
                <td className="px-6 py-4">{pesos(p.amount)}</td>
                <td className="px-6 py-4 text-xs">{p.reference ?? '—'}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{p.createdByEmail ?? '—'}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      <Modal show={!!pagando} onClose={() => setPagando(null)} size="md">
        <ModalHeader>Registrar dispersión</ModalHeader>
        <ModalBody>
          {pagando && (
            <div className="space-y-3">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{pagando.companyName}</div>
                <div className="text-gray-600">
                  {pagando.role === 'HOST' ? 'Anfitrión' : 'Revendedor'} · pendiente{' '}
                  <span className="font-medium">{pesos(pagando.pending)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importe *</label>
                <TextInput
                  type="number"
                  min={0}
                  max={pagando.pending}
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                />
                {Number(importe) > pagando.pending && (
                  <p className="text-xs text-red-600 mt-1">
                    No puede superar el pendiente ({pesos(pagando.pending)}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <TextInput
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Nº de transferencia o comprobante"
                />
              </div>

              <p className="text-xs text-gray-500">
                Esto deja constancia de un pago ya realizado; no mueve dinero por sí mismo.
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
            {guardando ? 'Registrando...' : 'Registrar'}
          </Button>
          <Button color="light" onClick={() => setPagando(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
