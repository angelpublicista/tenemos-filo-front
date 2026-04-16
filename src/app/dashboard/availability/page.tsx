"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AvailabilityManager from '@/components/AvailabilityManager';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getExperiencesByCompany } from '@/lib/sanity/experienceService';
import { Location, Experience } from '@/types';
import { BiMap, BiBuilding } from 'react-icons/bi';
import { AiOutlineCalendar } from 'react-icons/ai';
import Link from 'next/link';
import Loader from '@/components/Loader';

type ViewMode = 'location' | 'experience';

export default function AvailabilityPage() {
  const { sanityUser } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('experience');

  // Location state
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Experience state
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [loadingExperiences, setLoadingExperiences] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    if (!sanityUser?.companyId) return;
    try {
      setLoadingLocations(true);
      const data = await getLocationsByCompany(sanityUser.companyId);
      setLocations(data || []);
      if (data && data.length > 0) {
        const main = data.find(l => l.isMain) || data[0];
        setSelectedLocation(main);
      }
    } catch {
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [sanityUser]);

  const loadExperiences = useCallback(async () => {
    if (!sanityUser?.companyId) return;
    try {
      setLoadingExperiences(true);
      const data = await getExperiencesByCompany(sanityUser.companyId);
      setExperiences(data || []);
      if (data && data.length > 0) {
        setSelectedExperience(data[0]);
      }
    } catch {
      setExperiences([]);
    } finally {
      setLoadingExperiences(false);
    }
  }, [sanityUser]);

  useEffect(() => {
    const init = async () => {
      if (!sanityUser?.companyId) {
        setInitialLoading(false);
        return;
      }
      await Promise.all([loadExperiences(), loadLocations()]);
      setInitialLoading(false);
    };
    init();
  }, [sanityUser, loadExperiences, loadLocations]);

  if (initialLoading || !sanityUser) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando disponibilidad..." />
      </ProtectedRoute>
    );
  }

  const isLoadingCurrent = viewMode === 'location' ? loadingLocations : loadingExperiences;

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-1 sm:mb-2">
            Gestión de Disponibilidad
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Configura los horarios de disponibilidad para tus experiencias o sedes
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 border-b border-gray-200">
          <button
            onClick={() => setViewMode('experience')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              viewMode === 'experience'
                ? 'border-[#F26726] text-[#F26726]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AiOutlineCalendar className="text-lg" />
            Por Experiencia
          </button>
          <button
            onClick={() => setViewMode('location')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              viewMode === 'location'
                ? 'border-[#F26726] text-[#F26726]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BiMap className="text-lg" />
            Por Sede
          </button>
        </div>

        {isLoadingCurrent ? (
          <Loader message={viewMode === 'experience' ? 'Cargando experiencias...' : 'Cargando sedes...'} />
        ) : viewMode === 'experience' ? (
          <ExperienceAvailabilityView
            experiences={experiences}
            selectedExperience={selectedExperience}
            onSelectExperience={setSelectedExperience}
            companyId={sanityUser.companyId || ''}
          />
        ) : (
          <LocationAvailabilityView
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            onReload={loadLocations}
            companyId={sanityUser.companyId || ''}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// --- Experience View ---

interface ExperienceAvailabilityViewProps {
  experiences: Experience[];
  selectedExperience: Experience | null;
  onSelectExperience: (e: Experience) => void;
  companyId: string;
}

function ExperienceAvailabilityView({
  experiences,
  selectedExperience,
  onSelectExperience,
  companyId,
}: ExperienceAvailabilityViewProps) {
  if (experiences.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center">
        <AiOutlineCalendar className="mx-auto text-5xl sm:text-6xl text-gray-300 mb-4" />
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          No tienes experiencias registradas
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
          Para gestionar la disponibilidad por experiencia, primero necesitas crear al menos una experiencia.
        </p>
        <Link
          href="/dashboard/experiences/create"
          className="inline-flex items-center px-6 py-3 bg-[#F26726] text-white rounded-lg hover:bg-[#d9571f] transition-colors"
        >
          <AiOutlineCalendar className="mr-2 text-xl" />
          Crear Experiencia
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Sidebar - Experience Selector */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow lg:sticky lg:top-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#334C5D] flex items-center">
              <AiOutlineCalendar className="mr-2" />
              Experiencias
            </h2>
          </div>
          <div className="p-2">
            {experiences.map((experience) => (
              <button
                key={experience._id}
                onClick={() => onSelectExperience(experience)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-1 ${
                  selectedExperience?._id === experience._id
                    ? 'bg-[#F26726] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-sm leading-tight">{experience.title}</div>
                <div className={`text-xs mt-1 ${
                  selectedExperience?._id === experience._id ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {experience.duration} min • {experience.capacity} personas
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {selectedExperience ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-[#334C5D] mb-1">
                {selectedExperience.title}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedExperience.duration} min · capacidad {selectedExperience.capacity} personas
              </p>
            </div>
            <AvailabilityManager
              mode="experience"
              experience={selectedExperience}
              companyId={companyId}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AiOutlineCalendar className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Selecciona una experiencia
            </h3>
            <p className="text-gray-600">
              Elige una experiencia del panel izquierdo para gestionar su disponibilidad
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Location View ---

interface LocationAvailabilityViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onSelectLocation: (l: Location) => void;
  onReload: () => void;
  companyId: string;
}

function LocationAvailabilityView({
  locations,
  selectedLocation,
  onSelectLocation,
  onReload,
  companyId,
}: LocationAvailabilityViewProps) {
  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center">
        <BiMap className="mx-auto text-5xl sm:text-6xl text-gray-300 mb-4" />
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          No tienes sedes registradas
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
          Para gestionar la disponibilidad por sede, primero necesitas crear al menos una sede.
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
              onClick={onReload}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Intentar cargar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Sidebar - Location Selector */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow lg:sticky lg:top-4">
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
                onClick={() => onSelectLocation(location)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-1 ${
                  selectedLocation?._id === location._id
                    ? 'bg-[#F26726] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{location.name}</div>
                <div className={`text-xs mt-1 ${
                  selectedLocation?._id === location._id ? 'text-white/80' : 'text-gray-500'
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

      {/* Main Content */}
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
              mode="location"
              location={selectedLocation}
              companyId={companyId}
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
  );
}
