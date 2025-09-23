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
  HiEye, 
  HiStar,
  HiClock,
  HiUsers,
  HiCurrencyDollar,
  HiCheckCircle,
  HiExclamationCircle,
  HiMinus
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import ExperienceStats from '@/components/ExperienceStats';

export default function MyExperiencesPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<ExperienceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cargar datos
  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const [companyData, experiencesData, statsData] = await Promise.all([
        getCompanyByUserId(user.uid),
        getExperiencesByCompany(''), // Se actualizará después de obtener la empresa
        Promise.resolve(null) // Se actualizará después de obtener la empresa
      ]);

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
    if (currency === 'USD') {
      return `$${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString('es-CO')}`;
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
              Gestiona todas las experiencias de {company.companyName}
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

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
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
              className="px-6 py-3"
            >
              <HiPlus className="w-5 h-5 mr-2" />
              Crear Primera Experiencia
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExperiences.map((experience) => (
            <Card key={experience._id} className="overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#334C5D] mb-2 line-clamp-2">
                      {experience.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge color={getStatusColor(experience.status)}>
                        {getStatusText(experience.status)}
                      </Badge>
                      {experience.isFeatured && (
                        <Badge color="warning">
                          Destacada
                        </Badge>
                      )}
                    </div>
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
                  <span>{experience.totalBookings} reservas</span>
                  <span>{experience.rating ? `${experience.rating.toFixed(1)} ⭐` : 'Sin calificaciones'}</span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      color="gray"
                      size="sm"
                      onClick={() => {
                        // TODO: Implementar vista de detalles de experiencia
                        console.log('Ver detalles de:', experience.title);
                      }}
                      title="Ver detalles"
                    >
                      <HiEye className="w-4 h-4" />
                    </Button>
                    <Button
                      color="gray"
                      size="sm"
                      onClick={() => {
                        // TODO: Implementar edición de experiencia
                        console.log('Editar experiencia:', experience.title);
                      }}
                      title="Editar experiencia"
                    >
                      <HiPencilAlt className="w-4 h-4" />
                    </Button>
                    <Button
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(experience._id, experience.title)}
                      disabled={isUpdating === experience._id}
                    >
                      <HiTrash className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Cambio de estado */}
                  <Select
                    value={experience.status}
                    onChange={(e) => handleStatusChange(experience._id, e.target.value as Experience['status'])}
                    disabled={isUpdating === experience._id}
                    className="w-32"
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
      )}
    </div>
  );
}
