"use client";

import React, { useEffect, useState } from 'react';
import { Card, Select } from 'flowbite-react';
import AdminTable from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  getEstadisticasDeSuscripciones,
  type EstadisticasDeSuscripciones as Datos,
} from '@/lib/api/subscription';
import { pesos } from '@/lib/dinero';

const METODOS: Record<string, string> = {
  WOMPI: 'Wompi',
  MERCADO_PAGO: 'Mercado Pago',
  MANUAL: 'Registrado por FILO',
};

const nombreDelMes = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
};

/**
 * Lo vendido en suscripciones: ingresos por mes, por método de pago y cómo
 * está la cartera de anfitriones. Solo cuentan los pagos confirmados.
 */
export default function EstadisticasDeSuscripciones() {
  const { showError } = useSweetAlert();
  const [meses, setMeses] = useState(12);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    getEstadisticasDeSuscripciones(meses)
      .then((d) => {
        if (!cancelado) setDatos(d);
      })
      .catch((err) => {
        if (!cancelado) {
          showError(
            'No se pudieron cargar las estadísticas',
            err instanceof Error ? err.message : undefined,
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [meses, showError]);

  const maximo = Math.max(1, ...(datos?.porMes.map((f) => f.total) ?? [0]));
  const t = datos?.totales;
  const c = datos?.cartera;

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Ventas de suscripciones</h2>
        <Select
          aria-label="Periodo"
          value={meses}
          onChange={(e) => {
            setCargando(true);
            setMeses(Number(e.target.value));
          }}
          className="w-44"
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value={24}>Últimos 24 meses</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <div className="text-sm text-gray-600">Vendido</div>
          <div className="text-2xl font-bold text-[#F26726]">{pesos(t?.total ?? 0)}</div>
          <div className="text-xs text-gray-500 -mt-2">
            {pesos(t?.base ?? 0)} + IVA {pesos(t?.iva ?? 0)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Pagos</div>
          <div className="text-2xl font-bold text-gray-900">{t?.pagos ?? 0}</div>
          <div className="text-xs text-gray-500 -mt-2">
            De {t?.empresasQuePagaron ?? 0} {t?.empresasQuePagaron === 1 ? 'empresa' : 'empresas'}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Ticket promedio</div>
          <div className="text-2xl font-bold text-gray-900">{pesos(t?.ticketPromedio ?? 0)}</div>
          <div className="text-xs text-gray-500 -mt-2">Por pago</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Cartera</div>
          <div className="text-2xl font-bold text-gray-900">
            {c?.alDia ?? 0} <span className="text-sm font-normal text-gray-500">al día</span>
          </div>
          <div className="text-xs text-gray-500 -mt-2">
            {c?.vencidas ?? 0} vencidas · {c?.sinPagar ?? 0} sin pagar · {c?.exentas ?? 0} exentas
          </div>
        </Card>
      </div>

      <AdminTable
        columnas={['Mes', 'Vendido', 'Pagos', 'Empresas', 'Altas']}
        cargando={cargando}
        vacio={!datos || datos.totales.pagos === 0}
        mensajeVacio="Todavía no hay pagos de suscripción en este periodo."
      >
        {[...(datos?.porMes ?? [])].reverse().map((f) => (
          <tr key={f.period} className="bg-white border-b">
            <td className="px-6 py-4 capitalize whitespace-nowrap">{nombreDelMes(f.period)}</td>
            <td className="px-6 py-4 min-w-[14rem]">
              <div className="font-medium text-gray-900">{pesos(f.total)}</div>
              <div className="mt-1 h-1.5 rounded bg-gray-100">
                <div
                  className="h-1.5 rounded bg-[#F26726]"
                  style={{ width: `${(f.total / maximo) * 100}%` }}
                />
              </div>
            </td>
            <td className="px-6 py-4">{f.pagos}</td>
            <td className="px-6 py-4">{f.empresas}</td>
            <td className="px-6 py-4">{f.altas}</td>
          </tr>
        ))}
      </AdminTable>

      {datos && datos.porMetodo.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Por método de pago</h3>
          <AdminTable
            columnas={['Método', 'Pagos', 'Vendido']}
            cargando={false}
            vacio={false}
            mensajeVacio=""
          >
            {datos.porMetodo.map((m) => (
              <tr key={m.method} className="bg-white border-b">
                <td className="px-6 py-4">{METODOS[m.method] ?? m.method}</td>
                <td className="px-6 py-4">{m.pagos}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{pesos(m.total)}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}
    </section>
  );
}
