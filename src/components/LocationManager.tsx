"use client";

import React, { useState } from 'react';
import { 
  Location
} from '@/types';
import {
  updateLocationInSanity,
  deleteLocationInSanity,
  setMainLocation
} from '@/lib/sanity/locationService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { 
  AiOutlinePlus, 
  AiOutlineEdit, 
  AiOutlineDelete, 
  AiOutlineStar,
  AiOutlineCheck,
  AiOutlineClose
} from 'react-icons/ai';
import { BiMap, BiPhone, BiEnvelope, BiUser } from 'react-icons/bi';
import LocationModal from './LocationModal';
import { getCountryName } from '@/lib/constants/countries';

interface LocationManagerProps {
  locations: Location[];
  onLocationsChange: (locations: Location[]) => void;
  companyId: string;
}

const LocationManager: React.FC<LocationManagerProps> = ({ 
  locations, 
  onLocationsChange, 
  companyId 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const { showSuccess, showError, showConfirmation, showLoading, hideLoading } = useSweetAlert();

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setShowCreateModal(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setShowCreateModal(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. La sede se marcará como eliminada.',
      'Sí, eliminar'
    );

    if (confirmed) {
      try {
        showLoading('Eliminando sede...');
        await deleteLocationInSanity(locationId);
        hideLoading();
        onLocationsChange(locations.filter(loc => loc._id !== locationId));
        showSuccess('Sede eliminada exitosamente');
      } catch (error) {
        hideLoading();
        showError('Error al eliminar la sede');
        console.error(error);
      }
    }
  };

  const handleSetMain = async (locationId: string) => {
    try {
      showLoading('Estableciendo como sede principal...');
      await setMainLocation(locationId, companyId);
      hideLoading();
      
      // Actualizar el estado local
      const updatedLocations = locations.map(loc => ({
        ...loc,
        isMain: loc._id === locationId
      }));
      onLocationsChange(updatedLocations);
      
      showSuccess('Sede establecida como principal');
    } catch (error) {
      hideLoading();
      showError('Error al establecer la sede como principal');
      console.error(error);
    }
  };

  const handleToggleActive = async (location: Location) => {
    try {
      showLoading(location.isActive ? 'Desactivando...' : 'Activando...');
      await updateLocationInSanity(location._id, {
        isActive: !location.isActive
      });
      hideLoading();
      
      // Actualizar el estado local
      const updatedLocations = locations.map(loc => 
        loc._id === location._id ? { ...loc, isActive: !loc.isActive } : loc
      );
      onLocationsChange(updatedLocations);
      
      showSuccess(
        location.isActive 
          ? 'Sede desactivada exitosamente' 
          : 'Sede activada exitosamente'
      );
    } catch (error) {
      hideLoading();
      showError('Error al actualizar la sede');
      console.error(error);
    }
  };

  const handleLocationSaved = (updatedLocations: Location[]) => {
    onLocationsChange(updatedLocations);
    setShowCreateModal(false);
    setEditingLocation(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-center items-center">
        <button
          onClick={handleCreateLocation}
          className="flex items-center px-4 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
        >
          <AiOutlinePlus className="mr-2" />
          Nueva Sede
        </button>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <LocationCard
            key={location._id}
            location={location}
            onEdit={() => handleEditLocation(location)}
            onDelete={() => handleDeleteLocation(location._id)}
            onSetMain={() => handleSetMain(location._id)}
            onToggleActive={() => handleToggleActive(location)}
          />
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <LocationModal
          location={editingLocation}
          companyId={companyId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLocation(null);
          }}
          onSave={handleLocationSaved}
          existingLocations={locations}
        />
      )}
    </div>
  );
};

interface LocationCardProps {
  location: Location;
  onEdit: () => void;
  onDelete: () => void;
  onSetMain: () => void;
  onToggleActive: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onEdit,
  onDelete,
  onSetMain,
  onToggleActive,
}) => {
  const formatAddress = (address: Location['address']) => {
    const parts = [
      address.street,
      address.city,
      address.state,
      getCountryName(address.country)
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getCapacityText = (capacity?: Location['capacity']) => {
    if (!capacity) return 'Sin especificar';
    if (capacity.minGuests && capacity.maxGuests) {
      return `${capacity.minGuests} - ${capacity.maxGuests} invitados`;
    }
    if (capacity.maxGuests) {
      return `Hasta ${capacity.maxGuests} invitados`;
    }
    if (capacity.minGuests) {
      return `Mínimo ${capacity.minGuests} invitados`;
    }
    return 'Sin especificar';
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-[#334C5D]">
                {location.name}
              </h4>
              {location.isMain && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AiOutlineStar className="mr-1" />
                  Principal
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                location.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {location.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            {location.description && (
              <p className="text-sm text-gray-600 mb-3">{location.description}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="mb-4">
          <div className="flex items-start gap-2">
            <BiMap className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-900">{formatAddress(location.address)}</p>
              {location.address.postalCode && (
                <p className="text-xs text-gray-500">{location.address.postalCode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {location.contactInfo?.phone && (
            <div className="flex items-center gap-2">
              <BiPhone className="text-gray-400 text-sm" />
              <span className="text-sm text-gray-600">{location.contactInfo.phone}</span>
            </div>
          )}
          {location.contactInfo?.email && (
            <div className="flex items-center gap-2">
              <BiEnvelope className="text-gray-400 text-sm" />
              <span className="text-sm text-gray-600">{location.contactInfo.email}</span>
            </div>
          )}
        </div>

        {/* Capacity */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <BiUser className="text-gray-400 text-sm" />
            <span className="text-sm text-gray-600">{getCapacityText(location.capacity)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            {!location.isMain && location.isActive && (
              <button
                onClick={onSetMain}
                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Establecer como principal"
              >
                <AiOutlineStar className="text-lg" />
              </button>
            )}
            <button
              onClick={onToggleActive}
              className={`p-2 rounded-lg transition-colors ${
                location.isActive
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={location.isActive ? 'Desactivar' : 'Activar'}
            >
              {location.isActive ? <AiOutlineClose className="text-lg" /> : <AiOutlineCheck className="text-lg" />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <AiOutlineEdit className="text-lg" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <AiOutlineDelete className="text-lg" />
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(location.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationManager;
