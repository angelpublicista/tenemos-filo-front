"use client";

import React, { useEffect, useState } from 'react';
import { HiArrowsExpand } from 'react-icons/hi';
import Image from 'next/image';
import { urlDeImagen } from '@/lib/images';
import { parsearVideo, urlDeIncrustacion } from '@/lib/video-embed';
import VisorPortada from './VisorPortada';

export type TipoPortada = 'NONE' | 'IMAGE' | 'VIDEO' | 'SLIDER';

type Props = {
  tipo?: TipoPortada;
  imagenes?: string[];
  video?: string | null;
  /** Para el texto alternativo. */
  nombreEmpresa: string;
};

/** Cada cuanto cambia la imagen del slider. */
const INTERVALO_MS = 5000;

/**
 * Banner ancho y bajo: acompaña sin empujar las experiencias fuera de la
 * primera pantalla, que es lo que la gente viene a ver.
 */
const ALTO = 'h-40 sm:h-52 lg:h-60';

/**
 * Portada del catalogo: una imagen, un video o varias imagenes que rotan.
 *
 * El banner no lleva flechas, puntos ni controles de reproduccion a
 * proposito: es una cabecera, no un carrusel que haya que explorar, y lo que
 * importa — las experiencias — esta justo debajo.
 *
 * Para verlo bien esta el visor a pantalla completa, que si tiene controles:
 * ahi el visitante entro a proposito.
 */
export default function PortadaCatalogo({ tipo, imagenes, video, nombreEmpresa }: Props) {
  const todas = (imagenes ?? []).map((i) => urlDeImagen(i)).filter((u): u is string => !!u);
  // En modo IMAGE solo se ve la primera. Montar el resto haria que el
  // visitante se descargara imagenes que nunca va a ver; se conservan
  // guardadas por si vuelve a SLIDER, pero aqui no salen.
  const fotos = tipo === 'IMAGE' ? todas.slice(0, 1) : todas;
  const videoPortada = parsearVideo(video);

  const [actual, setActual] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);
  // Quien pide menos movimiento no deberia recibir una imagen que cambia
  // sola ni un video en bucle.
  const [menosMovimiento, setMenosMovimiento] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setMenosMovimiento(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  const rotar = tipo === 'SLIDER' && fotos.length > 1 && !menosMovimiento && !visorAbierto;

  useEffect(() => {
    if (!rotar) return;
    const id = setInterval(() => setActual((i) => (i + 1) % fotos.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, [rotar, fotos.length]);

  if (tipo === 'VIDEO' && videoPortada) {
    return (
      <div className={`relative w-full overflow-hidden bg-black ${ALTO}`}>
        {/* Se desmonta con el visor abierto: si no, el video del banner
            seguiria sonando por debajo del que el visitante abrio. */}
        {/* El iframe no admite object-cover, asi que se le da el alto que
            le corresponde a un 16:9 del ancho de la pantalla y se centra:
            lo que sobra por arriba y por abajo queda recortado, como haria
            una imagen de fondo. */}
        {!visorAbierto && (
          <iframe
            src={urlDeIncrustacion(videoPortada, {
              conControles: false,
              autoplay: !menosMovimiento,
            })}
            title={`Video de ${nombreEmpresa}`}
            className="pointer-events-none absolute left-0 top-1/2 h-[56.25vw] min-h-full w-full -translate-y-1/2"
            // Sin `fullscreen`: para eso esta el visor.
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        )}
        {/* Unico control del banner. Discreto, pero siempre visible: si solo
            apareciera al pasar el raton, en movil no existiria. */}
        <button
          type="button"
          onClick={() => setVisorAbierto(true)}
          aria-label="Ver en pantalla completa"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <HiArrowsExpand className="h-4 w-4" />
          Ver en grande
        </button>

        {visorAbierto && (
          <VisorPortada
            imagenes={[]}
            video={videoPortada}
            nombreEmpresa={nombreEmpresa}
            onCerrar={() => setVisorAbierto(false)}
          />
        )}
      </div>
    );
  }

  if ((tipo === 'IMAGE' || tipo === 'SLIDER') && fotos.length > 0) {
    return (
      <div className={`relative w-full overflow-hidden bg-gray-100 ${ALTO}`}>
        {fotos.map((url, i) => (
          <Image
            key={url}
            src={url}
            alt={i === 0 ? `Portada de ${nombreEmpresa}` : ''}
            fill
            sizes="100vw"
            // Todas montadas y superpuestas: el cambio es un fundido, sin
            // recargar la imagen cada vez.
            className={`object-cover transition-opacity duration-1000 ${
              i === actual ? 'opacity-100' : 'opacity-0'
            }`}
            priority={i === 0}
          />
        ))}
        {/* Unico control del banner. Discreto, pero siempre visible: si solo
            apareciera al pasar el raton, en movil no existiria. */}
        <button
          type="button"
          onClick={() => setVisorAbierto(true)}
          aria-label="Ver en pantalla completa"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <HiArrowsExpand className="h-4 w-4" />
          Ver en grande
        </button>

        {visorAbierto && (
          <VisorPortada
            imagenes={fotos}
            video={null}
            // Abre por la que se estaba viendo, no por la primera.
            inicial={actual}
            nombreEmpresa={nombreEmpresa}
            onCerrar={() => setVisorAbierto(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
