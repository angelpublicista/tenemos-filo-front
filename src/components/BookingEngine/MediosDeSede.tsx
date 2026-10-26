"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { HiExternalLink, HiPlay } from 'react-icons/hi';
import { urlDeImagen } from '@/lib/images';
import { parsearVideo, urlDeIncrustacion } from '@/lib/video-embed';

interface Props {
  fotos?: string[];
  video?: string | null;
  nombreSede: string;
}

/**
 * Las fotos y el video de una sede, para quien está decidiendo si reservar.
 *
 * La foto grande es la principal —la primera— y las demas van como miniaturas
 * que la sustituyen al pulsarlas. No se abre una galeria a pantalla completa:
 * esto vive dentro de un modal que ya se puede cerrar, y anidar dos capas que
 * se cierran con Escape confunde sobre cual se va a cerrar.
 *
 * El video se incrusta si es de YouTube o Vimeo; cualquier otro enlace se
 * ofrece como enlace, que es lo unico que se puede hacer con el sin saber que
 * hay al otro lado.
 */
export default function MediosDeSede({ fotos = [], video, nombreSede }: Props) {
  const [activa, setActiva] = useState(0);
  const incrustable = parsearVideo(video);

  if (fotos.length === 0 && !video) return null;

  return (
    <div className="mt-2 space-y-2">
      {fotos.length > 0 && (
        <>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={urlDeImagen(fotos[Math.min(activa, fotos.length - 1)]) ?? ''}
              alt={`${nombreSede}, foto ${activa + 1}`}
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 640px) 100vw, 480px"
            />
          </div>

          {fotos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {fotos.map((f, i) => (
                <button
                  key={`${f}-${i}`}
                  type="button"
                  onClick={() => setActiva(i)}
                  aria-label={`Ver la foto ${i + 1} de ${nombreSede}`}
                  className={`relative h-12 w-16 shrink-0 overflow-hidden rounded border transition-opacity ${
                    i === activa ? 'border-marca opacity-100' : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={urlDeImagen(f) ?? ''}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {video &&
        (incrustable ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={urlDeIncrustacion(incrustable) ?? undefined}
              title={`Video de ${nombreSede}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={video}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-marca hover:underline"
          >
            <HiPlay className="h-3.5 w-3.5" />
            Ver video de la sede
            <HiExternalLink className="h-3 w-3" />
          </a>
        ))}
    </div>
  );
}
