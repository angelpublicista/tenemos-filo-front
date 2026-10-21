"use client";

import { useState } from 'react';
import { HiCheck, HiShare } from 'react-icons/hi';
import type { BookingExperience } from '@/components/BookingEngine/MotorReservas';

interface Props {
  experience: BookingExperience;
  /** El catálogo en que se está: /book/<empresa> o /r/<canal>. */
  rutaDelCatalogo: string;
}

/**
 * Compartir la URL propia de una experiencia del catálogo.
 *
 * Cada publicación (una sede, o a domicilio) tiene su enlace; si la
 * experiencia está en varias sedes se pregunta cuál, porque cada una abre
 * con su sede y su precio ya elegidos.
 */
export default function CompartirExperiencia({ experience, rutaDelCatalogo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const opciones = (experience.locationListings ?? [])
    .filter((l) => l.slug && l.isPublished !== false)
    .map((l) => ({
      slug: l.slug as string,
      nombre: l.locationId
        ? (experience.locations?.find((s) => s._id === l.locationId)?.name ?? 'Sede')
        : 'A domicilio',
    }));

  if (opciones.length === 0) return null;

  const compartir = async (slug: string) => {
    const url = `${window.location.origin}${rutaDelCatalogo}/${slug}`;
    setAbierto(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: experience.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (e) {
      // Cancelar el panel nativo de compartir no es un fallo.
      if ((e as Error).name === 'AbortError') return;
      window.prompt('Copia el enlace:', url);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (opciones.length === 1 ? void compartir(opciones[0].slug) : setAbierto((a) => !a))}
        aria-label={`Compartir ${experience.title}`}
        aria-expanded={opciones.length > 1 ? abierto : undefined}
        title={copiado ? 'Enlace copiado' : 'Compartir'}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        {copiado ? <HiCheck className="h-4 w-4 text-green-600" /> : <HiShare className="h-4 w-4" />}
      </button>
      {abierto && (
        <ul className="absolute bottom-full right-0 z-10 mb-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <li className="px-3 py-1 text-xs text-gray-400">Compartir enlace de…</li>
          {opciones.map((o) => (
            <li key={o.slug}>
              <button
                type="button"
                onClick={() => void compartir(o.slug)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {o.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
