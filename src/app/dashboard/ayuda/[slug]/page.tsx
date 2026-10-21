"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from '@/components/Loader';
import ContenidoMarkdown from '@/components/Ayuda/ContenidoMarkdown';
import { getArticulo, type Articulo } from '@/lib/api/ayuda';

export default function ArticuloDeAyudaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getArticulo(slug)
      .then(setArticulo)
      // 404 (no existe, o no es para este rol) y fallo de red se ven igual.
      .catch(() => setArticulo(null))
      .finally(() => setCargando(false));
  }, [slug]);

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 max-w-3xl">
        <Link href="/dashboard/ayuda" className="text-sm text-marca hover:underline">
          ← Centro de ayuda
        </Link>
        {cargando ? (
          <Loader />
        ) : !articulo ? (
          <p className="mt-6 text-gray-500">No encontramos este artículo.</p>
        ) : (
          <article className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {articulo.category}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#334C5D] dark:text-gray-100">
              {articulo.title}
            </h1>
            {!articulo.isPublished && (
              <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Borrador: solo lo ves tú, como administrador.
              </p>
            )}
            <ContenidoMarkdown texto={articulo.body} />
          </article>
        )}
      </div>
    </ProtectedRoute>
  );
}
