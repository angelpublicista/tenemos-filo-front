"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Select, TextInput } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { listCompanies } from '@/lib/api/admin';
import {
  listVentasPropias,
  type TotalesDeVentasPropias,
  type VentaPropia,
} from '@/lib/api/fees';
import { pesos } from '@/lib/dinero';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const POR_PAGINA = 20;

export default function AdminVentasPage() {
  const { showError } = useSweetAlert();

  const [ventas, setVentas] = useState<VentaPropia[]>([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState<TotalesDeVentasPropias>({
    vendido: 0,
    filoCommission: 0,
    resellerCommission: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [mes, setMes] = useState('');
  const [cobro, setCobro] = useState<'' | 'PLATFORM' | 'HOST'>('');
  const [canal, setCanal] = useState<'' | 'RESELLER' | 'DIRECTO'>('');

  useEffect(() => {
    listCompanies({ pageSize: 100 })
      .then(({ items }) =>
        setEmpresas(
          items.filter((e) => !e.deletedAt).map((e) => ({ id: e.id, nombre: e.companyName })),
        ),
      )
      .catch(() => {
        // Sin la lista el filtro por empresa no se ofrece; lo demás sigue.
      });
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listVentasPropias({
        companyId: empresa,
        period: mes,
        cobro: cobro || undefined,
        canal: canal || undefined,
        page: pagina,
        pageSize: POR_PAGINA,
      });
      setVentas(r.items);
      setTotal(r.total);
      setTotales(r.totals);
    } catch (err) {
      showError('No se pudieron cargar las ventas', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [empresa, mes, cobro, canal, pagina, showError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Ventas"
        descripcion="Todas las reservas pagadas, cobradas por Tenemos Filo o por el anfitrión con su propia pasarela"
        total={total}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <div className="text-sm text-gray-600">Vendido</div>
          <div className="text-2xl font-bold text-gray-900">{pesos(totales.vendido)}</div>
          <div className="text-xs text-gray-500 -mt-2">Con el filtro actual</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Comisión de Tenemos Filo</div>
          <div className="text-2xl font-bold text-[#F26726]">{pesos(totales.filoCommission)}</div>
          <div className="text-xs text-gray-500 -mt-2">En ventas del anfitrión se le cobra a él; en las de FILO ya la retuvo</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Comisión de revendedores</div>
          <div className="text-2xl font-bold text-gray-900">{pesos(totales.resellerCommission)}</div>
          <div className="text-xs text-gray-500 -mt-2">Lo que les corresponde a los canales de venta</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          aria-label="Empresa"
          value={empresa}
          onChange={(e) => {
            setEmpresa(e.target.value);
            setPagina(1);
          }}
          className="w-60"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Select>
        <TextInput
          type="month"
          aria-label="Mes"
          value={mes}
          onChange={(e) => {
            setMes(e.target.value);
            setPagina(1);
          }}
          className="w-48"
        />
        <Select
          aria-label="Pasarela"
          value={cobro}
          onChange={(e) => {
            setCobro(e.target.value as '' | 'PLATFORM' | 'HOST');
            setPagina(1);
          }}
          className="w-56"
        >
          <option value="">Todas las pasarelas</option>
          <option value="PLATFORM">Cobradas por Tenemos Filo</option>
          <option value="HOST">Cobradas por el anfitrión</option>
        </Select>
        <Select
          aria-label="Origen"
          value={canal}
          onChange={(e) => {
            setCanal(e.target.value as '' | 'RESELLER' | 'DIRECTO');
            setPagina(1);
          }}
          className="w-56"
        >
          <option value="">Directas y de revendedores</option>
          <option value="RESELLER">Solo por revendedores</option>
          <option value="DIRECTO">Solo directas</option>
        </Select>
        {(empresa || mes || cobro || canal) && (
          <Button
            size="xs"
            color="light"
            onClick={() => {
              setEmpresa('');
              setMes('');
              setCobro('');
              setCanal('');
              setPagina(1);
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <AdminTable
        columnas={['Fecha', 'Reserva', 'Empresa', 'Experiencia', 'Origen', 'Cobró', 'Total', 'Comisión FILO', 'Comisión revendedor']}
        cargando={cargando}
        vacio={ventas.length === 0}
        mensajeVacio="No hay ventas pagadas para este filtro."
      >
        {ventas.map((v) => (
          <tr key={v.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-xs whitespace-nowrap">{fecha(v.reservationDate)}</td>
            <td className="px-6 py-4 font-medium text-gray-900">{v.reservationNumber}</td>
            <td className="px-6 py-4">{v.companyName}</td>
            <td className="px-6 py-4">{v.experienceTitle ?? '—'}</td>
            <td className="px-6 py-4 text-xs">
              {v.resellerName ? `Revendedor: ${v.resellerName}` : 'Directa'}
            </td>
            <td className="px-6 py-4 text-xs">
              {v.collectedBy === 'HOST' ? 'Anfitrión' : 'Tenemos Filo'}
            </td>
            <td className="px-6 py-4">{pesos(v.total)}</td>
            <td className="px-6 py-4">{pesos(v.filoCommission)}</td>
            <td className="px-6 py-4 text-gray-500">
              {v.resellerCommission > 0 ? pesos(v.resellerCommission) : '—'}
            </td>
          </tr>
        ))}
      </AdminTable>

      {paginas > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>
            Página {pagina} de {paginas} · {total} ventas
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
    </ProtectedRoute>
  );
}
