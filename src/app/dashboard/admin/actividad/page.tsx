"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Select, TextInput } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { listAuditLogs, ROLE_LABELS, type AuditEntry } from '@/lib/api/admin';

const ACCION_LABELS: Record<string, string> = {
  CREATE: 'Creó',
  UPDATE: 'Modificó',
  DELETE: 'Eliminó',
};

const ACCION_COLORS: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'failure',
};

// Nombres legibles para el tipo de recurso que devuelve el API (el primer
// segmento de la ruta).
const RECURSO_LABELS: Record<string, string> = {
  companies: 'Empresa',
  users: 'Usuario',
  experiences: 'Experiencia',
  reservations: 'Reserva',
  locations: 'Sede',
  availabilities: 'Disponibilidad',
  quotes: 'Cotización',
  contacts: 'Contacto',
  'crm-companies': 'Empresa CRM',
  opportunities: 'Oportunidad',
  integrations: 'Integración',
  'api-keys': 'API key',
  auth: 'Autenticación',
  uploads: 'Archivo',
};

// Segundo segmento de /auth/*, para nombrar el evento por lo que es.
const AUTH_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  register: 'Registro de cuenta',
  'forgot-password': 'Solicitud de recuperación',
  'reset-password': 'Cambio de contraseña',
  oauth: 'Inicio de sesión con Google',
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminActividadPage() {
  const { showError } = useSweetAlert();

  const [entradas, setEntradas] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { items, total } = await listAuditLogs({
        search: busqueda || undefined,
        action: filtroAccion || undefined,
        pageSize: 100,
      });
      setEntradas(items);
      setTotal(total);
    } catch (err) {
      showError('No se pudo cargar la actividad', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroAccion, showError]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Actividad"
        descripcion="Quién cambió qué en la plataforma"
        total={total}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 max-w-2xl">
        <TextInput
          className="flex-1"
          icon={HiSearch}
          placeholder="Buscar por correo o ruta..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select
          value={filtroAccion}
          onChange={(e) => setFiltroAccion(e.target.value)}
          className="sm:w-52"
        >
          <option value="">Todas las acciones</option>
          {Object.keys(ACCION_LABELS).map((a) => (
            <option key={a} value={a}>
              {ACCION_LABELS[a]}
            </option>
          ))}
        </Select>
      </div>

      <AdminTable
        columnas={['Cuándo', 'Quién', 'Acción', 'Recurso', 'Empresa']}
        cargando={cargando}
        vacio={entradas.length === 0}
        mensajeVacio="Todavía no hay actividad registrada."
      >
        {entradas.map((e) => (
          <tr key={e.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-xs">{fecha(e.createdAt)}</td>
            <td className="px-6 py-4">
              <div className="text-gray-900">{e.actorEmail ?? 'Sistema'}</div>
              {e.actorRole && (
                <div className="text-xs text-gray-500">{ROLE_LABELS[e.actorRole]}</div>
              )}
            </td>
            <td className="px-6 py-4">
              <Badge color={ACCION_COLORS[e.action] ?? 'gray'} className="w-fit">
                {ACCION_LABELS[e.action] ?? e.action}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="text-gray-900">
                {/* /auth/login no es "crear una autenticación": lo nombramos
                    por lo que realmente ocurrio. */}
                {e.resourceType === 'auth'
                  ? (AUTH_LABELS[e.path.split('?')[0]?.split('/')[2] ?? ''] ?? 'Autenticación')
                  : (RECURSO_LABELS[e.resourceType] ?? e.resourceType)}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {e.method} {e.path}
              </div>
            </td>
            <td className="px-6 py-4 text-xs">
              {e.companyName ? (
                <span>
                  {e.companyName}
                  {e.actorRole === 'ADMIN' && (
                    <span className="block text-gray-400">actuando como</span>
                  )}
                </span>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </ProtectedRoute>
  );
}
