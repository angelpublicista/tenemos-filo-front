"use client";

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, TextInput, Select, Spinner, Badge, Modal, ModalBody, ModalHeader, ModalFooter } from 'flowbite-react';
import {
  AiOutlineSearch,
  AiOutlineLink,
  AiOutlineStar,
  AiOutlineClockCircle,
  AiOutlineTeam,
  AiOutlineEnvironment,
} from 'react-icons/ai';
import {
  getResellerCatalog,
  createResaleLink,
  formatCOP,
  ResaleCatalogItem,
} from '@/lib/sanity/resellerService';
import { useSweetAlert } from '@/hooks/useSweetAlert';

const CATEGORY_LABELS: Record<string, string> = {
  cooking: 'Cocina',
  mixology: 'Mixología',
  tasting: 'Cata',
  catering: 'Catering',
  corporate: 'Corporativo',
  celebrations: 'Celebraciones',
  workshops: 'Talleres',
  other: 'Otro',
};

const EXPERIENCE_TYPE_LABELS: Record<string, string> = {
  virtual: 'Virtual',
  presential: 'Presencial',
  hybrid: 'Híbrida',
};

export default function CatalogPage() {
  const [items, setItems] = useState<ResaleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [experienceType, setExperienceType] = useState<'all' | 'virtual' | 'presential' | 'hybrid'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ResaleCatalogItem | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const { showSuccess, showError } = useSweetAlert();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResellerCatalog({
        category,
        experienceType: experienceType === 'all' ? undefined : experienceType,
        query,
      });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [category, experienceType, query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateLink = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const link = await createResaleLink({
        experienceId: selected.id,
        code: customCode.trim() || undefined,
      });
      await showSuccess(
        'Link generado',
        `Código: ${link.code} — ya puedes compartir el link con tus clientes.`,
      );
      setSelected(null);
      setCustomCode('');
    } catch (e) {
      await showError(
        'No pudimos generar el link',
        e instanceof Error ? e.message : 'Inténtalo nuevamente',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Catálogo de experiencias
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explora experiencias disponibles para revender y genera tu link personalizado.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              icon={AiOutlineSearch}
              placeholder="Buscar por título o host..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={experienceType}
              onChange={(e) => setExperienceType(e.target.value as typeof experienceType)}
            >
              <option value="all">Todos los formatos</option>
              <option value="presential">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Híbrida</option>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              No encontramos experiencias con esos filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              >
                <div className="h-32 bg-gradient-to-br from-[#F26726]/80 to-[#E23694]/80 flex items-center justify-center text-white">
                  <span className="text-2xl font-bold opacity-90">
                    {item.title.charAt(0)}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                      {item.title}
                    </h3>
                    {item.rating && (
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 shrink-0">
                        <AiOutlineStar className="text-[#EBD52C]" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Host: <span className="font-medium">{item.hostCompanyName}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge color="warning">{CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                    <Badge color="info">{EXPERIENCE_TYPE_LABELS[item.experienceType]}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <AiOutlineClockCircle /> {item.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <AiOutlineTeam /> {item.capacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <AiOutlineEnvironment /> {item.city}
                    </span>
                  </div>

                  <div className="mt-auto border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Precio base</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCOP(item.basePrice)}
                      </p>
                      <p className="text-xs text-[#19A3A2] font-medium">
                        Tu comisión: {item.commissionPercent}% ({formatCOP((item.basePrice * item.commissionPercent) / 100)})
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelected(item)}
                      className="bg-[#F26726] hover:bg-[#F26726]/90"
                    >
                      <AiOutlineLink className="mr-1" />
                      Generar link
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal show={!!selected} onClose={() => setSelected(null)} size="md">
        <ModalHeader>Generar link de reventa</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Experiencia</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selected.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selected.hostCompanyName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Precio base</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatCOP(selected.basePrice)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Tu comisión</p>
                  <p className="font-medium text-[#19A3A2]">
                    {selected.commissionPercent}% ({formatCOP((selected.basePrice * selected.commissionPercent) / 100)})
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código personalizado (opcional)
                </label>
                <TextInput
                  placeholder="Ej: VERANO2026"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si lo dejas vacío, se genera un código automático.
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={() => setSelected(null)} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateLink}
            disabled={creating}
            className="bg-[#F26726] hover:bg-[#F26726]/90"
          >
            {creating ? <Spinner size="sm" className="mr-2" /> : <AiOutlineLink className="mr-2" />}
            Generar link
          </Button>
        </ModalFooter>
      </Modal>
    </ProtectedRoute>
  );
}
