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
import { HiSearch, HiPencilAlt, HiBan, HiRefresh, HiPlus, HiUser } from 'react-icons/hi';
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
  ROLE_LABELS,
  transferirTitularidad,
  ROLES_TITULARES,
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

  // Cambio de titular. Su lista es distinta de la de creacion: excluye al
  // titular actual, que no puede transferirse la empresa a si mismo.
  const [transfiriendo, setTransfiriendo] = useState<AdminCompany | null>(null);
  const [candidatosTitular, setCandidatosTitular] = useState<AdminUser[]>([]);
  const [nuevoTitular, setNuevoTitular] = useState('');
  const [guardandoTitular, setGuardandoTitular] = useState(false);

  /**
   * Usuarios que pueden ser titulares de una empresa: anfitriones y
   * revendedores. Se pide una pagina por rol en vez de un listado general
   * porque viene ordenado por fecha de alta y los comensales, que son la
   * mayoria, se comen el cupo y dejan fuera justo a quien buscamos.
   */
  const cargarTitulares = useCallback(async () => {
    const listas = await Promise.all(
      ROLES_TITULARES.map((role) => listUsers({ role, pageSize: 100 })),
    );
    return listas.flatMap((l) => l.items).filter((u) => u.isActive);
  }, []);

  const abrirTitularidad = async (e: AdminCompany) => {
    setTransfiriendo(e);
    setNuevoTitular('');
    setCandidatosTitular([]);
    try {
      const items = await cargarTitulares();
      setCandidatosTitular(items.filter((u) => u.id !== e.owner?.id));
    } catch (err) {
      showError('No se pudieron cargar los candidatos', err instanceof Error ? err.message : undefined);
    }
  };

  const confirmarTitularidad = async () => {
    if (!transfiriendo || !nuevoTitular) return;
    setGuardandoTitular(true);
    try {
      await transferirTitularidad(transfiriendo.id, nuevoTitular);
      const nombre = candidatosTitular.find((c) => c.id === nuevoTitular);
      showSuccess(
        'Titularidad transferida',
        `${transfiriendo.companyName} ahora es de ${nombre?.name ?? nombre?.email ?? 'otro usuario'}.`,
      );
      setTransfiriendo(null);
      await cargar();
    } catch (err) {
      showError('No se pudo transferir', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardandoTitular(false);
    }
  };

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

  // Los titulares posibles son anfitriones y revendedores, igual que en el
  // cambio de titular. Pedir solo HOST dejaba a los revendedores sin forma
  // de tener empresa, y sin empresa su catalogo y sus claves de API no
  // existen: el panel les decia que no estaban asociados a ninguna y el
  // alta no los ofrecia como dueños.
  const abrirCreacion = async () => {
    setCreando(true);
    setNombreNuevo('');
    setOwnerNuevo('');
    try {
      setCandidatos(await cargarTitulares());
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
      showSuccess('Empresa creada', `Quedó a nombre de ${duenio?.email ?? 'el titular elegido'}.`);
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
                Titular de la empresa *
              </label>
              {candidatos.length === 0 ? (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  No hay usuarios con rol Anfitrión ni Revendedor. Crea uno primero en{' '}
                  <Link href="/dashboard/admin/usuarios" className="underline font-medium">
                    Usuarios
                  </Link>
                  .
                </div>
              ) : (
                <Select value={ownerNuevo} onChange={(e) => setOwnerNuevo(e.target.value)}>
                  <option value="">Elige un titular...</option>
                  {candidatos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email} — {u.email} · {ROLE_LABELS[u.role]}
                    </option>
                  ))}
                </Select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Las empresas pertenecen a anfitriones y revendedores: los dos operan un
                negocio dentro de la plataforma. Como administrador gestionas las de ellos,
                pero no tienes empresa ni experiencias propias.
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
                  color="light"
                  onClick={() => abrirTitularidad(e)}
                  title="Cambiar titular"
                  disabled={!!e.deletedAt}
                >
                  <HiUser className="w-4 h-4" />
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

      <Modal show={!!transfiriendo} onClose={() => setTransfiriendo(null)} size="md">
        <ModalHeader>Cambiar titular</ModalHeader>
        <ModalBody>
          {transfiriendo && (
            <div className="space-y-4">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{transfiriendo.companyName}</div>
                <div className="text-gray-600">
                  Titular actual: {transfiriendo.owner?.name ?? transfiriendo.owner?.email ?? '—'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo titular *
                </label>
                <Select value={nuevoTitular} onChange={(e) => setNuevoTitular(e.target.value)}>
                  <option value="">Selecciona un usuario</option>
                  {candidatosTitular.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.email} · {ROLE_LABELS[c.role]}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Solo aparecen anfitriones y revendedores activos: son los roles que pueden
                  operar un negocio en la plataforma.
                </p>
              </div>

              <p className="text-xs text-gray-500">
                El titular anterior conserva su acceso como miembro; deja de ser quien puede
                editar la empresa.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={confirmarTitularidad}
            disabled={guardandoTitular || !nuevoTitular}
          >
            {guardandoTitular ? 'Transfiriendo...' : 'Transferir'}
          </Button>
          <Button color="secondary" onClick={() => setTransfiriendo(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
