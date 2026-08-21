"use client";

import React from 'react';
import { Badge, Button, Select } from 'flowbite-react';
import { 
  HiPencilAlt, 
  HiTrash, 
  HiClock,
  HiUsers,
  HiCurrencyDollar
} from 'react-icons/hi';
import { Experience } from '@/types';

interface ManageExperienceCardProps {
  experience: Experience;
  viewMode: 'grid' | 'list';
  isUpdating: boolean;
  onEdit: (experienceId: string) => void;
  onDelete: (experienceId: string, experienceTitle: string) => void;
  onStatusChange: (experienceId: string, newStatus: Experience['status']) => void;
}

export const ManageExperienceCard: React.FC<ManageExperienceCardProps> = ({
  experience,
  viewMode,
  isUpdating,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
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

  // Vista Grid
  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
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
              {experience.categories && experience.categories.length > 0 && (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                  {formatCategories(experience.categories)}
                </span>
              )}
            </div>
          </div>

          {/* Descripción */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {experience.description}
          </p>

          {/* Detalles */}
          <div className="space-y-1.5 mb-3">
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
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pt-3 border-t border-gray-200">
            <span>{experience.totalBookings || 0} reservas</span>
            <span>{experience.rating ? `${experience.rating.toFixed(1)} ⭐` : 'Sin calificaciones'}</span>
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                color="gray"
                size="sm"
                onClick={() => onEdit(experience._id)}
                title="Editar experiencia"
                className="flex-1"
              >
                <HiPencilAlt className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                color="danger"
                size="sm"
                onClick={() => onDelete(experience._id, experience.title)}
                disabled={isUpdating}
                title="Eliminar experiencia"
              >
                <HiTrash className="w-4 h-4" />
              </Button>
            </div>

            {/* Cambio de estado */}
            <Select
              value={experience.status}
              onChange={(e) => onStatusChange(experience._id, e.target.value as Experience['status'])}
              disabled={isUpdating}
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
      </div>
    );
  }

  // Vista Lista
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3">
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
              {experience.categories && experience.categories.length > 0 && (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {formatCategories(experience.categories)}
                </span>
              )}
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
              onChange={(e) => onStatusChange(experience._id, e.target.value as Experience['status'])}
              disabled={isUpdating}
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
              onClick={() => onEdit(experience._id)}
              className="px-2 py-1"
              title="Editar experiencia"
            >
              <HiPencilAlt className="w-3 h-3" />
            </Button>
            <Button
              color="danger"
              size="xs"
              onClick={() => onDelete(experience._id, experience.title)}
              disabled={isUpdating}
              className="px-2 py-1"
              title="Eliminar experiencia"
            >
              <HiTrash className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

