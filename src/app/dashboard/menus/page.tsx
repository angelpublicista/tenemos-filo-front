"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getMenusByCompany, deleteMenuInSanity, updateMenuInSanity } from '@/lib/sanity/menuService';
import { Menu } from '@/types';
import { contarPlatos } from '@/components/MenuEditor';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SkeletonCard } from '@/components/Skeleton';
import Loader from '@/components/Loader';
import { HiExclamationCircle } from 'react-icons/hi';
import { BiRestaurant, BiBuilding } from 'react-icons/bi';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';

export default function MenusPage() {
  const { sanityUser } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError, showDestructiveConfirmation, showLoading, hideLoading } =
    useSweetAlert();

  const cargarMenus = useCallback(async () => {
    if (!sanityUser?.companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Con las desactivadas: en el panel se gestionan, no solo se consultan.
      const data = await getMenusByCompany(sanityUser.companyId, { includeInactive: true });
      setMenus(data || []);
    } catch (error) {
      console.error('Error cargando menús:', error);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, [sanityUser?.companyId]);

  useEffect(() => {
    cargarMenus();
  }, [cargarMenus]);

  const eliminar = async (menu: Menu) => {
    const enUso = menu.experiences?.length ?? 0;
    const confirmado = await showDestructiveConfirmation(
      '¿Eliminar esta carta?',
      enUso > 0
        ? `Se usa en ${enUso} experiencia${enUso === 1 ? '' : 's'}: dejará de aparecer en su catálogo.`
        : 'Esta acción no se puede deshacer.',
      'Sí, eliminar',
    );
    if (!confirmado) return;

    try {
      showLoading('Eliminando carta...');
      await deleteMenuInSanity(menu._id);
      hideLoading();
      setMenus((prev) => prev.filter((m) => m._id !== menu._id));
      showSuccess('Carta eliminada');
    } catch (error) {
      hideLoading();
      showError('No se pudo eliminar la carta');
      console.error(error);
    }
  };

  const alternarActiva = async (menu: Menu) => {
    try {
      showLoading(menu.isActive ? 'Desactivando...' : 'Activando...');
      await updateMenuInSanity(menu._id, { isActive: !menu.isActive });
      hideLoading();
      setMenus((prev) =>
        prev.map((m) => (m._id === menu._id ? { ...m, isActive: !m.isActive } : m)),
      );
      showSuccess(menu.isActive ? 'Carta desactivada' : 'Carta activada');
    } catch (error) {
      hideLoading();
      showError('No se pudo cambiar el estado de la carta');
      console.error(error);
    }
  };

  if (!sanityUser) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando información del usuario..." />
      </ProtectedRoute>
    );
  }

  if (!sanityUser.companyId) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#334C5D] mb-2">Mis Menús</h1>
            <p className="text-gray-600">Las cartas que ofreces en tus experiencias</p>
          </div>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <HiExclamationCircle className="mx-auto text-6xl text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Completa la información de tu empresa
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Antes de crear menús, necesitas completar la información de tu empresa.
            </p>
            <Link
              href="/dashboard/company"
              className="inline-flex items-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
            >
              <BiBuilding className="mr-2 text-xl" />
              Completar Información de Empresa
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        {menus.length === 0 && !loading ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-2">Mis Menús</h1>
              <p className="text-gray-600">Las cartas que ofreces en tus experiencias</p>
            </div>
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BiRestaurant className="mx-auto text-6xl text-gray-300 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                No tienes cartas registradas
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Crea una carta una vez y úsala en todas las experiencias que la ofrezcan.
                Si cambias un plato, cambia en todas.
              </p>
              <Link
                href="/dashboard/menus/crear"
                className="inline-flex items-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
              >
                <AiOutlinePlus className="mr-2 text-xl" /> Nueva carta
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-1">Mis Menús</h1>
                <p className="text-gray-600">Las cartas que ofreces en tus experiencias</p>
              </div>
              <Link
                href="/dashboard/menus/crear"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors shrink-0"
              >
                <AiOutlinePlus className="mr-2 text-xl" /> Nueva carta
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menus.map((menu) => (
                  <div
                    key={menu._id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[#334C5D] min-w-0 break-words">
                        {menu.name}
                      </h3>
                      {!menu.isActive && (
                        <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          Desactivada
                        </span>
                      )}
                    </div>

                    {menu.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{menu.description}</p>
                    )}

                    <p className="text-sm text-gray-500 mb-3">
                      {menu.sections.length} sección{menu.sections.length === 1 ? '' : 'es'} ·{' '}
                      {contarPlatos(menu.sections)} plato
                      {contarPlatos(menu.sections) === 1 ? '' : 's'}
                    </p>

                    {menu.experiences && menu.experiences.length > 0 && (
                      <p className="text-xs text-gray-500 mb-4">
                        En uso:{' '}
                        <span className="text-gray-700">
                          {menu.experiences.map((e) => e.title).join(', ')}
                        </span>
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-1">
                      <Link
                        href={`/dashboard/menus/${menu._id}/editar`}
                        className="p-2 text-gray-400 hover:text-[#F26726] transition-colors"
                        aria-label="Editar carta"
                      >
                        <AiOutlineEdit className="text-lg" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => alternarActiva(menu)}
                        className="p-2 text-gray-400 hover:text-[#19A3A2] transition-colors cursor-pointer"
                        aria-label={menu.isActive ? 'Desactivar carta' : 'Activar carta'}
                      >
                        {menu.isActive ? (
                          <AiOutlineClose className="text-lg" />
                        ) : (
                          <AiOutlineCheck className="text-lg" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(menu)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label="Eliminar carta"
                      >
                        <AiOutlineDelete className="text-lg" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
