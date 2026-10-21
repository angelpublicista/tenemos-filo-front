"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Modal, ModalBody, ModalFooter, ModalHeader, Select, TextInput } from 'flowbite-react';
import { HiCash } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { getSettings } from '@/lib/api/admin';
import {
  definirExencionDeSuscripcion,
  definirVencimientoDeSuscripcion,
  listSuscripciones,
  registrarPagoManualDeSuscripcion,
  type SuscripcionDeEmpresa,
} from '@/lib/api/subscription';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

/** El valor de un <input type="date"> (AAAA-MM-DD) para una fecha, en hora local. */
const aInputDeFecha = (iso: string) => {
  const d = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

/** Lo que el administrador necesita ver de un vistazo. */
function estadoDe(s: SuscripcionDeEmpresa): { texto: string; color: string } {
  if (s.exenta) return { texto: 'Exenta', color: 'info' };
  if (s.endsAt === null) return { texto: 'Sin pagar', color: 'failure' };
  if (s.vencida) return { texto: 'Vencida', color: 'failure' };
  if ((s.diasRestantes ?? 99) <= 7) return { texto: `Vence en ${s.diasRestantes} d`, color: 'warning' };
  return { texto: 'Al día', color: 'success' };
}

export default function AdminSuscripcionesPage() {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [filas, setFilas] = useState<SuscripcionDeEmpresa[]>([]);
  const [exigida, setExigida] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'TODAS' | 'VENCIDAS' | 'AL_DIA' | 'EXENTAS'>('TODAS');

  const [registrando, setRegistrando] = useState<SuscripcionDeEmpresa | null>(null);
  const [periodos, setPeriodos] = useState('1');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoFecha, setEditandoFecha] = useState<SuscripcionDeEmpresa | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [notaFecha, setNotaFecha] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, ajustes] = await Promise.all([listSuscripciones(), getSettings()]);
      setFilas(lista);
      setExigida(ajustes.subscriptionRequired);
    } catch (err) {
      showError('No se pudieron cargar las suscripciones', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = filas.filter((f) =>
    filtro === 'TODAS'
      ? true
      : filtro === 'EXENTAS'
        ? f.exenta
        : filtro === 'VENCIDAS'
          ? !f.exenta && f.vencida
          : !f.exenta && !f.vencida,
  );

  const vencidas = filas.filter((f) => !f.exenta && f.vencida).length;

  const registrar = async () => {
    if (!registrando) return;
    setGuardando(true);
    try {
      await registrarPagoManualDeSuscripcion(registrando.companyId, {
        periodos: Number(periodos),
        notes: notas.trim() || undefined,
      });
      showSuccess('Pago registrado', `${registrando.companyName}: +${Number(periodos) * 30} días.`);
      setRegistrando(null);
      await cargar();
    } catch (err) {
      showError('No se pudo registrar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const guardarVencimiento = async () => {
    if (!editandoFecha) return;
    setGuardando(true);
    try {
      // La fecha elegida es un día, no un instante: vale hasta que termina.
      // Se arma en hora local para que "hasta el 20" no se corra al 19 por la
      // zona horaria.
      const endsAt = nuevaFecha ? new Date(`${nuevaFecha}T23:59:59`).toISOString() : null;
      await definirVencimientoDeSuscripcion(editandoFecha.companyId, {
        endsAt,
        notes: notaFecha.trim() || undefined,
      });
      showSuccess(
        'Vencimiento actualizado',
        `${editandoFecha.companyName}: ${nuevaFecha ? `vence el ${fecha(endsAt!)}` : 'sin suscripción pagada'}.`,
      );
      setEditandoFecha(null);
      await cargar();
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const alternarExencion = async (f: SuscripcionDeEmpresa) => {
    const ok = await showConfirmation(
      f.exenta ? '¿Quitar la exención?' : '¿Exentar de la suscripción?',
      f.exenta
        ? `${f.companyName} volverá a necesitar una suscripción vigente.`
        : `${f.companyName} no tendrá que pagar la suscripción ni se bloqueará su panel.`,
      f.exenta ? 'Sí, quitar' : 'Sí, exentar',
      'Cancelar',
    );
    if (!ok) return;
    try {
      await definirExencionDeSuscripcion(f.companyId, !f.exenta);
      showSuccess(f.exenta ? 'Exención quitada' : 'Empresa exenta', '');
      await cargar();
    } catch (err) {
      showError('No se pudo cambiar', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Suscripciones"
        descripcion="Quién tiene su suscripción al día, quién no, y los pagos que no pasaron por la pasarela"
      />

      {exigida === false && (
        <p className="mb-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La suscripción está <strong>apagada</strong>: nadie queda bloqueado todavía.
          {vencidas > 0 &&
            ` Si la enciendes hoy, ${vencidas} ${vencidas === 1 ? 'empresa quedaría bloqueada' : 'empresas quedarían bloqueadas'}; registra su pago o exéntalas antes.`}{' '}
          Se enciende en Ajustes.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="filtro-susc" className="text-sm text-gray-600">
          Ver
        </label>
        <Select
          id="filtro-susc"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="w-48"
        >
          <option value="TODAS">Todas</option>
          <option value="VENCIDAS">Vencidas o sin pagar</option>
          <option value="AL_DIA">Al día</option>
          <option value="EXENTAS">Exentas</option>
        </Select>
      </div>

      <AdminTable
        columnas={['Empresa', 'Titular', 'Vence', 'Estado', '']}
        cargando={cargando}
        vacio={visibles.length === 0}
        mensajeVacio="No hay empresas en este filtro."
      >
        {visibles.map((f) => {
          const e = estadoDe(f);
          return (
            <tr key={f.companyId} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{f.companyName}</td>
              <td className="px-6 py-4 text-xs text-gray-600">{f.ownerEmail}</td>
              <td className="px-6 py-4 whitespace-nowrap">{f.endsAt ? fecha(f.endsAt) : '—'}</td>
              <td className="px-6 py-4">
                <Badge color={e.color} className="w-fit">
                  {e.texto}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    color="primary"
                    onClick={() => {
                      setRegistrando(f);
                      setPeriodos('1');
                      setNotas('');
                    }}
                  >
                    <HiCash className="w-4 h-4 mr-1" />
                    Registrar pago
                  </Button>
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => {
                      setEditandoFecha(f);
                      setNuevaFecha(f.endsAt ? aInputDeFecha(f.endsAt) : '');
                      setNotaFecha('');
                    }}
                  >
                    Editar vencimiento
                  </Button>
                  <Button size="xs" color="light" onClick={() => void alternarExencion(f)}>
                    {f.exenta ? 'Quitar exención' : 'Exentar'}
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <Card className="mt-6 max-w-3xl">
        <p className="text-sm text-gray-600">
          Cada pago suma 30 días a los que ya queden. «Registrar pago» es para lo que no pasó por
          Wompi (una transferencia, un acuerdo) y se factura por fuera; los pagos en línea se
          registran solos.
        </p>
      </Card>

      <Modal show={!!editandoFecha} onClose={() => setEditandoFecha(null)} size="md">
        <ModalHeader>Editar vencimiento</ModalHeader>
        <ModalBody>
          {editandoFecha && (
            <div className="space-y-3">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{editandoFecha.companyName}</div>
                <div className="text-gray-600">
                  {editandoFecha.endsAt
                    ? `Vence el ${fecha(editandoFecha.endsAt)}.`
                    : 'Todavía no tiene una suscripción pagada.'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva fecha de vencimiento
                </label>
                <TextInput
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Vale hasta el final de ese día. Déjala vacía para quitar la suscripción pagada.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <TextInput
                  value={notaFecha}
                  onChange={(e) => setNotaFecha(e.target.value)}
                  placeholder="Ej.: pago extemporáneo del 3 de octubre"
                />
              </div>

              <p className="text-xs text-gray-500">
                Fija la fecha tal cual: no suma días ni crea un pago. El cambio queda en el registro
                de actividad.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={guardarVencimiento} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar fecha'}
          </Button>
          <Button color="light" onClick={() => setEditandoFecha(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={!!registrando} onClose={() => setRegistrando(null)} size="md">
        <ModalHeader>Registrar pago de suscripción</ModalHeader>
        <ModalBody>
          {registrando && (
            <div className="space-y-3">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{registrando.companyName}</div>
                <div className="text-gray-600">
                  {registrando.endsAt && !registrando.vencida
                    ? `Activa hasta el ${fecha(registrando.endsAt)}; los días nuevos se suman a esa fecha.`
                    : 'Sin días vigentes: los días cuentan desde hoy.'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meses pagados</label>
                <Select value={periodos} onChange={(e) => setPeriodos(e.target.value)}>
                  {[1, 2, 3, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'mes' : 'meses'} ({n * 30} días)
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                <TextInput
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Nº de transferencia o factura"
                />
              </div>

              <p className="text-xs text-gray-500">
                Deja constancia de un pago ya recibido; no cobra nada por sí mismo.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={registrar} disabled={guardando}>
            {guardando ? 'Registrando...' : 'Registrar pago'}
          </Button>
          <Button color="light" onClick={() => setRegistrando(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
