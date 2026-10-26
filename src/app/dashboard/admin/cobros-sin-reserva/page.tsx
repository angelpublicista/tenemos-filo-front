"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from 'flowbite-react';
import Swal from 'sweetalert2';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  listarCobrosSinReserva,
  marcarCobroResuelto,
  type CobroSinReserva,
} from '@/lib/api/cobrosSinReserva';
import { pesos } from '@/lib/dinero';

/**
 * Cobros que llegaron sin reserva (TR-44).
 *
 * Pasa poco, pero pasa: la reserva se borró entre el pago y la notificación,
 * o la pasarela mandó una referencia que no reconocemos. Antes era una línea
 * en el log que nadie iba a leer, y el dinero quedaba cobrado sin que
 * existiera nada que lo explicara.
 *
 * Es del equipo de Tenemos Filo porque lo que hay que hacer con uno —devolver
 * el dinero, encontrar a quien pagó— se hace desde la pasarela.
 */


const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function CobrosSinReservaPage() {
  const { showError, showSuccess } = useSweetAlert();
  const [items, setItems] = useState<CobroSinReserva[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [verResueltos, setVerResueltos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listarCobrosSinReserva(verResueltos ? undefined : false);
      setItems(r.items);
      setPendientes(r.pendientes);
    } catch (err) {
      showError('No se pudieron cargar', mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [verResueltos, showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolver = async (c: CobroSinReserva) => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Marcar como resuelto',
      input: 'text',
      inputLabel: 'Qué se hizo con ese dinero',
      inputPlaceholder: 'Ej: devuelto por la pasarela el 5 de octubre',
      showCancelButton: true,
      confirmButtonText: 'Resuelto',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      inputValidator: (v) =>
        v.trim() ? null : 'Escribe qué se hizo: en tres meses nadie se va a acordar.',
    });
    if (!isConfirmed) return;

    setTrabajando(c.id);
    try {
      await marcarCobroResuelto(c.id, String(value));
      await cargar();
      showSuccess('Marcado como resuelto', '');
    } catch (err) {
      showError('No se pudo marcar', mensajeDeError(err));
    } finally {
      setTrabajando(null);
    }
  };

  const verEvento = (c: CobroSinReserva) => {
    void Swal.fire({
      title: `Evento de ${c.gateway}`,
      html: `<pre style="text-align:left;font-size:11px;max-height:50vh;overflow:auto;white-space:pre-wrap">${JSON.stringify(
        c.event,
        null,
        2,
      ).replace(/</g, '&lt;')}</pre>`,
      width: 700,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#F26726',
    });
  };

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        <AdminHeader
          titulo="Cobros sin reserva"
          descripcion="Pagos que llegaron y no tenían a qué colgarse. Hay que devolver ese dinero o encontrar a quién pagó."
          total={pendientes}
        />

        {pendientes > 0 && (
          <Card className="mb-6 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-800 dark:text-gray-100">
              <strong>
                {pendientes} {pendientes === 1 ? 'cobro' : 'cobros'} sin resolver.
              </strong>{' '}
              Cada uno es dinero en una cuenta sin una reserva que lo explique.
            </p>
          </Card>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            size="xs"
            color={verResueltos ? 'gray' : 'primary'}
            onClick={() => setVerResueltos(false)}
          >
            Sin resolver
          </Button>
          <Button
            size="xs"
            color={verResueltos ? 'primary' : 'gray'}
            onClick={() => setVerResueltos(true)}
          >
            Todos
          </Button>
        </div>

        <AdminTable
          columnas={['Cuándo', 'Pasarela', 'Referencia', 'Importe', 'Estado en la pasarela', '']}
          cargando={cargando}
          vacio={items.length === 0}
          mensajeVacio={
            verResueltos
              ? 'No hay ningún cobro sin reserva registrado.'
              : 'Nada sin resolver. Todos los cobros tienen su reserva.'
          }
        >
          {items.map((c) => (
            <tr key={c.id} className="border-b bg-white dark:border-gray-700 dark:bg-gray-800">
              <td className="px-6 py-4 tabular-nums">{cuando(c.createdAt)}</td>
              <td className="px-6 py-4">{c.gateway}</td>
              <td className="px-6 py-4">
                <p className="font-mono text-xs text-gray-900 dark:text-gray-100">{c.reference}</p>
                {c.transactionId && (
                  <p className="font-mono text-xs text-gray-500">{c.transactionId}</p>
                )}
              </td>
              <td className="px-6 py-4 tabular-nums">
                {c.amount !== null ? pesos(Number(c.amount)) : '—'}
              </td>
              <td className="px-6 py-4">{c.gatewayStatus ?? '—'}</td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="xs" color="gray" onClick={() => verEvento(c)}>
                    Ver evento
                  </Button>
                  {c.resolved ? (
                    <Badge color="success">
                      Resuelto{c.resolvedAt ? ` · ${cuando(c.resolvedAt)}` : ''}
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      onClick={() => resolver(c)}
                      disabled={trabajando === c.id}
                    >
                      Marcar resuelto
                    </Button>
                  )}
                </div>
                {c.notes && <p className="mt-1 text-xs text-gray-500">{c.notes}</p>}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </ProtectedRoute>
  );
}
