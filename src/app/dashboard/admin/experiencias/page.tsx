"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  TextInput,
} from 'flowbite-react';
import { HiSearch, HiTrash, HiCurrencyDollar } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import CommissionInput from '@/components/Admin/CommissionInput';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  listExperiences,
  updateExperienceStatus,
  updateExperienceCommissions,
  deleteExperience,
  getSettings,
  formatoComision,
  type AdminExperience,
  type Comisiones,
  type PlatformSettings,
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
  const { showSuccess, showError, showDestructiveConfirmation } = useSweetAlert();

  const [experiencias, setExperiencias] = useState<AdminExperience[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [ajustes, setAjustes] = useState<PlatformSettings | null>(null);
  const [editando, setEditando] = useState<AdminExperience | null>(null);
  const [comisiones, setComisiones] = useState<Comisiones | null>(null);
  const [guardando, setGuardando] = useState(false);

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

  // Los valores por defecto se usan para mostrar de qué hereda cada una.
  useEffect(() => {
    getSettings().then(setAjustes).catch(() => setAjustes(null));
  }, []);

  const abrirComisiones = (exp: AdminExperience) => {
    setEditando(exp);
    setComisiones({
      filoCommissionType: exp.filoCommissionType ?? null,
      filoCommissionValue: exp.filoCommissionValue ?? null,
      resellerCommissionType: exp.resellerCommissionType ?? null,
      resellerCommissionValue: exp.resellerCommissionValue ?? null,
    });
  };

  const guardarComisiones = async () => {
    if (!editando || !comisiones) return;
    setGuardando(true);
    try {
      await updateExperienceCommissions(editando.id, comisiones);
      showSuccess('Comisiones actualizadas', 'Aplican a las reservas nuevas.');
      setEditando(null);
      await cargar();
    } catch (err) {
      showError('No se pudieron guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const porDefecto = (cual: 'filo' | 'reseller') =>
    ajustes
      ? {
          tipo: cual === 'filo' ? ajustes.filoCommissionType : ajustes.resellerCommissionType,
          valor: cual === 'filo' ? ajustes.filoCommissionValue : ajustes.resellerCommissionValue,
        }
      : undefined;

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
    const ok = await showDestructiveConfirmation(
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
        columnas={['Experiencia', 'Empresa', 'Precio', 'Comisiones', 'Estado', 'Acciones']}
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
            <td className="px-6 py-4 text-xs">
              <div>
                <span className="text-gray-400">FILO </span>
                {formatoComision(
                  exp.filoCommissionType ?? null,
                  exp.filoCommissionValue ?? null,
                  porDefecto('filo'),
                )}
              </div>
              <div>
                <span className="text-gray-400">Rev. </span>
                {formatoComision(
                  exp.resellerCommissionType ?? null,
                  exp.resellerCommissionValue ?? null,
                  porDefecto('reseller'),
                )}
              </div>
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
              <div className="flex gap-2">
                <Button
                  size="xs"
                  color="light"
                  onClick={() => abrirComisiones(exp)}
                  title="Comisiones"
                >
                  <HiCurrencyDollar className="w-4 h-4" />
                </Button>
                <Button size="xs" color="danger" onClick={() => eliminar(exp)} title="Eliminar">
                  <HiTrash className="w-4 h-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal show={!!editando} onClose={() => setEditando(null)} size="lg">
        <ModalHeader>Comisiones — {editando?.title}</ModalHeader>
        <ModalBody>
          {comisiones && (
            <div className="space-y-4">
              <CommissionInput
                etiqueta="Comisión de Tenemos Filo"
                ayuda="Se cobra en todas las reservas de esta experiencia."
                tipo={comisiones.filoCommissionType}
                valor={comisiones.filoCommissionValue}
                heredable={{
                  texto: formatoComision(null, null, porDefecto('filo')),
                }}
                onChange={(tipo, valor) =>
                  setComisiones({
                    ...comisiones,
                    filoCommissionType: tipo,
                    filoCommissionValue: valor,
                  })
                }
              />

              <CommissionInput
                etiqueta="Comisión de revendedor"
                ayuda="Solo se cobra si la reserva entra por un revendedor o el catálogo público."
                tipo={comisiones.resellerCommissionType}
                valor={comisiones.resellerCommissionValue}
                heredable={{
                  texto: formatoComision(null, null, porDefecto('reseller')),
                }}
                onChange={(tipo, valor) =>
                  setComisiones({
                    ...comisiones,
                    resellerCommissionType: tipo,
                    resellerCommissionValue: valor,
                  })
                }
              />

              <p className="text-xs text-gray-500">
                Las comisiones se descuentan del total: el anfitrión recibe el resto. Solo
                afectan a las reservas nuevas, no a las ya registradas.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={guardarComisiones} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button color="light" onClick={() => setEditando(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
