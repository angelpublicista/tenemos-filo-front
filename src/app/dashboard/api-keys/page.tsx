"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from 'flowbite-react';
import { HiClipboardCopy, HiExclamationCircle, HiExternalLink, HiKey } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminTable from '@/components/Admin/AdminTable';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { ApiHttpError, mensajeDeError } from '@/lib/api/client';
import {
  crearApiKey,
  listarApiKeys,
  PERMISOS,
  revocarApiKey,
  type ApiKey,
  type ApiKeyRecienCreada,
} from '@/lib/api/apiKeys';

// La documentacion la sirve el API, no el front: enlazar a /docs a secas
// llevaria a una ruta que aqui no existe.
const URL_DOCS = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/docs`;

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

type Estado = 'activa' | 'revocada' | 'expirada';

function estadoDe(k: ApiKey): Estado {
  if (k.revokedAt) return 'revocada';
  if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return 'expirada';
  return 'activa';
}

export default function ApiKeysPage() {
  const { sanityUser } = useAuth();
  const { showError, showSuccess, showDestructiveConfirmation } = useSweetAlert();

  const [claves, setClaves] = useState<ApiKey[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinEmpresa, setSinEmpresa] = useState(false);

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [scopes, setScopes] = useState<string[]>(['experiences:read']);
  const [guardando, setGuardando] = useState(false);

  const [reciencreada, setRecienCreada] = useState<ApiKeyRecienCreada | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Las claves de un admin salen a nombre de Tenemos Filo: la plataforma
  // tambien vende por su canal, y esas ventas se le atribuyen. No hay nada
  // que elegir, asi que no se le pregunta.
  const esAdmin = sanityUser?.role === 'admin';

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setClaves(await listarApiKeys());
      setSinEmpresa(false);
    } catch (err) {
      // El API responde 403 cuando la cuenta no tiene empresa asociada. No
      // es un fallo: es que falta un paso previo, y conviene decirlo asi.
      if (err instanceof ApiHttpError && err.status === 403) {
        // Para un admin no es un bloqueo: elige la empresa al crear.
        setSinEmpresa(!esAdmin);
      } else if (err instanceof ApiHttpError && err.status === 401) {
        // Sesion caducada: ProtectedRoute ya esta mandando al login. Un
        // aviso de error encima solo estorbaria.
      } else {
        showError('No se pudieron cargar las claves', mensajeDeError(err));
      }
    } finally {
      setCargando(false);
    }
  }, [showError, esAdmin]);

  useEffect(() => {
    // Sin sesion no se pide nada: la peticion fallaria con 401 justo antes
    // de que ProtectedRoute redirija, y el usuario veria un error que no
    // le dice nada.
    if (!sanityUser) return;
    void cargar();
  }, [cargar, sanityUser]);

  const alternarScope = (scope: string) =>
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  const crear = async () => {
    if (!nombre.trim() || scopes.length === 0) return;
    setGuardando(true);
    try {
      const creada = await crearApiKey({ name: nombre.trim(), scopes });
      setCreando(false);
      setNombre('');
      setScopes(['experiences:read']);
      // Se abre de inmediato: es la unica vez que se puede ver el token.
      setRecienCreada(creada);
      await cargar();
    } catch (err) {
      showError('No se pudo crear la clave', mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      showError('Tu navegador no permitió copiar', 'Selecciona el texto y cópialo a mano.');
    }
  };

  const revocar = async (k: ApiKey) => {
    const ok = await showDestructiveConfirmation(
      '¿Revocar esta clave?',
      `Cualquier integración que use "${k.name}" dejará de funcionar de inmediato. No se puede deshacer: habría que crear una clave nueva.`,
      'Sí, revocar',
    );
    if (!ok) return;
    try {
      await revocarApiKey(k.id);
      showSuccess('Clave revocada', `"${k.name}" ya no da acceso al API.`);
      await cargar();
    } catch (err) {
      showError('No se pudo revocar', mensajeDeError(err));
    }
  };

  const nombreDeScope = (scope: string) =>
    PERMISOS.find((p) => p.scope === scope)?.titulo ?? scope;

  return (
    <ProtectedRoute roles={['reseller', 'admin']}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Claves de API</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Para vender experiencias de Tenemos Filo desde tu propia plataforma
          </p>
        </div>
        {!sinEmpresa && (
          <Button color="primary" onClick={() => setCreando(true)}>
            <HiKey className="w-4 h-4 mr-2" />
            Crear clave
          </Button>
        )}
      </div>

      {sinEmpresa ? (
        <Card>
          <div className="flex items-start gap-3">
            <HiExclamationCircle className="w-5 h-5 text-[#F26726] shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Tu cuenta todavía no tiene una empresa asociada
              </p>
              <p className="mt-1">
                Las claves pertenecen a una empresa, porque es a ella a la que se le atribuyen las
                ventas y las comisiones. Escríbenos para que asociemos tu cuenta y podrás emitirlas
                desde aquí.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>
                Cada clave se muestra <strong>una sola vez</strong>, al crearla. Guárdala en un
                gestor de secretos: no podemos recuperarla, solo revocarla y emitir otra.
              </p>
              <p className="mt-2">
                Es una credencial de servidor. Nunca la pongas en código que se ejecute en el
                navegador: quien la tenga puede reservar en tu nombre.
              </p>
              <a
                href={URL_DOCS}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[#F26726] hover:underline"
              >
                Ver la documentación del API <HiExternalLink className="w-4 h-4" />
              </a>
            </div>
          </Card>

          <AdminTable
            columnas={
              esAdmin
                ? ['Clave', 'Empresa', 'Permisos', 'Último uso', 'Estado', '']
                : ['Clave', 'Permisos', 'Último uso', 'Estado', '']
            }
            cargando={cargando}
            vacio={claves.length === 0}
            mensajeVacio={esAdmin ? "Todavía no hay ninguna clave emitida." : "Todavía no has creado ninguna clave."}
          >
            {claves.map((k) => {
              const estado = estadoDe(k);
              return (
                <tr key={k.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{k.name}</div>
                    <code className="text-xs text-gray-500">{k.prefix}…</code>
                  </td>
                  {esAdmin && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {k.company?.companyName ?? '—'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} color="info" className="w-fit">
                          {nombreDeScope(s)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {k.lastUsedAt ? fecha(k.lastUsedAt) : 'Sin usar'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      color={estado === 'activa' ? 'success' : estado === 'expirada' ? 'warning' : 'gray'}
                      className="w-fit"
                    >
                      {estado === 'activa' ? 'Activa' : estado === 'expirada' ? 'Expirada' : 'Revocada'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {estado === 'activa' && (
                      <Button size="xs" color="danger" onClick={() => revocar(k)}>
                        Revocar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </>
      )}

      {/* Crear */}
      <Modal show={creando} onClose={() => setCreando(false)} size="lg">
        <ModalHeader>Crear una clave</ModalHeader>
        <ModalBody>
          <div className="space-y-5">
            {esAdmin && (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                La clave se emite a nombre de <strong>Tenemos Filo</strong>. Las reservas
                que entren por ella se atribuyen a la plataforma como canal de venta.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <TextInput
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Web de reservas, App móvil"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para reconocerla después. Si usas una clave por integración, revocar una no tumba
                las demás.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Permisos *</p>
              <p className="text-xs text-gray-500 mb-3">
                Marca solo los que necesites. Una clave de solo lectura no puede hacer daño si se
                filtra.
              </p>
              <div className="space-y-2">
                {PERMISOS.map((p) => {
                  const marcado = scopes.includes(p.scope);
                  return (
                    <button
                      key={p.scope}
                      type="button"
                      onClick={() => alternarScope(p.scope)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        marcado
                          ? 'border-[#F26726] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            marcado ? 'border-[#F26726] bg-[#F26726]' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {marcado && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {p.titulo}
                            {p.escritura && (
                              <span className="ml-2 text-xs font-normal text-[#F26726]">
                                escritura
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.descripcion}</p>
                          <code className="text-[11px] text-gray-400">{p.scope}</code>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={crear}
            disabled={guardando || !nombre.trim() || scopes.length === 0}
          >
            {guardando ? 'Creando...' : 'Crear clave'}
          </Button>
          <Button color="secondary" onClick={() => setCreando(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      {/* El token, una sola vez */}
      <Modal show={!!reciencreada} onClose={() => setRecienCreada(null)} size="lg" dismissible={false}>
        <ModalHeader>Guarda esta clave ahora</ModalHeader>
        <ModalBody>
          {reciencreada && (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                Esta es la única vez que vas a ver la clave completa. En cuanto cierres esta
                ventana no habrá forma de recuperarla: solo revocarla y crear otra.
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">{reciencreada.name}</p>
                <div className="flex items-stretch gap-2">
                  <code className="flex-1 break-all rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-100">
                    {reciencreada.token}
                  </code>
                  <Button color="primary" onClick={() => copiar(reciencreada.token)}>
                    <HiClipboardCopy className="w-4 h-4 mr-1" />
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Cómo usarla</p>
                <code className="block break-all text-xs">
                  Authorization: Bearer {reciencreada.token.slice(0, 20)}…
                </code>
                <a
                  href={URL_DOCS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[#F26726] hover:underline"
                >
                  Ver la documentación <HiExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setRecienCreada(null)}>
            Ya la guardé
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
