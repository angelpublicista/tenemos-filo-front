"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getExperiencesByCompany, getExperienceStatsByCompany, updateExperienceStatus, deleteExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { Experience, Company } from '@/types';

interface ExperienceStats {
  total: number;
  active: number;
  draft: number;
  pending: number;
  paused: number;
  inactive: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
}
import { Button, Select } from 'flowbite-react';
import { 
  HiPlus, 
  HiStar,
  HiExclamationCircle,
  HiViewGrid,
  HiViewList
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import ExperienceStats from '@/components/ExperienceStats';
import { ManageExperienceCard } from '@/components/ManageExperienceCard';

export default function ExperiencesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<ExperienceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cargar datos
  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const companyData = await getCompanyByUserId(user.uid);

      if (!companyData) {
        showError('No se encontró información de empresa. Completa el registro de empresa primero.');
        router.push('/dashboard/company-setup');
        return;
      }

      setCompany(companyData);

      // Cargar experiencias y estadísticas con el ID de la empresa
      const [experiencesWithCompany, statsWithCompany] = await Promise.all([
        getExperiencesByCompany(companyData._id),
        getExperienceStatsByCompany(companyData._id)
      ]);

      setExperiences(experiencesWithCompany);
      setStats(statsWithCompany);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filtrar experiencias por estado
  const filteredExperiences = experiences.filter(experience => {
    if (statusFilter === 'all') return true;
    return experience.status === statusFilter;
  });

  // Cambiar estado de experiencia
  const handleStatusChange = async (experienceId: string, newStatus: Experience['status']) => {
    try {
      setIsUpdating(experienceId);
      await updateExperienceStatus(experienceId, newStatus);
      
      // Actualizar estado local
      setExperiences(prev => 
        prev.map(exp => 
          exp._id === experienceId 
            ? { ...exp, status: newStatus }
            : exp
        )
      );

      // Recargar estadísticas
      if (company) {
        const newStats = await getExperienceStatsByCompany(company._id);
        setStats(newStats);
      }

      showSuccess('Estado actualizado exitosamente');
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar el estado');
    } finally {
      setIsUpdating(null);
    }
  };

  // Eliminar experiencia
  const handleDelete = async (experienceId: string, experienceTitle: string) => {
    const confirmed = await showConfirmation(
      'Eliminar Experiencia',
      `¿Estás seguro de que quieres eliminar "${experienceTitle}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setIsUpdating(experienceId);
      await deleteExperienceInSanity(experienceId);
      
      // Actualizar estado local
      setExperiences(prev => prev.filter(exp => exp._id !== experienceId));

      // Recargar estadísticas
      if (company) {
        const newStats = await getExperienceStatsByCompany(company._id);
        setStats(newStats);
      }

      showSuccess('Experiencia eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting experience:', error);
      showError('Error al eliminar la experiencia');
    } finally {
      setIsUpdating(null);
    }
  };

  // Handlers para las cards
  const handleEdit = (experienceId: string) => {
    router.push(`/dashboard/experiences/${experienceId}/edit`);
  };

  if (isLoading) {
    return <Loader message="Cargando tus experiencias..." />;
  }

  if (!company) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
            Empresa no encontrada
          </h2>
          <p className="text-gray-600 mb-6">
            Necesitas completar el registro de tu empresa antes de gestionar experiencias.
          </p>
          <Button
            color="primary"
            onClick={() => router.push('/dashboard/company-setup')}
            className="px-6 py-3"
          >
            Completar Registro de Empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
              Mis Experiencias
            </h1>
            <p className="text-gray-600">
              Gestiona todas las experiencias de <span className="font-bold">{company.companyName}</span>
            </p>
          </div>
          
          <Button
            color="primary"
            href="/dashboard/experiences/create"
            className="px-6 py-3"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Crear Nueva Experiencia
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <ExperienceStats stats={stats} className="mb-8" />
      )}

      <hr className="my-8 border-gray-200" />

      {/* Filtros */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#334C5D]">
            Experiencias ({filteredExperiences.length})
          </h2>
          
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="draft">Borradores</option>
              <option value="pending">Pendientes</option>
              <option value="paused">Pausadas</option>
              <option value="inactive">Inactivas</option>
            </Select>
            
            {/* Toggle de vista */}
            <div className="flex items-center gap-2 rounded-lg p-1">
              <Button
                color={viewMode === 'grid' ? 'primary' : 'gray'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3 py-2"
              >
                <HiViewGrid className="w-4 h-4" />
              </Button>
              <Button
                color={viewMode === 'list' ? 'primary' : 'gray'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3 py-2"
              >
                <HiViewList className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Experiencias */}
      {filteredExperiences.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <HiStar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {statusFilter === 'all' ? 'No tienes experiencias creadas' : 'No hay experiencias con este estado'}
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? 'Crea tu primera experiencia gastronómica para comenzar'
              : 'Cambia el filtro para ver otras experiencias'
            }
          </p>
          {statusFilter === 'all' && (
            <Button
              color="primary"
              href="/dashboard/experiences/create"
              className="px-6 py-3 w-auto inline-flex"
            >
              <HiPlus className="w-5 h-5 mr-2" />
              Crear Primera Experiencia
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-2'}>
          {filteredExperiences.map((experience) => (
            <ManageExperienceCard
              key={experience._id}
              experience={experience}
              viewMode={viewMode}
              isUpdating={isUpdating === experience._id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
