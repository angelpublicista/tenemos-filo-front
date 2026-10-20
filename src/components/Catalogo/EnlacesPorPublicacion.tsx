"use client";

import React, { useEffect, useState } from 'react';
import { Card } from 'flowbite-react';
import { HiExternalLink } from 'react-icons/hi';
import { getResellerCatalog } from '@/lib/api/catalog';
import CopiarEnlaceDePublicacion from '@/components/Catalogo/CopiarEnlaceDePublicacion';

interface Fila {
  slug: string;
  titulo: string;
  donde: string;
}

/**
 * Los enlaces de cada publicación del catálogo de un revendedor.
 *
 * Cada publicación —una experiencia en una sede, o a domicilio— tiene su
 * propia URL en /r/<canal>/<publicación>. Sirve para compartir una sola
 * experiencia por redes o WhatsApp en vez de todo el catálogo; la venta queda
 * atribuida al canal igual que con el enlace general.
 */
export default function EnlacesPorPublicacion({ slug }: { slug: string }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    getResellerCatalog(slug)
      .then(({ experiences }) => {
        const salida: Fila[] = [];
        for (const e of experiences) {
          for (const l of e.locationListings ?? []) {
            if (!l.slug) continue;
            const sede = l.locationId ? e.locations?.find((s) => s._id === l.locationId) : null;
            salida.push({
              slug: l.slug,
              titulo: e.title,
              donde: l.locationId ? (sede?.name ?? 'Sede') : 'A domicilio',
            });
          }
        }
        setFilas(salida);
      })
      .catch(() => setFilas([]))
      .finally(() => setCargando(false));
  }, [slug]);

  const visibles = filas.filter((f) =>
    `${f.titulo} ${f.donde}`.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-[#334C5D] dark:text-gray-100">
        Enlace de cada experiencia
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Comparte una sola experiencia, ya en su sede y lista para elegir fecha. La reserva queda
        atribuida a ti.
      </p>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay experiencias publicadas.</p>
      ) : (
        <>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por experiencia o sede"
            aria-label="Buscar experiencia"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {visibles.map((f) => (
              <li key={f.slug} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">{f.titulo}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{f.donde}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CopiarEnlaceDePublicacion ruta={`/r/${slug}/${f.slug}`} />
                  <a
                    href={`/r/${slug}/${f.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${f.titulo}`}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <HiExternalLink className="h-5 w-5" />
                  </a>
                </div>
              </li>
            ))}
            {visibles.length === 0 && (
              <li className="py-3 text-sm text-gray-500">Nada coincide con tu búsqueda.</li>
            )}
          </ul>
        </>
      )}
    </Card>
  );
}
