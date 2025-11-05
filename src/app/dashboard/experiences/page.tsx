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
import { Button, Card, Select, Badge } from 'flowbite-react';
import { 
  HiPlus, 
  HiPencilAlt, 
  HiTrash, 
  HiStar,
  HiClock,
  HiUsers,
  HiCurrencyDollar,
  HiExclamationCircle,
  HiViewGrid,
  HiViewList
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import ExperienceStats from '@/components/ExperienceStats';

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

  // Formatear precio
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Formatear duración
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Formatear categoría
  const formatCategories = (categories: string[]) => {
    const categoryLabels: Record<string, string> = {
      'cooking': 'Cocina',
      'mixology': 'Mixología',
      'tasting': 'Degustación',
      'catering': 'Catering',
      'corporate': 'Eventos Corporativos',
      'celebrations': 'Celebraciones',
      'workshops': 'Talleres',
      'other': 'Otro'
    };
    return categories.map(cat => categoryLabels[cat] || cat).join(', ');
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'gray';
      case 'pending': return 'warning';
      case 'paused': return 'info';
      case 'inactive': return 'failure';
      default: return 'gray';
    }
  };

  // Obtener texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'draft': return 'Borrador';
      case 'pending': return 'Pendiente';
      case 'paused': return 'Pausada';
      case 'inactive': return 'Inactiva';
      default: return status;
    }
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
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExperiences.map((experience) => (
                <Card key={experience._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#334C5D] mb-2 line-clamp-2">
                          {experience.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color={getStatusColor(experience.status)}>
                            {getStatusText(experience.status)}
                          </Badge>
                          {experience.isFeatured && (
                            <Badge color="warning">
                              Destacada
                            </Badge>
                          )}
                        </div>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                          {formatCategories(experience.categories || [])}
                        </span>
                      </div>
                    </div>

                    {/* Descripción */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {experience.description}
                    </p>

                    {/* Detalles */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <HiClock className="w-4 h-4 mr-2" />
                        {formatDuration(experience.duration)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiUsers className="w-4 h-4 mr-2" />
                        {experience.capacity} personas máximo
                        {experience.minCapacity && ` (${experience.minCapacity} mínimo)`}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HiCurrencyDollar className="w-4 h-4 mr-2" />
                        {formatPrice(experience.basePrice, experience.currency)} por persona
                      </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pt-4 border-t border-gray-200">
                      <span>{experience.totalBookings || 0} reservas</span>
                      <span>{experience.rating ? `${experience.rating.toFixed(1)} ⭐` : 'Sin calificaciones'}</span>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          color="gray"
                          size="sm"
                          onClick={() => router.push(`/dashboard/experiences/${experience._id}/edit`)}
                          title="Editar experiencia"
                          className="flex-1"
                        >
                          <HiPencilAlt className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(experience._id, experience.title)}
                          disabled={isUpdating === experience._id}
                          title="Eliminar experiencia"
                        >
                          <HiTrash className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Cambio de estado */}
                      <Select
                        value={experience.status}
                        onChange={(e) => handleStatusChange(experience._id, e.target.value as Experience['status'])}
                        disabled={isUpdating === experience._id}
                        className="w-full text-sm"
                      >
                        <option value="draft">Borrador</option>
                        <option value="pending">Pendiente</option>
                        <option value="active">Activa</option>
                        <option value="paused">Pausada</option>
                        <option value="inactive">Inactiva</option>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExperiences.map((experience) => (
                <Card key={experience._id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Información principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-[#334C5D] truncate">
                            {experience.title}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge color={getStatusColor(experience.status)} size="sm">
                              {getStatusText(experience.status)}
                            </Badge>
                            {experience.isFeatured && (
                              <Badge color="warning" size="sm">
                                Destacada
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {formatCategories(experience.categories || [])}
                          </span>
                          <div className="flex items-center gap-1">
                            <HiClock className="w-3 h-3" />
                            {formatDuration(experience.duration)}
                          </div>
                          <div className="flex items-center gap-1">
                            <HiUsers className="w-3 h-3" />
                            {experience.capacity} max
                            {experience.minCapacity && ` (${experience.minCapacity} min)`}
                          </div>
                          <div className="flex items-center gap-1">
                            <HiCurrencyDollar className="w-3 h-3" />
                            {formatPrice(experience.basePrice, experience.currency)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{experience.totalBookings || 0} reservas</span>
                          <span>{experience.rating ? `${experience.rating.toFixed(1)} ⭐` : 'Sin calificaciones'}</span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Select
                          value={experience.status}
                          onChange={(e) => handleStatusChange(experience._id, e.target.value as Experience['status'])}
                          disabled={isUpdating === experience._id}
                          className="w-32 text-sm"
                        >
                          <option value="draft">Borrador</option>
                          <option value="pending">Pendiente</option>
                          <option value="active">Activa</option>
                          <option value="paused">Pausada</option>
                          <option value="inactive">Inactiva</option>
                        </Select>
                        
                        <Button
                          color="gray"
                          size="xs"
                          onClick={() => router.push(`/dashboard/experiences/${experience._id}/edit`)}
                          className="px-2 py-1"
                          title="Editar experiencia"
                        >
                          <HiPencilAlt className="w-3 h-3" />
                        </Button>
                        <Button
                          color="red"
                          size="xs"
                          onClick={() => handleDelete(experience._id, experience.title)}
                          disabled={isUpdating === experience._id}
                          className="px-2 py-1"
                          title="Eliminar experiencia"
                        >
                          <HiTrash className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
