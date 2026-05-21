"use client";

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Badge, Button, Spinner, TextInput } from 'flowbite-react';
import {
  AiOutlineLink,
  AiOutlineCopy,
  AiOutlineSearch,
  AiOutlineEye,
  AiOutlineCheckCircle,
} from 'react-icons/ai';
import Link from 'next/link';
import {
  getResaleLinks,
  formatCOP,
  ResaleLink,
} from '@/lib/sanity/resellerService';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export default function ResaleLinksPage() {
  const [links, setLinks] = useState<ResaleLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { showSuccess } = useSweetAlert();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResaleLinks();
      setLinks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = links.filter((l) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      l.code.toLowerCase().includes(q) ||
      l.experienceTitle.toLowerCase().includes(q) ||
      l.hostCompanyName.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      await showSuccess('Link copiado', 'Pégalo donde quieras compartirlo.');
    } catch {
      await showSuccess('Link', url);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Links de reventa
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestiona los links que generaste desde el catálogo y comparte con tus clientes.
            </p>
          </div>
          <Link href="/dashboard/catalog">
            <Button className="bg-[#F26726] hover:bg-[#F26726]/90">
              <AiOutlineLink className="mr-2" />
              Generar nuevo link
            </Button>
          </Link>
        </div>

        {/* Filtro */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <TextInput
            icon={AiOutlineSearch}
            placeholder="Buscar por código, experiencia o host..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Listado */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              Aún no tienes links. Ve al{' '}
              <Link href="/dashboard/catalog" className="text-[#F26726] underline">
                catálogo
              </Link>{' '}
              y genera el primero.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((l) => {
              const conversionRate = l.clicks > 0 ? (l.conversions / l.clicks) * 100 : 0;
              return (
                <div
                  key={l.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-[#F26726]/10 text-[#F26726] px-2 py-0.5 rounded">
                          {l.code}
                        </code>
                        <Badge color={l.isActive ? 'success' : 'gray'}>
                          {l.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {l.experienceTitle}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Host: {l.hostCompanyName}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2 flex items-center gap-2 mb-3">
                    <code className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {l.url}
                    </code>
                    <button
                      onClick={() => handleCopy(l.url)}
                      className="shrink-0 p-1.5 text-gray-600 dark:text-gray-400 hover:text-[#F26726] dark:hover:text-[#F26726] hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                      title="Copiar link"
                    >
                      <AiOutlineCopy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                        <AiOutlineEye /> Clicks
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {l.clicks}
                      </p>
                    </div>
                    <div className="text-center bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                        <AiOutlineCheckCircle /> Reventas
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {l.conversions}
                      </p>
                    </div>
                    <div className="text-center bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Conversión</p>
                      <p className="text-lg font-semibold text-[#19A3A2]">
                        {conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Precio base: {formatCOP(l.basePrice)} · Comisión {l.commissionPercent}%
                    </span>
                    <span>
                      {new Date(l.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
