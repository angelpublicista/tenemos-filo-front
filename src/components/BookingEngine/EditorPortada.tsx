"use client";

import React, { useRef, useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { HiTrash } from 'react-icons/hi';
import Image from 'next/image';
import { uploadImage } from '@/lib/api/uploads';
import { urlDeImagen } from '@/lib/images';
import { NOMBRE_PROVEEDOR, parsearVideo, urlDeIncrustacion } from '@/lib/video-embed';
import type { TipoPortada } from './PortadaCatalogo';

type Props = {
  tipo: TipoPortada;
  imagenes: string[];
  video: string | null;
  guardando: boolean;
  onChange: (valores: { tipo: TipoPortada; imagenes: string[]; video: string | null }) => void;
  onError: (mensaje: string) => void;
};

const MAX_IMAGENES = 6;

const OPCIONES: Array<{ valor: TipoPortada; titulo: string; descripcion: string }> = [
  { valor: 'NONE', titulo: 'Sin portada', descripcion: 'Solo tu logo y tu nombre' },
  { valor: 'IMAGE', titulo: 'Una imagen', descripcion: 'Una foto fija de cabecera' },
  { valor: 'SLIDER', titulo: 'Varias imágenes', descripcion: 'Cambian solas cada 5 segundos' },
  { valor: 'VIDEO', titulo: 'Un video', descripcion: 'De YouTube o Vimeo, en bucle' },
];

export default function EditorPortada({
  tipo,
  imagenes,
  video,
  guardando,
  onChange,
  onError,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const inputImagen = useRef<HTMLInputElement>(null);

  // En modo IMAGE solo cuenta la primera; el resto se conserva por si el
  // anfitrion vuelve a SLIDER y no quiere volver a subirlas.
  const visibles = tipo === 'IMAGE' ? imagenes.slice(0, 1) : imagenes;
  const puedeSubirMas = tipo === 'SLIDER' ? imagenes.length < MAX_IMAGENES : imagenes.length < 1;

  const subirImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    if (!archivos.length) return;

    const cupo = (tipo === 'SLIDER' ? MAX_IMAGENES : 1) - imagenes.length;
    if (cupo <= 0) return;

    setSubiendo(true);
    try {
      const subidas: string[] = [];
      for (const archivo of archivos.slice(0, cupo)) {
        subidas.push(await uploadImage(archivo, 'portadas'));
      }
      onChange({ tipo, imagenes: [...imagenes, ...subidas], video });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudieron subir las imágenes');
    } finally {
      setSubiendo(false);
      if (inputImagen.current) inputImagen.current.value = '';
    }
  };

  const quitarImagen = (url: string) =>
    onChange({ tipo, imagenes: imagenes.filter((i) => i !== url), video });

  const videoValido = parsearVideo(video);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            type="button"
            disabled={guardando}
            onClick={() => onChange({ tipo: o.valor, imagenes, video })}
            className={`text-left rounded-xl border px-4 py-3 transition-colors ${
              tipo === o.valor
                ? 'border-[#F26726] bg-orange-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <p className="text-sm font-medium text-[#334C5D]">{o.titulo}</p>
            <p className="text-xs text-gray-500 mt-0.5">{o.descripcion}</p>
          </button>
        ))}
      </div>

      {(tipo === 'IMAGE' || tipo === 'SLIDER') && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {visibles.map((url) => {
              const src = urlDeImagen(url);
              return (
                <div key={url} className="relative">
                  <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {src && (
                      <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => quitarImagen(url)}
                    disabled={guardando}
                    className="absolute -top-2 -right-2 rounded-full bg-white border border-red-300 p-1 text-red-600 shadow-sm hover:bg-red-50"
                    title="Quitar"
                  >
                    <HiTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <input
            ref={inputImagen}
            type="file"
            accept="image/*"
            multiple={tipo === 'SLIDER'}
            className="hidden"
            onChange={subirImagenes}
          />
          <div className="flex items-center gap-3">
            <Button
              size="xs"
              color="secondary"
              disabled={subiendo || guardando || !puedeSubirMas}
              onClick={() => inputImagen.current?.click()}
            >
              {subiendo ? 'Subiendo...' : tipo === 'SLIDER' ? 'Añadir imágenes' : 'Subir imagen'}
            </Button>
            <span className="text-xs text-gray-500">
              {tipo === 'SLIDER'
                ? `${imagenes.length} de ${MAX_IMAGENES}. Se ven mejor apaisadas.`
                : 'Se ve mejor apaisada, tipo 21:9.'}
            </span>
          </div>
        </div>
      )}

      {tipo === 'VIDEO' && (
        <div className="space-y-3">
          <div className="max-w-xl space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Enlace del video
            </label>
            <TextInput
              value={video ?? ''}
              disabled={guardando}
              placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
              onChange={(e) => onChange({ tipo, imagenes, video: e.target.value || null })}
              color={video && !videoValido ? 'failure' : undefined}
            />
            {video && !videoValido ? (
              <p className="text-xs text-red-600">
                No reconocemos ese enlace. Pega la dirección del video en YouTube o en Vimeo.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Se reproduce en bucle, en silencio y sin controles. Ten en cuenta que YouTube
                muestra igualmente el título y el canal sobre el vídeo; con Vimeo la portada
                queda limpia.
              </p>
            )}
          </div>

          {videoValido && (
            <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-gray-200 bg-black">
              <iframe
                src={urlDeIncrustacion(videoValido, { conControles: false, autoplay: true })}
                title="Vista previa de la portada"
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}

          {videoValido && (
            <p className="text-xs text-gray-500">
              Vídeo de {NOMBRE_PROVEEDOR[videoValido.proveedor]}. Así se verá en tu catálogo.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
