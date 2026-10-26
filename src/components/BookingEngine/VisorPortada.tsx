"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import { urlDeIncrustacion, type VideoPortada } from '@/lib/video-embed';

type Props = {
  /** URLs ya resueltas. Vacío si lo que se muestra es un vídeo. */
  imagenes: string[];
  video: VideoPortada | null;
  /** Por cuál empezar, para abrir en la que se estaba viendo. */
  inicial?: number;
  nombreEmpresa: string;
  onCerrar: () => void;
};

/**
 * Portada a pantalla completa.
 *
 * Aquí sí hay controles: en el banner estorban porque nadie fue a mirarlo,
 * pero quien abre el visor entró a propósito y espera poder pasar las fotos
 * o manejar el vídeo. El vídeo además deja de ir en silencio.
 */
export default function VisorPortada({
  imagenes,
  video,
  inicial = 0,
  nombreEmpresa,
  onCerrar,
}: Props) {
  const [actual, setActual] = useState(inicial);
  const contenedor = useRef<HTMLDivElement>(null);

  const hayVarias = imagenes.length > 1;

  const anterior = useCallback(
    () => setActual((i) => (i - 1 + imagenes.length) % imagenes.length),
    [imagenes.length],
  );
  const siguiente = useCallback(
    () => setActual((i) => (i + 1) % imagenes.length),
    [imagenes.length],
  );

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      if (!hayVarias) return;
      if (e.key === 'ArrowLeft') anterior();
      if (e.key === 'ArrowRight') siguiente();
    };
    window.addEventListener('keydown', alPulsar);

    // Sin esto la pagina de detras sigue desplazandose mientras el visor
    // ocupa toda la pantalla.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // El foco entra al visor para que Escape y las flechas funcionen sin
    // tener que hacer clic primero.
    contenedor.current?.focus();

    return () => {
      window.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar, anterior, siguiente, hayVarias]);

  return (
    <div
      ref={contenedor}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Portada de ${nombreEmpresa}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 outline-none"
      // Cerrar al pulsar el fondo, pero no al pulsar el contenido.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <HiX className="h-6 w-6" />
      </button>

      {video ? (
        <div className="relative aspect-video w-full max-w-6xl px-4">
          <iframe
            src={urlDeIncrustacion(video, { conControles: true, autoplay: true })}
            title={`Video de ${nombreEmpresa}`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <>
          {/* object-contain y no cover: aqui la gracia es ver la foto
              entera, no que llene el hueco. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenes[actual]}
            alt={`Portada de ${nombreEmpresa} ${actual + 1} de ${imagenes.length}`}
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />

          {hayVarias && (
            <>
              <button
                type="button"
                onClick={anterior}
                aria-label="Imagen anterior"
                className="absolute left-3 sm:left-6 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <HiChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={siguiente}
                aria-label="Imagen siguiente"
                className="absolute right-3 sm:right-6 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <HiChevronRight className="h-6 w-6" />
              </button>

              <div className="absolute bottom-6 flex items-center gap-2">
                {imagenes.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActual(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    aria-current={i === actual}
                    className={`h-2 rounded-full transition-all ${
                      i === actual ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
