"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'flowbite-react';
import { HiClipboardCopy } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { mensajeDeError } from '@/lib/api/client';
import {
  AREAS,
  URL_DEL_MCP,
  cortarConexion,
  getConexiones,
  type ConexionDeAsistente,
} from '@/lib/api/mcp';

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Nunca';

/** «Reservas (consultar y modificar), Sedes (consultar)…», para leerlo de un vistazo. */
function resumenDePermisos(scopes: string[]): string {
  const tiene = new Set(scopes);
  return AREAS.flatMap((a) => {
    const lee = tiene.has(`${a.clave}:read`);
    const escribe = tiene.has(`${a.clave}:write`);
    if (!lee && !escribe) return [];
    const que = lee && escribe ? 'consultar y modificar' : escribe ? 'modificar' : 'consultar';
    return [`${a.titulo} (${que})`];
  }).join(' · ');
}

/**
 * Conectar un asistente de IA a la cuenta del anfitrión.
 *
 * Aquí no se configura nada: la conexión se hace desde el asistente, que es
 * quien abre la pantalla de aprobación. Esta página dice a dónde apuntarlo y
 * —lo que de verdad importa después— enseña quién está conectado y deja
 * cortarlo. Un asistente conectado actúa solo, así que saber cuáles hay y
 * poder echarlos tiene que estar a un clic.
 */
export default function McpPage() {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [conexiones, setConexiones] = useState<ConexionDeAsistente[] | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(
    () => getConexiones().then(setConexiones).catch(() => setConexiones([])),
    [],
  );

  useEffect(() => { void cargar(); }, [cargar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_DEL_MCP);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      showError('No se pudo copiar', 'Selecciona la dirección y cópiala a mano.');
    }
  };

  const cortar = async (c: ConexionDeAsistente) => {
    const ok = await showConfirmation(
      `¿Desconectar ${c.client.name}?`,
      'Deja de poder entrar a tu cuenta en el momento. Para volver a usarlo tendrás que conectarlo de nuevo.',
      'Sí, desconectar',
      'Cancelar',
    );
    if (!ok) return;
    try {
      await cortarConexion(c.id);
      showSuccess('Desconectado', `${c.client.name} ya no tiene acceso.`);
      await cargar();
    } catch (err) {
      showError('No se pudo desconectar', mensajeDeError(err));
    }
  };

  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#334C5D]">MCP</h1>
          <p className="mt-1 text-sm text-gray-500">
            Conecta tu asistente de IA —Claude, ChatGPT, Cursor— a tu cuenta de Tenemos Filo y
            pídele las cosas hablando: «¿qué reservas tengo el sábado?», «crea una solicitud para
            Laura, quiere una cena privada para 12».
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#334C5D]">Cómo conectarlo</h2>
          <p className="mt-1 text-sm text-gray-500">
            En tu asistente, añade un conector o servidor MCP con esta dirección. Te traerá a
            Tenemos Filo para que apruebes qué puede hacer.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800">
              {URL_DEL_MCP}
            </code>
            <Button color="gray" onClick={() => void copiar()}>
              <HiClipboardCopy className="mr-2 h-4 w-4" />
              {copiado ? 'Copiada' : 'Copiar'}
            </Button>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-[#334C5D]">Claude</dt>
              <dd className="text-gray-600">
                En la configuración, en Conectores, añade un conector personalizado y pega la
                dirección.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#334C5D]">ChatGPT</dt>
              <dd className="text-gray-600">
                En la configuración, en Conectores, crea uno nuevo y pega la dirección como URL del
                servidor MCP.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#334C5D]">Claude Code</dt>
              <dd className="text-gray-600">
                <code className="break-all rounded bg-gray-100 px-1">
                  claude mcp add --transport http tenemos-filo {URL_DEL_MCP}
                </code>
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Un asistente conectado actúa en tu nombre y sin preguntarte cada vez. Si le das permiso
            para modificar, lo que haga queda hecho: empieza con solo consultar y amplía cuando
            veas cómo se porta.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#334C5D]">Asistentes conectados</h2>
          <p className="mt-1 text-sm text-gray-500">
            Los que tienen acceso ahora mismo a esta empresa.
          </p>

          {conexiones === null ? null : conexiones.length === 0 ? (
            <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Todavía no hay ninguno.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {conexiones.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#334C5D]">{c.client.name}</p>
                    <p className="text-xs text-gray-500">
                      Lo conectó {c.user.name ?? c.user.email} el {fecha(c.createdAt)} · Último uso:{' '}
                      {fecha(c.lastUsedAt)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{resumenDePermisos(c.scopes)}</p>
                  </div>
                  <Button color="gray" size="sm" onClick={() => void cortar(c)}>
                    Desconectar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
