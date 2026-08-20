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
import { HiSearch, HiPencilAlt, HiBan, HiRefresh, HiPlus } from 'react-icons/hi';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  listCompanies,
  listUsers,
  createCompany,
  updateCompany,
  deactivateCompany,
  restoreCompany,
  type AdminCompany,
  type AdminUser,
} from '@/lib/api/admin';

export default function AdminEmpresasPage() {
  const { sanityUser } = useAuth();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();

  const [empresas, setEmpresas] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<AdminCompany | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [ownerNuevo, setOwnerNuevo] = useState('');
  const [candidatos, setCandidatos] = useState<AdminUser[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { items, total } = await listCompanies({ search: busqueda || undefined, pageSize: 50 });
      setEmpresas(items);
      setTotal(total);
    } catch (err) {
      showError('No se pudieron cargar las empresas', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [busqueda, showError]);

  // Debounce para no pegarle al API en cada tecla
  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  // Los dueños posibles son anfitriones: cargamos la lista al abrir el alta.
  const abrirCreacion = async () => {
    setCreando(true);
    setNombreNuevo('');
    setOwnerNuevo('');
    try {
      const { items } = await listUsers({ role: 'HOST', pageSize: 100 });
      setCandidatos(items);
    } catch {
      setCandidatos([]);
    }
  };

  const crear = async () => {
    if (!nombreNuevo.trim() || !ownerNuevo) return;
    setGuardando(true);
    try {
      const duenio = candidatos.find((u) => u.id === ownerNuevo);
      await createCompany({ companyName: nombreNuevo.trim(), ownerId: ownerNuevo });
      showSuccess('Empresa creada', `Quedó a nombre de ${duenio?.email ?? 'el anfitrión elegido'}.`);
      setCreando(false);
      await cargar();
    } catch (err) {
      showError('No se pudo crear la empresa', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = (empresa: AdminCompany) => {
    setEditando(empresa);
    setNombreEdit(empresa.companyName);
  };

  const guardar = async () => {
    if (!editando || !nombreEdit.trim()) return;
    setGuardando(true);
    try {
      await updateCompany(editando.id, { companyName: nombreEdit.trim() });
      showSuccess('Empresa actualizada');
      setEditando(null);
      await cargar();
    } catch (err) {
      showError('No se pudo actualizar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActiva = async (empresa: AdminCompany) => {
    const desactivar = !empresa.deletedAt;
    const ok = await showConfirmation(
      desactivar ? '¿Desactivar empresa?' : '¿Reactivar empresa?',
      desactivar
        ? `"${empresa.companyName}" dejará de estar disponible. Sus datos se conservan y puedes reactivarla luego.`
        : `"${empresa.companyName}" volverá a estar activa.`,
      desactivar ? 'Sí, desactivar' : 'Sí, reactivar',
    );
    if (!ok) return;

    try {
      await (desactivar ? deactivateCompany(empresa.id) : restoreCompany(empresa.id));
      showSuccess(desactivar ? 'Empresa desactivada' : 'Empresa reactivada');
      await cargar();
    } catch (err) {
      showError('No se pudo completar la acción', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Empresas"
        descripcion="Todas las empresas registradas en la plataforma"
        total={total}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <TextInput
          className="flex-1 max-w-md"
          icon={HiSearch}
          placeholder="Buscar por nombre, slug o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Button color="primary" onClick={abrirCreacion} className="sm:ml-auto">
          <HiPlus className="w-4 h-4 mr-2" />
          Nueva empresa
        </Button>
      </div>

      <Modal show={creando} onClose={() => setCreando(false)} size="md">
        <ModalHeader>Nueva empresa</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la empresa *
              </label>
              <TextInput
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Ej. Cocina del Valle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anfitrión dueño *
              </label>
              {candidatos.length === 0 ? (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  No hay usuarios con rol Anfitrión. Crea uno primero en{' '}
                  <Link href="/dashboard/admin/usuarios" className="underline font-medium">
                    Usuarios
                  </Link>
                  .
                </div>
              ) : (
                <Select value={ownerNuevo} onChange={(e) => setOwnerNuevo(e.target.value)}>
                  <option value="">Elige un anfitrión...</option>
                  {candidatos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email} — {u.email}
                    </option>
                  ))}
                </Select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Las empresas pertenecen a anfitriones. Como administrador gestionas las de
                ellos, pero no tienes empresa ni experiencias propias: para eso, crea un
                usuario con rol Anfitrión.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={crear}
            disabled={guardando || !nombreNuevo.trim() || !ownerNuevo}
          >
            {guardando ? 'Creando...' : 'Crear empresa'}
          </Button>
          <Button color="light" onClick={() => setCreando(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      <AdminTable
        columnas={['Empresa', 'Dueño', 'Usuarios', 'Experiencias', 'Estado', 'Acciones']}
        cargando={cargando}
        vacio={empresas.length === 0}
        mensajeVacio="No se encontraron empresas."
      >
        {empresas.map((e) => (
          <tr key={e.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{e.companyName}</div>
              <div className="text-xs text-gray-500">/{e.slug}</div>
            </td>
            <td className="px-6 py-4">
              {e.owner ? (
                <>
                  <div>{e.owner.name ?? '—'}</div>
                  <div className="text-xs text-gray-500">{e.owner.email}</div>
                </>
              ) : (
                '—'
              )}
            </td>
            <td className="px-6 py-4">{e._count.users}</td>
            <td className="px-6 py-4">{e._count.experiences}</td>
            <td className="px-6 py-4">
              <Badge color={e.deletedAt ? 'gray' : 'success'} className="w-fit">
                {e.deletedAt ? 'Desactivada' : 'Activa'}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button size="xs" color="light" onClick={() => abrirEdicion(e)} title="Editar">
                  <HiPencilAlt className="w-4 h-4" />
                </Button>
                <Button
                  size="xs"
                  color={e.deletedAt ? 'success' : 'failure'}
                  onClick={() => alternarActiva(e)}
                  title={e.deletedAt ? 'Reactivar' : 'Desactivar'}
                >
                  {e.deletedAt ? <HiRefresh className="w-4 h-4" /> : <HiBan className="w-4 h-4" />}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Modal show={!!editando} onClose={() => setEditando(null)} size="md">
        <ModalHeader>Editar empresa</ModalHeader>
        <ModalBody>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la empresa
          </label>
          <TextInput
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
            placeholder="Nombre"
          />
          <p className="text-xs text-gray-500 mt-2">
            Cambiar el nombre regenera el slug público de la empresa.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={guardar} disabled={guardando || !nombreEdit.trim()}>
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
