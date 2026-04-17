"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LocationManager from '@/components/LocationManager';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { Location } from '@/types';
import { BiMap, BiBuilding } from 'react-icons/bi';
import { HiExclamationCircle } from 'react-icons/hi';
import Loader from '@/components/Loader';
import { SkeletonCard } from '@/components/Skeleton';
import Link from 'next/link';

export default function LocationsPage() {
  const { sanityUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
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
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [sanityUser]);

  useEffect(() => {
    if (sanityUser?.companyId) {
      loadLocations();
    } else {
      setLoading(false);
    }
  }, [sanityUser?.companyId, loadLocations]);


  // Si no hay usuario, mostrar mensaje de carga o error
  if (!sanityUser) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando información del usuario..." />
      </ProtectedRoute>
    );
  }

  // Si no hay companyId en el usuario, mostrar mensaje
  if (!sanityUser.companyId) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
              Mis Sedes
            </h1>
            <p className="text-gray-600">
              Gestiona todas las sedes de tu empresa y su información
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-12 text-center">
            <HiExclamationCircle className="mx-auto text-6xl text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Completa la información de tu empresa
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Antes de crear sedes, necesitas completar la información de tu empresa.
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Link
                href="/dashboard/company"
                className="inline-flex items-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
              >
                <BiBuilding className="mr-2 text-xl" />
                Completar Información de Empresa
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }


  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-2">
            Mis Sedes
          </h1>
          <p className="text-gray-600">
            Gestiona todas las sedes de tu empresa y su información
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BiMap className="mx-auto text-6xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No tienes sedes registradas
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Crea tu primera sede para comenzar a gestionar tus ubicaciones y configurar disponibilidad.
            </p>
            <div className="space-y-3">
              <LocationManager
                locations={locations}
                onLocationsChange={setLocations}
                companyId={sanityUser.companyId!}
              />
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
        ) : locations.length > 0 ? (
          <LocationManager
            locations={locations}
            onLocationsChange={setLocations}
            companyId={sanityUser.companyId!}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
