"use client";

import React from 'react';
import { Experience } from '@/types';
import { Card, Button, Badge } from 'flowbite-react';
import { 
  HiStar, 
  HiClock, 
  HiUsers, 
  HiLocationMarker,
  HiVideoCamera,
  HiEye,
  HiPencilAlt
} from 'react-icons/hi';

interface ExperienceCardProps {
  experience: Experience;
  showActions?: boolean;
  onView?: (experience: Experience) => void;
  onEdit?: (experience: Experience) => void;
  className?: string;
}

export default function ExperienceCard({ 
  experience, 
  showActions = false, 
  onView, 
  onEdit,
  className = ""
}: ExperienceCardProps) {
  
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

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* Imagen */}
      {experience.images && experience.images.length > 0 && (
        <div className="h-48 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">Imagen de la experiencia</span>
        </div>
      )}

      <div className="p-6">
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
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <HiClock className="w-4 h-4 mr-1" />
            {formatDuration(experience.duration)}
          </div>
          <div className="flex items-center">
            <HiUsers className="w-4 h-4 mr-1" />
            {experience.capacity} personas
          </div>
          <div className="flex items-center">
            {experience.experienceType === 'virtual' ? (
              <HiVideoCamera className="w-4 h-4 mr-1" />
            ) : (
              <HiLocationMarker className="w-4 h-4 mr-1" />
            )}
            {experience.experienceType === 'virtual' ? 'Virtual' : 
             experience.experienceType === 'hybrid' ? 'Híbrida' : 'Presencial'}
          </div>
        </div>

        {/* Estadísticas */}
        {experience.totalBookings > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pt-4 border-t border-gray-200">
            <span>{experience.totalBookings} reservas</span>
            {experience.rating && (
              <span className="flex items-center">
                <HiStar className="w-4 h-4 mr-1 text-yellow-500" />
                {experience.rating.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Precio y Acciones */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-[#F26726]">
            {formatPrice(experience.basePrice, experience.currency)}
          </span>
          
          {showActions && (
            <div className="flex items-center gap-2">
              {onView && (
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => onView(experience)}
                >
                  <HiEye className="w-4 h-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => onEdit(experience)}
                >
                  <HiPencilAlt className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          {!showActions && (
            <Button color="primary" size="sm">
              Ver Detalles
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
