"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from 'flowbite-react';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import FiloLogo from '@/components/FiloLogo';
import Loader from '@/components/Loader';
import { useAuth } from '@/lib/auth/AuthContext';
import { mensajeDeError } from '@/lib/api/client';
import {
  AREAS,
  CLAVE_DE_VUELTA,
  decidirConexion,
  getSolicitud,
  type ParametrosDeAutorizacion,
  type SolicitudDeConexion,
} from '@/lib/api/mcp';

/**
 * La pantalla en la que el anfitrión aprueba que un asistente entre a su
 * cuenta.
 *
 * Llega aquí desde el asistente, no desde el panel, así que no puede dar nada
 * por sabido: dice quién pide entrar, a qué empresa y para hacer qué, y deja
 * quitar permisos antes de aprobar. Lo que se aprueba aquí es lo que un modelo
 * va a poder hacer solo, sin que nadie mire: merece leerse.
 */
function Autorizar() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const peticion = useMemo<ParametrosDeAutorizacion | null>(() => {
    const client_id = params.get('client_id');
    const redirect_uri = params.get('redirect_uri');
    const code_challenge = params.get('code_challenge');
    if (!client_id || !redirect_uri || !code_challenge) return null;
    return {
      client_id,
      redirect_uri,
      code_challenge,
      state: params.get('state') ?? undefined,
      scope: params.get('scope') ?? undefined,
    };
  }, [params]);

  const [solicitud, setSolicitud] = useState<SolicitudDeConexion | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Sin sesión: al login, y de vuelta aquí con la petición intacta.
  useEffect(() => {
    if (loading || user) return;
    try {
      window.sessionStorage.setItem(CLAVE_DE_VUELTA, `/oauth/autorizar?${params.toString()}`);
    } catch {
      // Sin almacenamiento tendrá que volver a pulsar «Conectar» en su asistente.
    }
    router.replace('/login');
  }, [loading, user, params, router]);

  useEffect(() => {
    if (loading || !user || !peticion) return;
    let vigente = true;
    getSolicitud(peticion)
      .then((s) => {
        if (!vigente) return;
        setSolicitud(s);
        setMarcados(new Set(s.permisos));
      })
      .catch((err) => { if (vigente) setError(mensajeDeError(err)); });
    return () => { vigente = false; };
  }, [loading, user, peticion]);

  const alternar = (permiso: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(permiso)) n.delete(permiso);
      else n.add(permiso);
      return n;
    });

  const decidir = async (aprobado: boolean) => {
    if (!peticion) return;
    setEnviando(true);
    try {
      const { redirigirA } = await decidirConexion(peticion, aprobado, [...marcados]);
      // De vuelta al asistente. Es otro origen: no es una navegación del panel.
      window.location.href = redirigirA;
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  };

  if (loading || !user) return <Loader message="Cargando..." className="min-h-screen" />;

  const pedidos = new Set(solicitud?.permisos ?? []);
  // Solo las áreas de las que la aplicación pidió algo.
  const areas = AREAS.filter((a) => pedidos.has(`${a.clave}:read`) || pedidos.has(`${a.clave}:write`));
  const modifica = [...marcados].some((p) => p.endsWith(':write'));

  return (
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <FiloLogo className="mb-6 h-8 w-auto" />

        {!peticion ? (
          <p className="text-sm text-gray-600">
            A este enlace le faltan datos. Vuelve a tu asistente y pulsa «Conectar» de nuevo.
          </p>
        ) : error && !solicitud ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : !solicitud ? (
          <Loader message="Cargando..." />
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#334C5D]">
              ¿Conectar {solicitud.aplicacion} a tu cuenta?
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Va a poder actuar en tu nombre sobre{' '}
              <strong>{solicitud.empresa?.companyName ?? 'tu empresa'}</strong>, sin que tengas que
              estar delante. Vuelve a <code className="rounded bg-gray-100 px-1">{solicitud.vuelveA}</code>.
            </p>

            {/* El nombre lo escribe la propia aplicación. La dirección no se
                puede inventar, y por eso es la que hay que mirar. */}
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Aprueba solo si llegaste aquí pulsando «Conectar» en tu propio asistente. Si te
              mandaron este enlace, ciérralo.
            </p>

            <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
                <span>Qué puede tocar</span>
                <span>Consultar</span>
                <span>Modificar</span>
              </div>
              {areas.map((a) => (
                <div
                  key={a.clave}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-gray-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#334C5D]">{a.titulo}</p>
                    <p className="text-xs text-gray-500">{a.descripcion}</p>
                  </div>
                  {(['read', 'write'] as const).map((tipo) => {
                    const permiso = `${a.clave}:${tipo}`;
                    // No se ofrece lo que la aplicación no pidió ni lo que
                    // en esa área no existe.
                    if (!pedidos.has(permiso) || (tipo === 'write' && a.soloConsulta)) {
                      return <span key={tipo} className="w-14 text-center text-gray-300">—</span>;
                    }
                    return (
                      <span key={tipo} className="w-14 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${tipo === 'read' ? 'Consultar' : 'Modificar'} ${a.titulo}`}
                          checked={marcados.has(permiso)}
                          onChange={() => alternar(permiso)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>

            <ul className="mt-4 space-y-1 text-xs text-gray-500">
              <li className="flex gap-2">
                <HiOutlineShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
                No puede cambiar con qué pasarela cobras, ni tus usuarios, ni tus claves.
              </li>
              {modifica && (
                <li className="flex gap-2">
                  <HiOutlineShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
                  Lo que modifique queda hecho de verdad: una reserva cancelada por el asistente
                  está cancelada.
                </li>
              )}
              <li className="flex gap-2">
                <HiOutlineShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
                Puedes cortar la conexión cuando quieras en Integraciones → MCP.
              </li>
            </ul>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button color="gray" onClick={() => void decidir(false)} disabled={enviando}>
                No conectar
              </Button>
              <Button
                color="primary"
                onClick={() => void decidir(true)}
                disabled={enviando || marcados.size === 0}
              >
                {enviando ? 'Conectando…' : 'Conectar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// useSearchParams obliga a un límite de Suspense para poder compilar la página.
export default function AutorizarPage() {
  return (
    <Suspense fallback={<Loader message="Cargando..." className="min-h-screen" />}>
      <Autorizar />
    </Suspense>
  );
}
