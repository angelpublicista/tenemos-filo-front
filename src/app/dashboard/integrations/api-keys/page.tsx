"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Badge,
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  TextInput,
} from 'flowbite-react';
import {
  AiOutlineKey,
  AiOutlinePlus,
  AiOutlineCopy,
  AiOutlineWarning,
  AiOutlineDelete,
  AiOutlineCheck,
  AiOutlineArrowLeft,
  AiOutlineCode,
} from 'react-icons/ai';
import {
  API_SCOPES,
  ApiKey,
  ApiScope,
  CreatedApiKey,
  SCOPE_GROUPS,
  SCOPE_LABELS,
  createApiKey,
  getApiKeyStatus,
  listApiKeys,
  revokeApiKey,
} from '@/lib/sanity/apiKeyService';
import { useSweetAlert } from '@/hooks/useSweetAlert';

type Snippet = 'curl' | 'js' | 'python' | 'endpoints';

const SNIPPET_TABS: Array<{ id: Snippet; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'js', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'endpoints', label: 'Endpoints' },
];

const STATUS_LABEL: Record<ReturnType<typeof getApiKeyStatus>, string> = {
  active: 'Activa',
  expired: 'Expirada',
  revoked: 'Revocada',
};

const STATUS_COLOR: Record<ReturnType<typeof getApiKeyStatus>, 'success' | 'warning' | 'failure'> = {
  active: 'success',
  expired: 'warning',
  revoked: 'failure',
};

const ENDPOINTS: Array<{ method: string; path: string; scope: string; description: string }> = [
  { method: 'GET', path: '/experiences', scope: 'experiences:read', description: 'Listar experiencias de tu compañía' },
  { method: 'POST', path: '/experiences', scope: 'experiences:write', description: 'Crear una experiencia' },
  { method: 'GET', path: '/reservations', scope: 'reservations:read', description: 'Listar reservas' },
  { method: 'POST', path: '/reservations', scope: 'reservations:write', description: 'Crear una reserva' },
  { method: 'GET', path: '/availabilities', scope: 'availabilities:read', description: 'Listar calendarios de disponibilidad' },
  { method: 'POST', path: '/availabilities', scope: 'availabilities:write', description: 'Crear calendario de disponibilidad' },
  { method: 'GET', path: '/locations', scope: 'locations:read', description: 'Listar sedes' },
  { method: 'GET', path: '/contacts', scope: 'contacts:read', description: 'Listar contactos CRM' },
  { method: 'POST', path: '/contacts', scope: 'contacts:write', description: 'Crear contacto CRM' },
  { method: 'GET', path: '/opportunities', scope: 'opportunities:read', description: 'Listar oportunidades' },
  { method: 'GET', path: '/quotes', scope: 'quotes:read', description: 'Listar cotizaciones' },
  { method: 'GET', path: '/dashboard/stats', scope: 'dashboard:read', description: 'Estadísticas del dashboard' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Crear
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  // Mostrar token recién creado
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Tabs de snippets
  const [activeSnippet, setActiveSnippet] = useState<Snippet>('curl');

  const { showError, showAlert, showSuccess } = useSweetAlert();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await listApiKeys());
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? `${e.message}. Asegúrate de tener una empresa configurada y rol Revendedor o Administrador.`
          : 'Error al cargar las API keys',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetCreateForm = () => {
    setName('');
    setSelectedScopes([]);
    setExpiresAt('');
  };

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes((curr) =>
      curr.includes(scope) ? curr.filter((s) => s !== scope) : [...curr, scope],
    );
  };

  const selectAllRead = () => {
    setSelectedScopes(API_SCOPES.filter((s) => s.endsWith(':read')) as ApiScope[]);
  };

  const selectAll = () => {
    setSelectedScopes([...API_SCOPES] as ApiScope[]);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      await showError('Nombre requerido', 'Asígnale un nombre para identificar esta key.');
      return;
    }
    if (selectedScopes.length === 0) {
      await showError('Selecciona scopes', 'Debes elegir al menos un permiso.');
      return;
    }
    setCreating(true);
    try {
      const res = await createApiKey({
        name: name.trim(),
        scopes: selectedScopes,
        expiresAt: expiresAt
          ? new Date(expiresAt).toISOString()
          : undefined,
      });
      setCreated(res);
      setShowCreate(false);
      resetCreateForm();
      await load();
    } catch (e) {
      await showError(
        'No pudimos crear la API key',
        e instanceof Error ? e.message : 'Intenta nuevamente',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: ApiKey) => {
    const res = await showAlert({
      title: '¿Revocar API key?',
      text: `La key "${key.name}" dejará de funcionar inmediatamente y no se podrá reactivar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, revocar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;
    try {
      await revokeApiKey(key.id);
      await showSuccess('Key revocada', 'Ya no se aceptarán requests con este token.');
      await load();
    } catch (e) {
      await showError(
        'No pudimos revocar la key',
        e instanceof Error ? e.message : 'Intenta nuevamente',
      );
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await showError('No se pudo copiar', 'Selecciona el texto y copia manualmente.');
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#F26726] mb-1"
              >
                <AiOutlineArrowLeft /> Integraciones
              </Link>
              <div className="flex items-center gap-3">
                <AiOutlineKey className="w-7 h-7 text-[#334C5D] dark:text-gray-100 shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    API Keys
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tokens para integrar tu cuenta con servicios externos.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#F26726] hover:bg-[#F26726]/90"
            >
              <AiOutlinePlus className="mr-2" />
              Crear API key
            </Button>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AiOutlineWarning className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-1">Las API keys dan acceso completo a los recursos autorizados.</p>
            <p>
              Guarda los tokens en un gestor de secretos, nunca los publiques en repositorios ni los
              compartas en canales no seguros. Si una key se expone, revócala desde esta misma página.
            </p>
          </div>
        </div>

        {/* Lista de keys */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-16">
              <AiOutlineKey className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-1">No tienes API keys todavía</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Crea tu primera key para empezar a integrar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Prefix</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Scopes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Último uso</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Expira</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Creada</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {keys.map((k) => {
                    const status = getApiKeyStatus(k);
                    return (
                      <tr key={k.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {k.name}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                          {k.prefix}…
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className="text-gray-700 dark:text-gray-300"
                            title={k.scopes.join(', ')}
                          >
                            {k.scopes.length} scope{k.scopes.length === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {k.lastUsedAt
                            ? new Date(k.lastUsedAt).toLocaleDateString('es-CO')
                            : 'Nunca'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {k.expiresAt
                            ? new Date(k.expiresAt).toLocaleDateString('es-CO')
                            : 'Sin expiración'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(k.createdAt).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status !== 'revoked' && (
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => handleRevoke(k)}
                            >
                              <AiOutlineDelete className="mr-1" />
                              Revocar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instrucciones de integración */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <AiOutlineCode className="w-5 h-5 text-[#334C5D] dark:text-gray-100" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Instrucciones de integración
            </h2>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                Autentica cada petición con el header{' '}
                <code className="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-xs">
                  Authorization: Bearer &lt;tu_token&gt;
                </code>
                .
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Base URL: <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">https://api.tenemosfilo.com</code>
                {' '}(producción) ·{' '}
                <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">http://localhost:4000</code>
                {' '}(desarrollo)
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-1">
                {SNIPPET_TABS.map((tab) => {
                  const active = activeSnippet === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSnippet(tab.id)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        active
                          ? 'border-[#F26726] text-[#F26726]'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#F26726]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Snippet content */}
            {activeSnippet === 'curl' && (
              <SnippetBlock
                code={`# Listar experiencias
curl -X GET "https://api.tenemosfilo.com/experiences" \\
  -H "Authorization: Bearer tf_live_TU_TOKEN_AQUI" \\
  -H "Accept: application/json"

# Crear una reserva
curl -X POST "https://api.tenemosfilo.com/reservations" \\
  -H "Authorization: Bearer tf_live_TU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "experience": "exp-id",
    "client": { "name": "Juan Pérez", "email": "juan@example.com", "phone": "+57..." },
    "reservationDate": "2026-06-15T18:00:00Z",
    "participants": 4,
    "pricing": { "basePrice": 100000, "subtotal": 400000, "total": 400000 }
  }'`}
                onCopy={handleCopy}
              />
            )}

            {activeSnippet === 'js' && (
              <SnippetBlock
                code={`const API_URL = 'https://api.tenemosfilo.com';
const token = process.env.TENEMOSFILO_API_KEY; // tf_live_...

async function listExperiences() {
  const res = await fetch(\`\${API_URL}/experiences\`, {
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Request failed');
  }
  const { data } = await res.json();
  return data;
}

async function createReservation(payload) {
  const res = await fetch(\`\${API_URL}/reservations\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const { data } = await res.json();
  return data;
}`}
                onCopy={handleCopy}
              />
            )}

            {activeSnippet === 'python' && (
              <SnippetBlock
                code={`import os
import requests

API_URL = 'https://api.tenemosfilo.com'
TOKEN = os.environ['TENEMOSFILO_API_KEY']  # tf_live_...

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Accept': 'application/json',
}

def list_experiences():
    r = requests.get(f'{API_URL}/experiences', headers=HEADERS)
    r.raise_for_status()
    return r.json()['data']

def create_reservation(payload: dict):
    r = requests.post(
        f'{API_URL}/reservations',
        headers={**HEADERS, 'Content-Type': 'application/json'},
        json=payload,
    )
    r.raise_for_status()
    return r.json()['data']`}
                onCopy={handleCopy}
              />
            )}

            {activeSnippet === 'endpoints' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Método</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Path</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Scope</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {ENDPOINTS.map((ep) => (
                      <tr key={`${ep.method}-${ep.path}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2">
                          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                            ep.method === 'GET'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{ep.path}</td>
                        <td className="px-3 py-2 font-mono text-xs text-[#19A3A2]">{ep.scope}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ep.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: crear API key */}
      <Modal show={showCreate} onClose={() => !creating && setShowCreate(false)} size="lg">
        <ModalHeader>Crear nueva API key</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label className="block mb-1 text-gray-700 dark:text-gray-300">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Integración Booking Engine"
                disabled={creating}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Solo para identificar la key. No se comparte con quien la use.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  Scopes <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllRead}
                    className="text-[#19A3A2] hover:underline"
                    disabled={creating}
                  >
                    Solo lectura
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[#19A3A2] hover:underline"
                    disabled={creating}
                  >
                    Todo
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedScopes([])}
                    className="text-gray-500 hover:underline"
                    disabled={creating}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
                {SCOPE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-2">
                      {group.scopes.map((scope) => (
                        <label
                          key={scope}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedScopes.includes(scope)}
                            onChange={() => toggleScope(scope)}
                            disabled={creating}
                          />
                          {SCOPE_LABELS[scope]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedScopes.length} scope{selectedScopes.length === 1 ? '' : 's'} seleccionado
                {selectedScopes.length === 1 ? '' : 's'}
              </p>
            </div>

            <div>
              <Label className="block mb-1 text-gray-700 dark:text-gray-300">
                Fecha de expiración (opcional)
              </Label>
              <TextInput
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={creating}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Si no la indicas, la key no expira. Recomendado para keys de larga duración.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={() => setShowCreate(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-[#F26726] hover:bg-[#F26726]/90"
          >
            {creating ? <Spinner size="sm" className="mr-2" /> : <AiOutlineKey className="mr-2" />}
            Crear key
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal: token recién creado (solo se muestra una vez) */}
      <Modal
        show={!!created}
        onClose={() => setCreated(null)}
        size="lg"
        dismissible={false}
      >
        <ModalHeader>API key creada</ModalHeader>
        <ModalBody>
          {created && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                <AiOutlineWarning className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Guarda este token ahora.</p>
                  <p>
                    Por seguridad, este es el único momento en que se mostrará completo.
                    Si lo pierdes deberás generar uno nuevo.
                  </p>
                </div>
              </div>

              <div>
                <Label className="block mb-1 text-gray-700 dark:text-gray-300">
                  Token
                </Label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-2">
                  <code className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 flex-1 break-all">
                    {created.token}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(created.token)}
                    className="bg-[#F26726] hover:bg-[#F26726]/90 shrink-0"
                  >
                    {copied ? (
                      <>
                        <AiOutlineCheck className="mr-1" /> Copiado
                      </>
                    ) : (
                      <>
                        <AiOutlineCopy className="mr-1" /> Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{created.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Prefix</p>
                  <p className="font-mono text-gray-900 dark:text-gray-100">{created.prefix}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Scopes</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {created.scopes.map((s) => (
                      <code
                        key={s}
                        className="text-xs font-mono bg-[#19A3A2]/10 text-[#19A3A2] px-1.5 py-0.5 rounded"
                      >
                        {s}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={() => setCreated(null)}
            className="bg-[#334C5D] hover:bg-[#334C5D]/90"
          >
            Ya guardé el token
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}

function SnippetBlock({ code, onCopy }: { code: string; onCopy: (code: string) => void }) {
  return (
    <div className="relative">
      <button
        onClick={() => onCopy(code)}
        className="absolute top-2 right-2 text-xs text-gray-300 hover:text-white bg-gray-700/70 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
      >
        <AiOutlineCopy className="inline mr-1" /> Copiar
      </button>
      <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 text-xs sm:text-sm rounded-lg p-4 pr-20 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
