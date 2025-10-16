"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AvailabilityManager from '@/components/AvailabilityManager';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { Location } from '@/types';
import { BiMap, BiBuilding } from 'react-icons/bi';
import Link from 'next/link';
import Loader from '@/components/Loader';

// Datos de ejemplo para las sedes
const mockLocations: Location[] = [
  {
    _id: 'loc-1',
    _type: 'location',
    name: 'Sede Principal Centro',
    slug: { current: 'sede-principal-centro', _type: 'slug' },
    company: { _ref: 'company-1', _type: 'reference' },
    isMain: true,
    description: 'Nuestra sede principal en el centro de la ciudad',
    address: {
      street: 'Calle 50 #25-30',
      city: 'Bogotá',
      state: 'Cundinamarca',
      postalCode: '110111',
      country: 'Colombia',
    },
    contactInfo: {
      phone: '+57 310 123 4567',
      email: 'centro@ejemplo.com',
    },
    capacity: {
      minGuests: 10,
      maxGuests: 100,
    },
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    _id: 'loc-2',
    _type: 'location',
    name: 'Sede Norte',
    slug: { current: 'sede-norte', _type: 'slug' },
    company: { _ref: 'company-1', _type: 'reference' },
    isMain: false,
    description: 'Sede ubicada en el norte de la ciudad',
    address: {
      street: 'Carrera 15 #120-45',
      city: 'Bogotá',
      state: 'Cundinamarca',
      postalCode: '110111',
      country: 'Colombia',
    },
    contactInfo: {
      phone: '+57 310 765 4321',
      email: 'norte@ejemplo.com',
    },
    capacity: {
      minGuests: 5,
      maxGuests: 50,
    },
    isActive: true,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    _id: 'loc-3',
    _type: 'location',
    name: 'Sede Chapinero',
    slug: { current: 'sede-chapinero', _type: 'slug' },
    company: { _ref: 'company-1', _type: 'reference' },
    isMain: false,
    description: 'Sede en la zona de Chapinero',
    address: {
      street: 'Carrera 7 #63-10',
      city: 'Bogotá',
      state: 'Cundinamarca',
      postalCode: '110231',
      country: 'Colombia',
    },
    contactInfo: {
      phone: '+57 310 555 1234',
      email: 'chapinero@ejemplo.com',
    },
    capacity: {
      minGuests: 8,
      maxGuests: 60,
    },
    isActive: true,
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
  },
];

export default function AvailabilityPage() {
  const { sanityUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    if (!sanityUser?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Timeout de seguridad para evitar carga infinita
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 segundos
      });
      
      const dataPromise = getLocationsByCompany(sanityUser.companyId);
      
      const data = await Promise.race([dataPromise, timeoutPromise]) as Location[];
      setLocations(data || []);
      
      // Seleccionar la primera sede o la principal por defecto
      if (data && data.length > 0) {
        const mainLocation = data.find(loc => loc.isMain) || data[0];
        setSelectedLocation(mainLocation);
      } else {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      // Si es timeout o error real, usar fallback a datos mock
      setLocations(mockLocations);
      const mainLocation = mockLocations.find(loc => loc.isMain) || mockLocations[0];
      setSelectedLocation(mainLocation);
    } finally {
      setLoading(false);
    }
  }, [sanityUser]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando sedes..." />
      </ProtectedRoute>
    );
  }

  // Si no hay usuario, mostrar mensaje de carga o error
  if (!sanityUser) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando información del usuario..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
            Gestión de Disponibilidad
          </h1>
          <p className="text-gray-600">
            Configura los horarios de disponibilidad para cada una de tus sedes
          </p>
        </div>

        {!loading && locations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BiMap className="mx-auto text-6xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No tienes sedes registradas
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Para gestionar la disponibilidad, primero necesitas crear al menos una sede para tu empresa.
            </p>
            <div className="space-y-3">
              <Link
                href="/dashboard/locations"
                className="inline-flex items-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
              >
                <BiBuilding className="mr-2 text-xl" />
                Ir a Mis Sedes
              </Link>
              <div>
                <button
                  onClick={loadLocations}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Intentar cargar de nuevo
                </button>
              </div>
            </div>
          </div>
        ) : !loading && locations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Location Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow sticky top-4">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-[#334C5D] flex items-center">
                    <BiMap className="mr-2" />
                    Sedes
                  </h2>
                </div>
                <div className="p-2">
                  {locations.map((location) => (
                    <button
                      key={location._id}
                      onClick={() => setSelectedLocation(location)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-1 ${
                        selectedLocation?._id === location._id
                          ? 'bg-[#F26726] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{location.name}</div>
                      <div className={`text-xs mt-1 ${
                        selectedLocation?._id === location._id
                          ? 'text-white/80'
                          : 'text-gray-500'
                      }`}>
                        {location.address.city}
                        {location.isMain && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            Principal
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content - Availability Manager */}
            <div className="lg:col-span-3">
              {selectedLocation ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-[#334C5D] mb-1">
                      {selectedLocation.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedLocation.address.street}, {selectedLocation.address.city}
                      {selectedLocation.address.state && `, ${selectedLocation.address.state}`}
                    </p>
                  </div>
                  
                  <AvailabilityManager
                    location={selectedLocation}
                    companyId={sanityUser?.companyId || 'mock-company-id'}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <BiMap className="mx-auto text-6xl text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Selecciona una sede
                  </h3>
                  <p className="text-gray-600">
                    Elige una sede del panel izquierdo para gestionar su disponibilidad
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

