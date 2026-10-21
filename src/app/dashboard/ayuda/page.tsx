"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';
import { listArticulos, type ArticuloResumen } from '@/lib/api/ayuda';
import { mensajeDeError } from '@/lib/api/client';

/** Centro de ayuda: los artículos publicados para el rol de quien mira, por categoría. */
export default function AyudaPage() {
  const [articulos, setArticulos] = useState<ArticuloResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // La búsqueda va al API (mira también el cuerpo), con una pausa para no
  // pedir en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      listArticulos({ q: busqueda.trim() || undefined })
        .then((a) => {
          setArticulos(a);
          setError(null);
        })
        .catch((e) => setError(mensajeDeError(e)))
        .finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, ArticuloResumen[]>();
    for (const a of articulos) mapa.set(a.category, [...(mapa.get(a.category) ?? []), a]);
    return [...mapa.entries()];
  }, [articulos]);

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-[#334C5D] dark:text-gray-100">Centro de ayuda</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
          Guías para sacarle el mayor provecho a Tenemos Filo.
        </p>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en la ayuda"
          aria-label="Buscar en la ayuda"
          className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />

        {cargando ? (
          <Loader />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : porCategoria.length === 0 ? (
          <p className="text-sm text-gray-500">
            {busqueda.trim() ? 'Nada coincide con tu búsqueda.' : 'Todavía no hay artículos publicados.'}
          </p>
        ) : (
          <div className="space-y-6">
            {porCategoria.map(([categoria, items]) => (
              <section key={categoria}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {categoria}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((a) => (
                    <Link key={a.id} href={`/dashboard/ayuda/${a.slug}`}>
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{a.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{a.summary}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
