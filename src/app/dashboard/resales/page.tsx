"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Badge, Button, Select, Spinner, TextInput } from 'flowbite-react';
import { AiOutlineDollar, AiOutlineCalendar, AiOutlineSearch, AiOutlineRise } from 'react-icons/ai';
import {
  getResales,
  formatCOP,
  Resale,
  ResaleStatus,
} from '@/lib/sanity/resellerService';

const STATUS_LABELS: Record<ResaleStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLOR: Record<ResaleStatus, 'warning' | 'info' | 'success' | 'failure'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'failure',
};

export default function ResalesPage() {
  const [resales, setResales] = useState<Resale[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ResaleStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResales({ status });
      setResales(data);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return resales;
    const q = query.toLowerCase();
    return resales.filter(
      (r) =>
        r.experienceTitle.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.resaleNumber.toLowerCase().includes(q),
    );
  }, [resales, query]);

  const totals = useMemo(() => {
    const validResales = filtered.filter((r) => r.status !== 'cancelled');
    return {
      count: validResales.length,
      commission: validResales.reduce((acc, r) => acc + r.commissionAmount, 0),
      total: validResales.reduce((acc, r) => acc + r.total, 0),
    };
  }, [filtered]);

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mis reventas
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Historial de reventas realizadas a través de tus links, con detalle de comisiones.
          </p>
        </div>

        {/* Totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reventas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {totals.count}
                </p>
              </div>
              <div className="bg-[#19A3A2] p-2 rounded-lg">
                <AiOutlineCalendar className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Comisión total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCOP(totals.commission)}
                </p>
              </div>
              <div className="bg-[#F26726] p-2 rounded-lg">
                <AiOutlineDollar className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Volumen vendido</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCOP(totals.total)}
                </p>
              </div>
              <div className="bg-[#E23694] p-2 rounded-lg">
                <AiOutlineRise className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextInput
              icon={AiOutlineSearch}
              placeholder="Buscar por experiencia, cliente o número..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value as ResaleStatus | 'all')}>
              <option value="all">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as ResaleStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">No hay reventas con esos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      N°
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Experiencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Reserva
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Pax
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Comisión
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                        {r.resaleNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">{r.experienceTitle}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.hostCompanyName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div>{r.clientName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.clientEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(r.reservationDate).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                        {r.participants}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                        {formatCOP(r.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="font-semibold text-[#19A3A2]">
                          {formatCOP(r.commissionAmount)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.commissionPercent}%</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge color={STATUS_COLOR[r.status]} className="inline-block">
                          {STATUS_LABELS[r.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button color="gray" disabled>
            Exportar CSV (próximamente)
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
