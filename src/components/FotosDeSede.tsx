"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { HiArrowLeft, HiArrowRight, HiStar, HiTrash, HiPhotograph } from 'react-icons/hi';
import { uploadImage } from '@/lib/api/uploads';
import { urlDeImagen } from '@/lib/images';

export const MAX_FOTOS = 12;

interface Props {
  /** URLs en el orden en que se enseñan. La primera es la principal. */
  valor: string[];
  onChange: (fotos: string[]) => void;
  disabled?: boolean;
}

/**
 * Las fotos de una sede.
 *
 * El orden ES el dato: la primera es la principal. No hay un campo aparte que
 * diga cual lo es, porque dos sitios donde decirlo acaban diciendo cosas
 * distintas y entonces hay que elegir a cual creerle. "Hacer principal" mueve
 * la foto al frente, y se ve moverse.
 *
 * Reordenar va con botones y no arrastrando: arrastrar dentro de un modal que
 * ya tiene scroll propio pelea con el scroll, y en movil es directamente
 * incomodo.
 */
export default function FotosDeSede({ valor, onChange, disabled = false }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const cupo = MAX_FOTOS - valor.length;

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    if (archivos.length === 0) return;

    const fallos: string[] = [];
    // Se recorta al cupo en vez de rechazar la tanda entera: quien arrastra
    // quince fotos preferira que entren las que caben a que no entre ninguna.
    const aceptados = archivos.slice(0, cupo);
    if (archivos.length > cupo) {
      fallos.push(`Solo caben ${MAX_FOTOS} fotos. Subimos las ${cupo} primeras.`);
    }

    const validos = aceptados.filter((f) => {
      if (!f.type.startsWith('image/')) {
        fallos.push(`"${f.name}" no es una imagen`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        fallos.push(`"${f.name}" pesa más de 10 MB`);
        return false;
      }
      return true;
    });

    setErrores(fallos);
    if (entrada.current) entrada.current.value = '';
    if (validos.length === 0) return;

    setSubiendo(true);
    try {
      const subidas = await Promise.all(validos.map((f) => uploadImage(f, 'misc')));
      onChange([...valor, ...subidas]);
    } catch (err) {
      console.error('Error subiendo fotos de la sede:', err);
      setErrores((e) => [...e, err instanceof Error ? err.message : 'No pudimos subir las fotos.']);
    } finally {
      setSubiendo(false);
    }
  };

  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= valor.length) return;
    const siguiente = [...valor];
    const [foto] = siguiente.splice(desde, 1);
    siguiente.splice(hasta, 0, foto);
    onChange(siguiente);
  };

  const hacerPrincipal = (i: number) => mover(i, 0);
  const quitar = (i: number) => onChange(valor.filter((_, j) => j !== i));

  return (
    <div className="space-y-3 text-left">
      {valor.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {valor.map((foto, i) => (
            <div
              key={`${foto}-${i}`}
              className={`overflow-hidden rounded-lg border ${
                i === 0 ? 'border-[#F26726] ring-1 ring-[#F26726]' : 'border-gray-200'
              }`}
            >
              <div className="relative aspect-video bg-gray-100">
                <Image
                  src={urlDeImagen(foto) ?? ''}
                  alt={i === 0 ? 'Foto principal de la sede' : `Foto ${i + 1} de la sede`}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-[#F26726] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Principal
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 p-1">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => mover(i, i - 1)}
                    disabled={disabled || i === 0}
                    title="Mover antes"
                    aria-label={`Mover la foto ${i + 1} antes`}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <HiArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, i + 1)}
                    disabled={disabled || i === valor.length - 1}
                    title="Mover después"
                    aria-label={`Mover la foto ${i + 1} después`}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <HiArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => hacerPrincipal(i)}
                    disabled={disabled || i === 0}
                    title="Hacer principal"
                    aria-label={`Hacer principal la foto ${i + 1}`}
                    className="rounded p-1 text-[#F26726] hover:bg-orange-50 disabled:opacity-30"
                  >
                    <HiStar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => quitar(i)}
                    disabled={disabled}
                    title="Eliminar"
                    aria-label={`Eliminar la foto ${i + 1}`}
                    className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    <HiTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => !disabled && !subiendo && cupo > 0 && entrada.current?.click()}
        className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          disabled || subiendo || cupo === 0
            ? 'cursor-not-allowed border-gray-300 opacity-60'
            : 'cursor-pointer border-gray-300 hover:border-[#F26726]'
        }`}
      >
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          multiple
          onChange={elegir}
          className="hidden"
          disabled={disabled}
        />
        {subiendo ? (
          <div className="space-y-2">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-[#F26726]" />
            <p className="text-sm text-gray-600">Subiendo fotos…</p>
          </div>
        ) : (
          <div className="space-y-1">
            <HiPhotograph className="mx-auto h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {cupo === 0 ? `Ya tienes las ${MAX_FOTOS} fotos` : 'Haz clic para subir fotos'}
            </p>
            <p className="text-xs text-gray-400">
              {valor.length} de {MAX_FOTOS} · JPG o PNG hasta 10 MB · la primera es la principal
            </p>
          </div>
        )}
      </div>

      {errores.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          {errores.map((e, i) => (
            <p key={i} className="text-sm text-red-600">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
