"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from 'flowbite-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  getConversacion,
  getConversaciones,
  pausarConversacion,
  type Conversacion,
  type ConversacionResumen,
} from '@/lib/agente/agente';

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Lo que el agente le dijo a cada cliente.
 *
 * Es la parte que hace que encenderlo no sea firmar en blanco: cualquiera que
 * ponga un agente a hablar con sus clientes necesita poder leer qué les
 * contestó. Y desde aquí se puede tomar el hilo sin apagar todo el agente.
 */
export default function ConversacionesDelAgente({ refrescar = 0 }: { refrescar?: number }) {
  const { showError } = useSweetAlert();
  const [hilos, setHilos] = useState<ConversacionResumen[]>([]);
  const [abierta, setAbierta] = useState<Conversacion | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setHilos(await getConversaciones());
    } catch {
      setHilos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar, refrescar]);

  const abrir = async (id: string) => {
    try {
      setAbierta(await getConversacion(id));
    } catch (err) {
      showError('No se pudo abrir', err instanceof Error ? err.message : undefined);
    }
  };

  const alternarPausa = async (id: string, pausada: boolean) => {
    try {
      await pausarConversacion(id, pausada);
      await cargar();
      if (abierta?.id === id) setAbierta({ ...abierta, pausada });
    } catch (err) {
      showError('No se pudo cambiar', err instanceof Error ? err.message : undefined);
    }
  };

  if (cargando || hilos.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#334C5D]">Conversaciones</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Lo que tu agente le ha contestado a cada quien. Si tomas un hilo, deja de contestar solo
        en ese: el resto sigue igual.
      </p>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {hilos.map((h) => (
            <li key={h.id}>
              <button
                onClick={() => void abrir(h.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  abierta?.id === h.id ? 'border-marca bg-marca-tenue' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {h.nombrePerfil ?? h.telefono}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {cuando(h.ultimoMensajeAt)} · {h._count.mensajes}{' '}
                  {h._count.mensajes === 1 ? 'mensaje' : 'mensajes'}
                  {h.canal === 'PRUEBA' ? ' · prueba' : ''}
                </p>
                {h.pausada && (
                  <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                    la tomaste tú
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-gray-200 p-4">
          {!abierta ? (
            <p className="text-sm text-gray-400">Elige una conversación para leerla.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {abierta.nombrePerfil ?? abierta.telefono}
                  </p>
                  {abierta.opportunity && (
                    <Link
                      href={`/dashboard/crm/oportunidades/${abierta.opportunity.id}`}
                      className="text-xs text-marca hover:underline"
                    >
                      Ver la solicitud que abrió
                    </Link>
                  )}
                </div>
                <Button
                  size="xs"
                  color="gray"
                  onClick={() => void alternarPausa(abierta.id, !abierta.pausada)}
                >
                  {abierta.pausada ? 'Devolvérsela al agente' : 'Tomar el hilo'}
                </Button>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {abierta.mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.rol === 'AGENTE' ? 'justify-start' : 'justify-end'}`}>
                    <span
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                        m.rol === 'AGENTE' ? 'bg-gray-100 text-gray-800' : 'bg-marca text-marca-contraste'
                      }`}
                    >
                      {m.texto}
                      {/* Qué miró antes de contestar: es lo que permite
                          entender después por qué dijo lo que dijo. */}
                      {m.herramienta && (
                        <span className="mt-1 block text-[10px] opacity-60">consultó: {m.herramienta}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
