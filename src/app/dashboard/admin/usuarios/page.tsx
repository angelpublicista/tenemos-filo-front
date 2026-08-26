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
import { HiSearch, HiBan, HiRefresh, HiTrash, HiPlus, HiPencilAlt, HiMail } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable, { AdminHeader } from '@/components/Admin/AdminTable';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  listUsers,
  createUser,
  reenviarInvitacion,
  updateUserRole,
  setUserActive,
  deleteUser,
  actualizarUsuario,
  listCompanies,
  ROLE_LABELS,
  type AdminCompany,
  type DatosUsuario,
  type AdminUser,
  type ApiRole,
  type NewUser,
} from '@/lib/api/admin';

const ROLE_COLORS: Record<ApiRole, string> = {
  ADMIN: 'purple',
  HOST: 'info',
  GUEST: 'gray',
  RESELLER: 'warning',
};

export default function AdminUsuariosPage() {
  const { sanityUser } = useAuth();
  const { showSuccess, showError, showConfirmation, showDestructiveConfirmation } = useSweetAlert();

  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'' | ApiRole>('');
  const [creando, setCreando] = useState(false);

  // Edicion. Antes solo se podia cambiar el rol desde el desplegable de la
  // tabla; corregir un nombre mal escrito o mover a alguien de empresa
  // habia que hacerlo a mano contra el API.
  const [editando, setEditando] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<DatosUsuario>({});
  const [empresas, setEmpresas] = useState<AdminCompany[]>([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const nombreEmpresa = (id: string) => empresas.find((e) => e.id === id)?.companyName;

  const abrirEdicion = async (u: AdminUser) => {
    setEditando(u);
    setForm({
      name: u.name ?? '',
      phone: u.phone ?? '',
      role: u.role,
      companyId: u.companyId,
    });
    if (empresas.length === 0) {
      try {
        const { items } = await listCompanies({ pageSize: 100 });
        setEmpresas(items.filter((e) => !e.deletedAt));
      } catch {
        // Sin la lista el resto del formulario sigue sirviendo; solo se
        // pierde poder reasignar la empresa.
      }
    }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardandoEdicion(true);
    try {
      await actualizarUsuario(editando.id, {
        name: form.name?.trim() || undefined,
        phone: form.phone?.trim() || null,
        role: form.role,
        companyId: form.companyId || null,
      });
      showSuccess('Usuario actualizado', form.name?.trim() || editando.email);
      setEditando(null);
      await cargar();
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardandoEdicion(false);
    }
  };
  const [guardando, setGuardando] = useState(false);
  const [nuevo, setNuevo] = useState<NewUser>({
    email: '',
    password: '',
    name: '',
    role: 'GUEST',
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { items, total } = await listUsers({
        search: busqueda || undefined,
        role: filtroRol || undefined,
        pageSize: 50,
      });
      setUsuarios(items);
      setTotal(total);
    } catch (err) {
      showError('No se pudieron cargar los usuarios', err instanceof Error ? err.message : undefined);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroRol, showError]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  const crear = async () => {
    if (!nuevo.email.trim()) return;
    setGuardando(true);
    try {
      const { meta } = await createUser({ ...nuevo, name: nuevo.name?.trim() || undefined });
      // Se dice lo que realmente ocurrio. Si el correo no salio, anunciar
      // "le enviamos una invitación" dejaria al admin esperando a alguien
      // que nunca va a entrar.
      if (meta?.invitacionEnviada) {
        showSuccess('Usuario creado', `Le enviamos a ${nuevo.email} un enlace para elegir su contraseña.`);
      } else {
        showError(
          'Usuario creado, pero sin invitación',
          'No se pudo enviar el correo. Reenvíalo desde la lista cuando esté resuelto.',
        );
      }
      setCreando(false);
      setNuevo({ email: '', name: '', role: 'GUEST' });
      await cargar();
    } catch (err) {
      showError('No se pudo crear el usuario', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const reinvitar = async (u: AdminUser) => {
    try {
      await reenviarInvitacion(u.id);
      showSuccess('Invitación reenviada', `Enlace nuevo enviado a ${u.email}.`);
    } catch (err) {
      showError('No se pudo reenviar', err instanceof Error ? err.message : undefined);
    }
  };

  const cambiarRol = async (u: AdminUser, rol: ApiRole) => {
    if (rol === u.role) return;
    // RESELLER da acceso entre empresas y ADMIN gestiona la plataforma:
    // conviene que no sea un cambio de un clic sin confirmar.
    if (rol === 'ADMIN' || rol === 'RESELLER') {
      const ok = await showConfirmation(
        `¿Dar rol ${ROLE_LABELS[rol]}?`,
        rol === 'ADMIN'
          ? `${u.email} podrá ver y gestionar TODAS las empresas, usuarios y experiencias.`
          : `${u.email} podrá ver disponibilidad y cotizaciones de todas las empresas.`,
        'Sí, cambiar rol',
      );
      if (!ok) return;
    }

    try {
      await updateUserRole(u.id, rol);
      showSuccess('Rol actualizado');
      await cargar();
    } catch (err) {
      showError('No se pudo cambiar el rol', err instanceof Error ? err.message : undefined);
    }
  };

  const alternarActivo = async (u: AdminUser) => {
    const desactivar = u.isActive;
    const ok = await showConfirmation(
      desactivar ? '¿Desactivar usuario?' : '¿Reactivar usuario?',
      desactivar ? `${u.email} no podrá iniciar sesión.` : `${u.email} podrá volver a entrar.`,
      desactivar ? 'Sí, desactivar' : 'Sí, reactivar',
    );
    if (!ok) return;

    try {
      await setUserActive(u.id, !u.isActive);
      showSuccess(desactivar ? 'Usuario desactivado' : 'Usuario reactivado');
      await cargar();
    } catch (err) {
      showError('No se pudo completar la acción', err instanceof Error ? err.message : undefined);
    }
  };

  const eliminar = async (u: AdminUser) => {
    const ok = await showDestructiveConfirmation(
      '¿Eliminar usuario?',
      `Se eliminará ${u.email}. Si solo quieres bloquearle el acceso, usa "desactivar".`,
      'Sí, eliminar',
    );
    if (!ok) return;

    try {
      await deleteUser(u.id);
      showSuccess('Usuario eliminado');
      await cargar();
    } catch (err) {
      showError('No se pudo eliminar', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader
        titulo="Usuarios"
        descripcion="Todos los usuarios registrados en la plataforma"
        total={total}
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <TextInput
          className="flex-1 max-w-md"
          icon={HiSearch}
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as '' | ApiRole)}
          className="sm:w-52"
        >
          <option value="">Todos los roles</option>
          {(Object.keys(ROLE_LABELS) as ApiRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Button color="primary" onClick={() => setCreando(true)} className="sm:ml-auto">
          <HiPlus className="w-4 h-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      <Modal show={creando} onClose={() => setCreando(false)} size="md">
        <ModalHeader>Nuevo usuario</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
              No tienes que elegir su contraseña. Al crear la cuenta le llega un correo con
              un enlace para que ponga la suya; caduca en 7 días.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
              <TextInput
                type="email"
                value={nuevo.email}
                onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                placeholder="persona@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <TextInput
                value={nuevo.name ?? ''}
                onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <Select
                value={nuevo.role}
                onChange={(e) => setNuevo({ ...nuevo, role: e.target.value as ApiRole })}
              >
                {(Object.keys(ROLE_LABELS) as ApiRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={crear} disabled={guardando || !nuevo.email.trim()}>
            {guardando ? 'Creando...' : 'Crear e invitar'}
          </Button>
          <Button color="light" onClick={() => setCreando(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      <AdminTable
        columnas={['Usuario', 'Rol', 'Empresa', 'Estado', 'Acciones']}
        cargando={cargando}
        vacio={usuarios.length === 0}
        mensajeVacio="No se encontraron usuarios."
      >
        {usuarios.map((u) => {
          // Evita que el admin se quite a si mismo el acceso por accidente.
          const esYo = u.id === sanityUser?._id;
          return (
            <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">
                  {u.name ?? '—'}
                  {esYo && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
                </div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </td>
              <td className="px-6 py-4">
                {esYo ? (
                  <Badge color={ROLE_COLORS[u.role]} className="w-fit">
                    {ROLE_LABELS[u.role]}
                  </Badge>
                ) : (
                  <Select
                    sizing="sm"
                    value={u.role}
                    onChange={(e) => cambiarRol(u, e.target.value as ApiRole)}
                  >
                    {(Object.keys(ROLE_LABELS) as ApiRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                )}
              </td>
              <td className="px-6 py-4 text-xs">
                {u.companyId ? (nombreEmpresa(u.companyId) ?? 'Sí') : '—'}
              </td>
              <td className="px-6 py-4">
                <Badge color={u.isActive ? 'success' : 'gray'} className="w-fit">
                  {u.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Button size="xs" color="light" onClick={() => abrirEdicion(u)} title="Editar">
                    <HiPencilAlt className="w-4 h-4" />
                  </Button>
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => reinvitar(u)}
                    disabled={!u.isActive}
                    title="Reenviar invitación para elegir contraseña"
                  >
                    <HiMail className="w-4 h-4" />
                  </Button>
                  <Button
                    size="xs"
                    color={u.isActive ? 'failure' : 'success'}
                    onClick={() => alternarActivo(u)}
                    disabled={esYo}
                    title={u.isActive ? 'Desactivar' : 'Reactivar'}
                  >
                    {u.isActive ? <HiBan className="w-4 h-4" /> : <HiRefresh className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="xs"
                    color="danger"
                    onClick={() => eliminar(u)}
                    disabled={esYo}
                    title="Eliminar"
                  >
                    <HiTrash className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <Modal show={!!editando} onClose={() => setEditando(null)} size="md">
        <ModalHeader>Editar usuario</ModalHeader>
        <ModalBody>
          {editando && (
            <div className="space-y-4">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{editando.email}</div>
                <div className="text-xs text-gray-500">
                  El correo no se cambia desde aquí: es con lo que inicia sesión.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <TextInput
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <TextInput
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <Select
                  value={form.role ?? editando.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ApiRole }))}
                >
                  {(Object.keys(ROLE_LABELS) as ApiRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <Select
                  value={form.companyId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value || null }))}
                >
                  <option value="">Sin empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.companyName}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  La empresa en la que trabaja. Para cambiar quién es su titular, ve a Empresas.
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={guardarEdicion} disabled={guardandoEdicion}>
            {guardandoEdicion ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button color="secondary" onClick={() => setEditando(null)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
