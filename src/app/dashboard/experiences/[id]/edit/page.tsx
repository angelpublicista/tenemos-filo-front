"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getExperienceById, updateExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { 
  getAvailabilitySchedulesByLocation, 
  createAvailabilitySchedule,
  generateDefaultSchedule 
} from '@/lib/sanity/availabilityService';
import { UpdateExperienceData, Company, Location, AvailabilitySchedule, Experience } from '@/types';
import { Button, Label, TextInput, Select, Textarea, Checkbox } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiCheckCircle, 
  HiExclamationCircle,
  HiPlus,
  HiMinus
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter, useParams } from 'next/navigation';
import Loader from '@/components/Loader';
import { ImageUpload, GalleryUpload } from '@/components/ImageUpload';

// Esquema de validación
const experienceSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  categories: z.array(z.enum(['cooking', 'mixology', 'tasting', 'catering', 'corporate', 'celebrations', 'workshops', 'other'])).min(1, 'Selecciona al menos una categoría'),
  duration: z.number().min(30, 'La duración mínima es 30 minutos').max(480, 'La duración máxima es 480 minutos'),
  capacity: z.number().min(1, 'La capacidad debe ser al menos 1').max(100, 'La capacidad máxima es 100'),
  minCapacity: z.number().min(1).optional(),
  basePrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  currency: z.enum(['COP', 'USD']),
  experienceType: z.enum(['virtual', 'presential', 'hybrid']),
  virtualPlatform: z.enum(['zoom', 'google_meet', 'teams', 'other']).optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['draft', 'pending', 'active', 'paused', 'inactive']),
  isFeatured: z.boolean(),
});

type ExperienceFormData = z.infer<typeof experienceSchema>;

export default function EditExperiencePage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const experienceId = params.id as string;
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [includes, setIncludes] = useState<string[]>(['']);
  const [addons, setAddons] = useState<Array<{name: string, price: number, priceType: 'per_person' | 'total', description: string}>>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [availableSchedules, setAvailableSchedules] = useState<AvailabilitySchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const [customScheduleName, setCustomScheduleName] = useState('');
  const [customMinimumNotice, setCustomMinimumNotice] = useState(24);
  const [featuredImageAssetId, setFeaturedImageAssetId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ assetId: string; alt?: string; caption?: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<ExperienceFormData>({
    mode: 'onChange',
  });

  const experienceType = watch('experienceType');
  const minCapacity = watch('minCapacity');
  const capacity = watch('capacity');
  const basePrice = watch('basePrice');
  const currency = watch('currency');

  // Formatear precio en moneda
  const formatCurrency = (value: number, curr: string = 'COP') => {
    if (!value || isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Cargar datos de la experiencia y empresa
  useEffect(() => {
    const loadData = async () => {
      if (!user || !experienceId) {
        setIsLoadingData(false);
        return;
      }

      try {
        // Cargar empresa
        const companyData = await getCompanyByUserId(user.uid);
        if (!companyData) {
          setCompanyNotFound(true);
          showError('No se encontró información de empresa.');
          router.push('/dashboard/company-setup');
          return;
        }
        setCompany(companyData);

        // Cargar experiencia
        const experienceData = await getExperienceById(experienceId);
        if (!experienceData) {
          showError('No se encontró la experiencia');
          router.push('/dashboard/experiences');
          return;
        }
        setExperience(experienceData);

        // Prellenar formulario
        reset({
          title: experienceData.title,
          description: experienceData.description,
          categories: experienceData.categories || [],
          duration: experienceData.duration,
          capacity: experienceData.capacity,
          minCapacity: experienceData.minCapacity,
          basePrice: experienceData.basePrice,
          currency: experienceData.currency,
          experienceType: experienceData.experienceType,
          virtualPlatform: experienceData.virtualPlatform,
          location: experienceData.presentialLocation || '',
          address: experienceData.presentialAddress || '',
          city: experienceData.presentialCity || '',
          status: experienceData.status,
          isFeatured: experienceData.isFeatured,
        });

        // Cargar listas
        setRequirements(experienceData.requirements && experienceData.requirements.length > 0 ? experienceData.requirements : ['']);
        setIncludes(experienceData.includes && experienceData.includes.length > 0 ? experienceData.includes : ['']);
        
        // Cargar addons con compatibilidad hacia atrás (si no tienen priceType, usar 'per_person' por defecto)
        const loadedAddons = (experienceData.addons || []).map(addon => ({
          name: addon.name,
          price: addon.price,
          priceType: (addon.priceType || 'per_person') as 'per_person' | 'total',
          description: addon.description || ''
        }));
        setAddons(loadedAddons);
        
        // Cargar categorías seleccionadas
        setSelectedCategories(experienceData.categories || []);

        // Cargar imágenes
        console.log('🖼️ Datos de imágenes:', {
          featuredImage: experienceData.featuredImage,
          gallery: experienceData.gallery,
        });
        
        if (experienceData.featuredImage) {
          setFeaturedImageAssetId(experienceData.featuredImage);
        }
        if (experienceData.gallery && experienceData.gallery.length > 0) {
          setGalleryImages(experienceData.gallery);
        }

        // Cargar sedes
        if (companyData._id) {
          const locationsData = await getLocationsByCompany(companyData._id);
          setLocations(locationsData || []);
          
          // Seleccionar sede actual si existe
          if (experienceData.location) {
            setSelectedLocation(experienceData.location);
          }
        }

        // Seleccionar calendario actual si existe
        if (experienceData.availabilitySchedule) {
          setSelectedSchedule(experienceData.availabilitySchedule);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar los datos');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user, experienceId, router, showError, reset]);

  // Cargar calendarios cuando se selecciona una sede
  useEffect(() => {
    const loadSchedules = async () => {
      if (!selectedLocation) {
        setAvailableSchedules([]);
        return;
      }

      try {
        const schedules = await getAvailabilitySchedulesByLocation(selectedLocation);
        setAvailableSchedules(schedules || []);
        
        if (!schedules || schedules.length === 0) {
          setShowCustomSchedule(true);
        }
      } catch (error) {
        console.error('Error loading schedules:', error);
        setAvailableSchedules([]);
      }
    };

    loadSchedules();
  }, [selectedLocation]);

  // Validar capacidad mínima
  useEffect(() => {
    if (minCapacity && capacity && minCapacity > capacity) {
      setValue('minCapacity', capacity);
    }
  }, [capacity, minCapacity, setValue]);

  // Manejar selección de categorías
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Manejar agregar/quitar elementos de listas
  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const addInclude = () => {
    setIncludes([...includes, '']);
  };

  const removeInclude = (index: number) => {
    setIncludes(includes.filter((_, i) => i !== index));
  };

  const updateInclude = (index: number, value: string) => {
    const newIncludes = [...includes];
    newIncludes[index] = value;
    setIncludes(newIncludes);
  };

  const addAddon = () => {
    setAddons([...addons, { name: '', price: 0, priceType: 'per_person', description: '' }]);
  };

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const updateAddon = (index: number, field: string, value: string | number) => {
    const newAddons = [...addons];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setAddons(newAddons);
  };

  // Enviar formulario
  const onSubmit = async (data: ExperienceFormData) => {
    if (!company || !experience) {
      showError('Faltan datos necesarios para actualizar la experiencia');
      return;
    }

    // Validar que se haya seleccionado al menos una categoría
    if (selectedCategories.length === 0) {
      showError('Por favor selecciona al menos una categoría');
      return;
    }

    // Validar que se haya subido la imagen destacada
    if (!featuredImageAssetId) {
      showError('Por favor sube una imagen destacada/portada para la experiencia');
      return;
    }

    // Validar que se haya seleccionado una sede para experiencias presenciales/híbridas
    if ((data.experienceType === 'presential' || data.experienceType === 'hybrid') && !selectedLocation) {
      showError('Por favor selecciona una sede');
      return;
    }

    try {
      setIsLoading(true);

      let finalScheduleId = selectedSchedule && selectedSchedule !== 'custom' ? selectedSchedule : undefined;

      // Si necesita crear un calendario personalizado
      if ((selectedSchedule === 'custom' || showCustomSchedule) && selectedLocation && !finalScheduleId) {
        try {
          const scheduleName = customScheduleName || `Calendario - ${data.title}`;
          const newSchedule = await createAvailabilitySchedule({
            name: scheduleName,
            location: selectedLocation,
            description: `Calendario personalizado para la experiencia: ${data.title}`,
            weeklySchedule: generateDefaultSchedule(),
            blockedDates: [],
            notes: 'Calendario generado automáticamente. Personaliza los horarios según tus necesidades.',
            bufferTime: 0,
            minimumNotice: customMinimumNotice,
          });
          finalScheduleId = newSchedule._id;
        } catch (error) {
          console.error('Error creating custom schedule:', error);
          showError('Error al crear el calendario personalizado.');
        }
      }

      // Preparar datos de actualización
      const updateData: UpdateExperienceData = {
        _id: experience._id,
        title: data.title,
        description: data.description,
        categories: selectedCategories as ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[],
        duration: data.duration,
        capacity: data.capacity,
        minCapacity: data.minCapacity,
        basePrice: data.basePrice,
        currency: data.currency,
        experienceType: data.experienceType,
        virtualPlatform: data.virtualPlatform,
        presentialLocation: data.location,
        presentialAddress: data.address,
        presentialCity: data.city,
        status: data.status,
        isFeatured: data.isFeatured,
        requirements: requirements.filter(req => req && req.trim() !== ''),
        includes: includes.filter(inc => inc && inc.trim() !== ''),
        addons: addons.filter(addon => addon && addon.name && addon.name.trim() !== ''),
        location: selectedLocation || undefined,
        availabilitySchedule: finalScheduleId,
        featuredImage: featuredImageAssetId || undefined,
        gallery: galleryImages.length > 0 ? galleryImages : undefined,
      };

      await updateExperienceInSanity(updateData);
      
      showSuccess('Experiencia actualizada exitosamente');
      router.push('/dashboard/experiences');
    } catch (error) {
      console.error('Error updating experience:', error);
      showError('Error al actualizar la experiencia');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return <Loader message="Cargando datos de la experiencia..." />;
  }

  if (companyNotFound || !experience) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
            Error al cargar la experiencia
          </h2>
          <p className="text-gray-600 mb-6">
            No se pudo cargar la información de la experiencia.
          </p>
          <Button
            color="primary"
            onClick={() => router.push('/dashboard/experiences')}
            className="px-6 py-3"
          >
            Volver a Mis Experiencias
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <Button
            color="gray"
            onClick={() => router.back()}
            className="mr-4"
          >
            <HiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#334C5D]">
              Editar Experiencia
            </h1>
            <p className="text-gray-600">
              Actualiza la información de tu experiencia gastronómica
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Información Básica */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Información Básica
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <Label htmlFor="title">Título de la Experiencia *</Label>
              <TextInput
                {...register('title')}
                placeholder="Ej: Clase de Cocina Italiana"
                className="mt-1"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="lg:col-span-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                {...register('description')}
                placeholder="Describe detalladamente tu experiencia..."
                rows={4}
                className="mt-1"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="lg:col-span-2">
              <Label>Categorías *</Label>
              <p className="text-sm text-gray-500 mb-3">Selecciona una o más categorías para tu experiencia</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'cooking', label: 'Cocina' },
                  { value: 'mixology', label: 'Mixología' },
                  { value: 'tasting', label: 'Degustación' },
                  { value: 'catering', label: 'Catering' },
                  { value: 'corporate', label: 'Eventos Corporativos' },
                  { value: 'celebrations', label: 'Celebraciones' },
                  { value: 'workshops', label: 'Talleres' },
                  { value: 'other', label: 'Otro' },
                ].map((cat) => (
                  <div key={cat.value} className="flex items-center">
                    <Checkbox
                      id={`category-${cat.value}`}
                      checked={selectedCategories.includes(cat.value)}
                      onChange={() => handleCategoryChange(cat.value)}
                      className="mr-2"
                    />
                    <Label htmlFor={`category-${cat.value}`} className="cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Selecciona al menos una categoría</p>
              )}
            </div>

            <div>
              <Label htmlFor="duration">Duración (minutos) *</Label>
              <TextInput
                {...register('duration', { valueAsNumber: true })}
                type="number"
                min="30"
                max="480"
                className="mt-1"
              />
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Imágenes
          </h2>
          
          <div className="space-y-6">
            <ImageUpload
              label="Imagen Destacada/Portada"
              value={featuredImageAssetId || undefined}
              onChange={(assetId) => setFeaturedImageAssetId(assetId)}
              required
              helpText="Esta imagen se mostrará como portada de la experiencia en el marketplace"
            />

            <GalleryUpload
              label="Galería de Imágenes"
              values={galleryImages}
              onChange={setGalleryImages}
              maxImages={15}
              helpText="Agrega hasta 15 imágenes adicionales para mostrar tu experiencia (opcional)"
            />
          </div>
        </div>

        {/* Capacidad y Precios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Capacidad y Precios
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="capacity">Capacidad Máxima *</Label>
              <TextInput
                {...register('capacity', { valueAsNumber: true })}
                type="number"
                min="1"
                max="100"
                className="mt-1"
              />
              {errors.capacity && (
                <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="minCapacity">Capacidad Mínima</Label>
              <TextInput
                {...register('minCapacity', { valueAsNumber: true })}
                type="number"
                min="1"
                max={capacity || 100}
                className="mt-1"
              />
              {errors.minCapacity && (
                <p className="text-red-500 text-sm mt-1">{errors.minCapacity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="basePrice">Precio Base por Persona *</Label>
              <TextInput
                {...register('basePrice', { valueAsNumber: true })}
                type="number"
                min="0"
                step="1000"
                className="mt-1"
                placeholder="0"
              />
              {basePrice > 0 && (
                <p className="text-[#F26726] text-sm mt-1 font-semibold">
                  {formatCurrency(basePrice, currency)}
                </p>
              )}
              {errors.basePrice && (
                <p className="text-red-500 text-sm mt-1">{errors.basePrice.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="currency">Moneda *</Label>
              <Select {...register('currency')} className="mt-1">
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="USD">Dólar Americano (USD)</option>
              </Select>
              {errors.currency && (
                <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tipo de Experiencia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Tipo de Experiencia
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="experienceType">Tipo de Experiencia *</Label>
              <Select {...register('experienceType')} className="mt-1">
                <option value="presential">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Híbrida (Presencial + Virtual)</option>
              </Select>
              {errors.experienceType && (
                <p className="text-red-500 text-sm mt-1">{errors.experienceType.message}</p>
              )}
            </div>

            {(experienceType === 'virtual' || experienceType === 'hybrid') && (
              <div>
                <Label htmlFor="virtualPlatform">Plataforma Virtual</Label>
                <Select {...register('virtualPlatform')} className="mt-1">
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="other">Otra</option>
                </Select>
              </div>
            )}

            {(experienceType === 'presential' || experienceType === 'hybrid') && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sede">Sede *</Label>
                  <Select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Selecciona una sede</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                        {loc.isMain && ' (Principal)'}
                      </option>
                    ))}
                  </Select>
                  {locations.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      No tienes sedes registradas. 
                      <a href="/dashboard/locations" className="text-[#F26726] hover:underline ml-1">
                        Crear una sede
                      </a>
                    </p>
                  )}
                </div>

                {selectedLocation && (
                  <div>
                    <Label htmlFor="calendario">Calendario de Disponibilidad</Label>
                    {availableSchedules.length > 0 ? (
                      <div className="space-y-2">
                        <Select
                          value={selectedSchedule}
                          onChange={(e) => setSelectedSchedule(e.target.value)}
                          className="mt-1"
                        >
                          <option value="">Selecciona un calendario</option>
                          {availableSchedules.map((schedule) => (
                            <option key={schedule._id} value={schedule._id}>
                              {schedule.name}
                              {schedule.isMain && ' (Principal)'}
                              {!schedule.isActive && ' (Inactivo)'}
                            </option>
                          ))}
                          <option value="custom">Crear calendario personalizado</option>
                        </Select>
                      </div>
                    ) : (
                      <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 mb-2">
                          Esta sede no tiene calendarios de disponibilidad configurados.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCustomSchedule(!showCustomSchedule)}
                          className="text-sm text-[#F26726] hover:underline font-medium"
                        >
                          {showCustomSchedule ? 'Ocultar' : 'Configurar'} disponibilidad personalizada
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Disponibilidad Personalizada */}
        {(selectedSchedule === 'custom' || (showCustomSchedule && selectedLocation)) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
              Configurar Disponibilidad Personalizada
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Se creará un calendario de disponibilidad específico para esta experiencia. 
                Puedes configurar los horarios detallados después de actualizar la experiencia desde la sección de Disponibilidad.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Calendario</Label>
                <TextInput
                  placeholder="Ej: Calendario de Clases de Cocina"
                  value={customScheduleName || `Calendario - ${watch('title') || 'Experiencia'}`}
                  onChange={(e) => setCustomScheduleName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Aviso Mínimo (horas)</Label>
                <TextInput
                  type="number"
                  placeholder="24"
                  value={customMinimumNotice}
                  onChange={(e) => setCustomMinimumNotice(parseInt(e.target.value) || 24)}
                  min="1"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Anticipación mínima para reservas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Requisitos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100">
              Requisitos
            </h2>
            <Button
              type="button"
              color="gray"
              size="sm"
              onClick={addRequirement}
            >
              <HiPlus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
          
          <div className="space-y-3">
            {requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-3">
                <TextInput
                  value={requirement}
                  onChange={(e) => updateRequirement(index, e.target.value)}
                  placeholder="Ej: Conocimientos básicos de cocina"
                  className="flex-1"
                />
                  <Button
                    type="button"
                    color="red"
                    size="sm"
                    onClick={() => removeRequirement(index)}
                    disabled={requirements.length === 1}
                  >
                    <HiMinus className="w-4 h-4" />
                  </Button>
                </div>
            ))}
          </div>
        </div>

        {/* Incluye */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100">
              Incluye
            </h2>
            <Button
              type="button"
              color="gray"
              size="sm"
              onClick={addInclude}
            >
              <HiPlus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
          
          <div className="space-y-3">
            {includes.map((include, index) => (
              <div key={index} className="flex items-center gap-3">
                <TextInput
                  value={include}
                  onChange={(e) => updateInclude(index, e.target.value)}
                  placeholder="Ej: Ingredientes frescos, recetario, certificado"
                  className="flex-1"
                />
                  <Button
                    type="button"
                    color="red"
                    size="sm"
                    onClick={() => removeInclude(index)}
                    disabled={includes.length === 1}
                  >
                    <HiMinus className="w-4 h-4" />
                  </Button>
                </div>
            ))}
          </div>
        </div>

        {/* Addons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100">
              Servicios Adicionales
            </h2>
            <Button
              type="button"
              color="gray"
              size="sm"
              onClick={addAddon}
            >
              <HiPlus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
          
          <div className="space-y-4">
            {addons.map((addon, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Servicio {index + 1}</h3>
                  <Button
                    type="button"
                    color="red"
                    size="sm"
                    onClick={() => removeAddon(index)}
                  >
                    <HiMinus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <TextInput
                    value={addon.name}
                    onChange={(e) => updateAddon(index, 'name', e.target.value)}
                    placeholder="Nombre del servicio"
                  />
                  <div>
                    <TextInput
                      type="number"
                      value={addon.price}
                      onChange={(e) => updateAddon(index, 'price', Number(e.target.value))}
                      placeholder="Precio"
                    />
                    {addon.price > 0 && (
                      <p className="text-[#F26726] text-xs mt-1 font-semibold">
                        {formatCurrency(addon.price, currency)} {addon.priceType === 'per_person' ? 'por persona' : 'total'}
                      </p>
                    )}
                  </div>
                  <Select
                    value={addon.priceType}
                    onChange={(e) => updateAddon(index, 'priceType', e.target.value)}
                  >
                    <option value="per_person">Por Persona</option>
                    <option value="total">Precio Total</option>
                  </Select>
                  <TextInput
                    value={addon.description}
                    onChange={(e) => updateAddon(index, 'description', e.target.value)}
                    placeholder="Descripción"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Configuración
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Estado *</Label>
              <Select {...register('status')} className="mt-1">
                <option value="draft">Borrador</option>
                <option value="pending">Pendiente de Aprobación</option>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
                <option value="inactive">Inactiva</option>
              </Select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <Checkbox
                {...register('isFeatured')}
                className="mr-3"
              />
              <Label htmlFor="isFeatured">Experiencia Destacada</Label>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            color="gray"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={isLoading}
            className="px-8 py-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Actualizando...
              </>
            ) : (
              <>
                <HiCheckCircle className="w-4 h-4 mr-2" />
                Actualizar Experiencia
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

