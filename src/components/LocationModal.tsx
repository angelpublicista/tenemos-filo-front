"use client";

import React, { useState, useEffect } from 'react';
import { Location } from '@/types';
import {
  createLocationInSanity,
  updateLocationInSanity
} from '@/lib/sanity/locationService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { AiOutlineClose } from 'react-icons/ai';
import { COUNTRIES } from '@/lib/constants/countries';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

interface LocationModalProps {
  location: Location | null;
  companyId: string;
  onClose: () => void;
  onSave: (updatedLocations: Location[]) => void;
  existingLocations: Location[];
}

const LocationModal: React.FC<LocationModalProps> = ({
  location,
  companyId,
  onClose,
  onSave,
  existingLocations,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isMain: false,
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'CO',
    phone: '',
    email: '',
    minGuests: '',
    maxGuests: '',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useSweetAlert();

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        isMain: location.isMain || false,
        street: location.address?.street || '',
        city: location.address?.city || '',
        state: location.address?.state || '',
        postalCode: location.address?.postalCode || '',
        country: location.address?.country || 'CO',
        phone: location.contactInfo?.phone || '',
        email: location.contactInfo?.email || '',
        minGuests: location.capacity?.minGuests?.toString() || '',
        maxGuests: location.capacity?.maxGuests?.toString() || '',
        isActive: location.isActive !== false,
      });
    } else {
      // Para nueva sede, verificar si ya existe una principal
      const hasMainLocation = existingLocations.some(loc => loc.isMain);
      setFormData(prev => ({
        ...prev,
        isMain: !hasMainLocation, // Si no hay principal, esta será principal
        country: 'CO', // Por defecto Colombia
      }));
    }
  }, [location, existingLocations]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Por favor ingresa el nombre de la sede');
      return;
    }

    if (!formData.street.trim()) {
      showError('Por favor ingresa la dirección');
      return;
    }

    if (!formData.city.trim()) {
      showError('Por favor ingresa la ciudad');
      return;
    }

    try {
      setSaving(true);

      const locationData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isMain: formData.isMain,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          country: formData.country.trim() || undefined,
        },
        contactInfo: {
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
        },
        capacity: {
          minGuests: formData.minGuests ? parseInt(formData.minGuests) : undefined,
          maxGuests: formData.maxGuests ? parseInt(formData.maxGuests) : undefined,
        },
        isActive: formData.isActive,
      };

      let updatedLocations: Location[];

      if (location) {
        // Actualizar sede existente
        const updated = await updateLocationInSanity(location._id, locationData);
        updatedLocations = existingLocations.map(loc => 
          loc._id === location._id ? updated : loc
        );
        showSuccess('Sede actualizada exitosamente');
      } else {
        // Crear nueva sede
        const newLocation = await createLocationInSanity({
          ...locationData,
          companyId,
        });
        updatedLocations = [...existingLocations, newLocation as Location];
        showSuccess('Sede creada exitosamente');
      }

      onSave(updatedLocations);
    } catch (error) {
      showError('Error al guardar la sede');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#334C5D]">
              {location ? 'Editar Sede' : 'Nueva Sede'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <AiOutlineClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información Básica
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Nombre de la Sede *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: Sede Centro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Descripción de la sede..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isMain}
                      onChange={(e) => handleInputChange('isMain', e.target.checked)}
                      className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sede Principal
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sede Activa
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Dirección
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Calle y Número *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: Calle 50 #25-30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                      placeholder="Ej: Bogotá"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Estado/Provincia
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                      placeholder="Ej: Cundinamarca"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                      placeholder="Ej: 110111"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      País
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    >
                      <option value="">Selecciona un país</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información de Contacto
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Teléfono
                  </label>
                  <PhoneInput
                    defaultCountry="co"
                    value={formData.phone}
                    onChange={(phone) => handleInputChange('phone', phone)}
                    placeholder="Teléfono"
                    className="w-full [&>input]:w-full [&>input]:px-4 [&>input]:py-2 [&>input]:border [&>input]:border-gray-300 [&>input]:rounded-lg [&>input]:focus:ring-2 [&>input]:focus:ring-[#F26726] [&>input]:focus:border-transparent [&>button]:border [&>button]:border-gray-300 [&>button]:rounded-l-lg [&>button]:bg-white [&>button]:hover:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: sede@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Capacidad */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Capacidad para Eventos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Mínimo de Invitados
                  </label>
                  <input
                    type="number"
                    value={formData.minGuests}
                    onChange={(e) => handleInputChange('minGuests', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: 10"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Máximo de Invitados
                  </label>
                  <input
                    type="number"
                    value={formData.maxGuests}
                    onChange={(e) => handleInputChange('maxGuests', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F26726] focus:border-transparent"
                    placeholder="Ej: 100"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : (location ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
