"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select } from 'flowbite-react';
import { HiArrowLeft, HiSearch, HiCheckCircle } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { searchExperiencesForQuote } from '@/lib/sanity/quoteService';
import { Experience } from '@/types';
import Loader from '@/components/Loader';

interface SearchFormData {
  date: string;
  time: string;
  guests: number;
  location?: string;
}

export default function CotizacionesPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Experience[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [formData, setFormData] = useState<SearchFormData>({
    date: '',
    time: '',
    guests: 1,
    location: '',
  });

  const handleInputChange = (field: keyof SearchFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !sanityUser?.companyId) {
      alert('Debes tener una empresa configurada para buscar experiencias');
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      // Buscar experiencias disponibles
      const results = await searchExperiencesForQuote({
        companyId: sanityUser.companyId,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        location: formData.location,
      });

      setSearchResults(results);
      setHasSearched(true);
      setSelectedExperiences([]);
    } catch (error) {
      console.error('Error searching experiences:', error);
      alert('Error al buscar experiencias disponibles');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleSelection = (experienceId: string) => {
    setSelectedExperiences(prev => {
      if (prev.includes(experienceId)) {
        return prev.filter(id => id !== experienceId);
      } else {
        // Máximo 3 experiencias
        if (prev.length >= 3) {
          alert('Puedes seleccionar máximo 3 experiencias');
          return prev;
        }
        return [...prev, experienceId];
      }
    });
  };

  const handleGenerateQuote = () => {
    if (selectedExperiences.length === 0) {
      alert('Debes seleccionar al menos una experiencia');
      return;
    }

    // Navegar a la página de generación de cotización
    const selectedData = searchResults.filter(exp => selectedExperiences.includes(exp._id));
    
    // Guardar datos en sessionStorage
    sessionStorage.setItem('quoteData', JSON.stringify({
      searchParams: formData,
      selectedExperiences: selectedData,
    }));

    router.push('/dashboard/crm/cotizaciones/generar');
  };

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm')}
              className="mr-4"
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Generar Cotización
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Busca experiencias disponibles y genera cotizaciones personalizadas
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Búsqueda */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Datos del Evento
          </h2>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="date">Fecha del Evento *</Label>
                <TextInput
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="time">Hora del Evento *</Label>
                <TextInput
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guests">Cantidad de Personas *</Label>
                <TextInput
                  id="guests"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.guests}
                  onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Ubicación (Opcional)</Label>
                <TextInput
                  id="location"
                  type="text"
                  placeholder="Ej: Bogotá"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              color="primary"
              disabled={isSearching}
              className="w-full md:w-auto"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <HiSearch className="w-4 h-4 mr-2" />
                  Buscar Experiencias
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Resultados de Búsqueda */}
        {isSearching && <Loader message="Buscando experiencias disponibles..." />}

        {hasSearched && !isSearching && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Resultados ({searchResults.length})
              </h2>
              {selectedExperiences.length > 0 && (
                <Button
                  color="primary"
                  onClick={handleGenerateQuote}
                >
                  <HiCheckCircle className="w-4 h-4 mr-2" />
                  Generar Cotización ({selectedExperiences.length})
                </Button>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No se encontraron experiencias disponibles con los criterios especificados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selecciona hasta 3 experiencias para incluir en la cotización
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((experience) => (
                    <div
                      key={experience._id}
                      onClick={() => handleToggleSelection(experience._id)}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all
                        ${selectedExperiences.includes(experience._id)
                          ? 'border-[#F26726] bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      {selectedExperiences.includes(experience._id) && (
                        <div className="flex justify-end mb-2">
                          <HiCheckCircle className="w-6 h-6 text-[#F26726]" />
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {experience.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {experience.description}
                      </p>
                      
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Capacidad:</span> {experience.minCapacity || 1} - {experience.capacity} personas
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Duración:</span> {experience.duration} minutos
                        </p>
                        <p className="text-[#F26726] font-bold">
                          ${experience.basePrice.toLocaleString()} {experience.currency} / persona
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}



