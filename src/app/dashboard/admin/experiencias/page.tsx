"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Select, TextInput } from 'flowbite-react';
import { HiSearch, HiTrash } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  listExperiences,
  updateExperienceStatus,
  deleteExperience,
  type AdminExperience,
} from '@/lib/api/admin';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'gray',
};

export default function AdminExperienciasPage() {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [experiencias, setExperiencias] = useState<AdminExperience[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { items, total } = await listExperiences({
        search: busqueda || undefined,
        pageSize: 50,
      });
      setExperiencias(items);
      setTotal(total);
    } catch (err) {
      showError(
        'No se pudieron cargar las experiencias',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setCargando(false);
    }
  }, [busqueda, showError]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  const cambiarEstado = async (exp: AdminExperience, status: string) => {
    if (status === exp.status) return;
    try {
      await updateExperienceStatus(exp.id, status);
      showSuccess('Estado actualizado');
      await cargar();
    } catch (err) {
      showError('No se pudo cambiar el estado', err instanceof Error ? err.message : undefined);
    }
  };

  const eliminar = async (exp: AdminExperience) => {
    const ok = await showConfirmation(
      '¿Eliminar experiencia?',
      `"${exp.title}" dejará de estar disponible. Los datos se conservan (borrado lógico).`,
      'Sí, eliminar',
    );
    if (!ok) return;

    try {
      await deleteExperience(exp.id);
      showSuccess('Experiencia eliminada');
      await cargar();
    } catch (err) {
      showError('No se pudo eliminar', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Experiencias"
        descripcion="Todas las experiencias de todas las empresas"
        total={total}
      />

      <div className="mb-4 max-w-md">
        <TextInput
          icon={HiSearch}
          placeholder="Buscar por título o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <AdminTable
        columnas={['Experiencia', 'Empresa', 'Precio', 'Estado', 'Acciones']}
        cargando={cargando}
        vacio={experiencias.length === 0}
        mensajeVacio="No se encontraron experiencias."
      >
        {experiencias.map((exp) => (
          <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{exp.title}</div>
              <div className="text-xs text-gray-500">/{exp.slug}</div>
            </td>
            <td className="px-6 py-4">{exp.company?.companyName ?? '—'}</td>
            <td className="px-6 py-4">
              {exp.basePrice != null
                ? new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(Number(exp.basePrice))
                : '—'}
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Badge color={STATUS_COLORS[exp.status] ?? 'gray'} className="w-fit">
                  {STATUS_LABELS[exp.status] ?? exp.status}
                </Badge>
                <Select
                  sizing="sm"
                  value={exp.status}
                  onChange={(e) => cambiarEstado(exp, e.target.value)}
                >
                  {Object.keys(STATUS_LABELS).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </td>
            <td className="px-6 py-4">
              <Button size="xs" color="light" onClick={() => eliminar(exp)} title="Eliminar">
                <HiTrash className="w-4 h-4" />
              </Button>
            </td>
          </tr>
        ))}
      </AdminTable>
    </ProtectedRoute>
  );
}
