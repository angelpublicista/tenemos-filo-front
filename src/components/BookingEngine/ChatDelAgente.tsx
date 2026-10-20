"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensajeAlAgente, getHistorialDelChat, type MensajeDelChat } from '@/lib/api/catalog';

interface Props {
  slug: string;
  /** Cómo se presenta el agente, tal como lo puso el anfitrión. */
  nombre: string;
  empresa: string;
}

const MAXIMO = 600;

/**
 * El id con el que el API reconoce el hilo de este visitante.
 *
 * Vive en su navegador y es lo único que lo identifica —no hay cuenta—, así
 * que se genera al azar y se guarda para que recargar la página no le borre
 * la conversación. Si el almacenamiento no está disponible (ventana privada,
 * cookies bloqueadas) el chat funciona igual, solo que sin memoria entre
 * recargas.
 */
function idDeSesion(slug: string): string {
  const clave = `filo-chat:${slug}`;
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado) return guardado;
  } catch {
    /* sin almacenamiento: se genera uno solo para esta visita */
  }
  const nuevo = crypto.randomUUID();
  try {
    window.localStorage.setItem(clave, nuevo);
  } catch {
    /* idem */
  }
  return nuevo;
}

// [texto](https://…) o una URL suelta. Solo http(s): nada de javascript: ni data:.
const ENLACE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)/g;

/**
 * El texto del mensaje con sus enlaces clicables.
 *
 * El modelo escribe los enlaces en Markdown aunque se le pida que no, y una
 * URL suelta tampoco es pulsable en un texto plano. Se arman nodos de React en
 * vez de inyectar HTML: lo que escribe el modelo —o el visitante— nunca se
 * interpreta como marcado.
 */
function conEnlaces(texto: string, claseEnlace: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  let desde = 0;
  for (const m of texto.matchAll(ENLACE)) {
    const inicio = m.index ?? 0;
    if (inicio > desde) partes.push(texto.slice(desde, inicio));

    let etiqueta = m[1];
    let url = m[2] ?? m[3];
    let resto = '';
    if (!m[2]) {
      // Una URL suelta al final de una frase arrastra el punto o la coma.
      const cola = url.match(/[.,;:!?]+$/)?.[0] ?? '';
      if (cola) {
        url = url.slice(0, -cola.length);
        resto = cola;
      }
    }
    etiqueta = etiqueta ?? url;

    partes.push(
      <a
        key={inicio}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={claseEnlace}
      >
        {etiqueta}
      </a>,
    );
    if (resto) partes.push(resto);
    desde = inicio + m[0].length;
  }
  if (desde < texto.length) partes.push(texto.slice(desde));
  return partes;
}

/**
 * Chat con el agente de IA del anfitrión, flotando sobre el catálogo.
 *
 * Toma los colores del contenedor del catálogo (`bg-marca`, `text-marca-contraste`),
 * así que sale con la marca del anfitrión sin saber nada de ella.
 */
export default function ChatDelAgente({ slug, nombre, empresa }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeDelChat[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sesion, setSesion] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  // El id se resuelve en el navegador: en el servidor no hay localStorage y
  // generarlo en el render rompería la hidratación.
  useEffect(() => {
    setSesion(idDeSesion(slug));
  }, [slug]);

  // El historial se pide la primera vez que se abre, no al cargar la página:
  // casi nadie abre el chat, y no hay por qué cobrarle esa petición al resto.
  const cargarHistorial = useCallback(async () => {
    if (!sesion || cargado) return;
    setCargado(true);
    try {
      setMensajes(await getHistorialDelChat(slug, sesion));
    } catch {
      // Sin historial se empieza de cero; no es motivo para mostrar un error.
    }
  }, [slug, sesion, cargado]);

  useEffect(() => {
    if (abierto) void cargarHistorial();
  }, [abierto, cargarHistorial]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, enviando, abierto]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando || !sesion) return;
    setTexto('');
    setMensajes((m) => [...m, { rol: 'CLIENTE', texto: t, createdAt: new Date().toISOString() }]);
    setEnviando(true);
    try {
      const { respuesta } = await enviarMensajeAlAgente(slug, sesion, t);
      setMensajes((m) => [
        ...m,
        {
          rol: 'AGENTE',
          // Sin respuesta no es un fallo: el agente puede estar sin cupo o el
          // anfitrión haber tomado el hilo. En los dos casos el mensaje quedó
          // guardado y alguien lo va a leer.
          texto: respuesta ?? 'Recibimos tu mensaje. El equipo te responderá pronto.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMensajes((m) => [
        ...m,
        {
          rol: 'AGENTE',
          texto: 'No pude enviar tu mensaje. Inténtalo de nuevo en un momento.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {abierto && (
        <div
          role="dialog"
          aria-label={`Chat con ${nombre}`}
          className="flex h-[28rem] max-h-[calc(100vh-6rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between bg-marca px-4 py-3 text-marca-contraste">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{nombre}</p>
              <p className="truncate text-xs opacity-80">Asistente de {empresa}</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el chat"
              className="rounded p-1 text-lg leading-none opacity-80 hover:opacity-100"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
            <div className="flex justify-start">
              <span className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm">
                Hola, soy {nombre}. Te ayudo con las experiencias de {empresa}: precios, horarios y
                cómo reservar.
              </span>
            </div>
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'AGENTE' ? 'justify-start' : 'justify-end'}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                    m.rol === 'AGENTE'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'bg-marca text-marca-contraste'
                  }`}
                >
                  {conEnlaces(
                    m.texto,
                    m.rol === 'AGENTE'
                      ? 'font-medium text-marca underline underline-offset-2 break-all'
                      : 'font-medium underline underline-offset-2 break-all',
                  )}
                </span>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start" aria-live="polite">
                <span className="rounded-2xl bg-white px-3 py-2 text-sm text-gray-400 shadow-sm">
                  {nombre} está escribiendo…
                </span>
              </div>
            )}
            <div ref={fondo} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-gray-100 bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                // Enter envía; Shift+Enter baja de línea, como en cualquier chat.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              rows={1}
              maxLength={MAXIMO}
              placeholder="Escribe tu pregunta…"
              aria-label="Tu mensaje"
              className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-marca focus:outline-none focus:ring-1 focus:ring-marca"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="rounded-xl bg-marca px-4 py-2 text-sm font-semibold text-marca-contraste transition-colors hover:bg-marca-fuerte disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar el chat' : `Chatear con ${nombre}`}
        className="flex h-14 items-center gap-2 rounded-full bg-marca px-5 text-sm font-semibold text-marca-contraste shadow-lg transition-colors hover:bg-marca-fuerte"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z"
          />
        </svg>
        <span className="hidden sm:inline">{abierto ? 'Cerrar' : `Pregúntale a ${nombre}`}</span>
      </button>
    </div>
  );
}
