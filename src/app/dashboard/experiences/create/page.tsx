"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import { createExperienceInSanity, updateExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { 
  getAvailabilitySchedulesByLocation, 
  createAvailabilitySchedule,
  generateDefaultSchedule 
} from '@/lib/sanity/availabilityService';
import { CreateExperienceData, Company, Location, AvailabilitySchedule } from '@/types';
import LocationModal from '@/components/LocationModal';
import { Button, Label, TextInput, Select, Textarea, Checkbox } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiCheckCircle, 
  HiExclamationCircle,
  HiPlus,
  HiMinus
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
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

export default function CreateExperiencePage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [includes, setIncludes] = useState<string[]>(['']);
  const [addons, setAddons] = useState<Array<{name: string, price: number, priceType: 'per_person' | 'total', description: string}>>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState<AvailabilitySchedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const [customScheduleName, setCustomScheduleName] = useState('');
  const [customMinimumNotice, setCustomMinimumNotice] = useState(24);
  const [availabilityMode, setAvailabilityMode] = useState<'location' | 'experience'>('location');
  const [featuredImageAssetId, setFeaturedImageAssetId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ assetId: string; alt?: string; caption?: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ExperienceFormData>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      categories: [],
      duration: 60,
      capacity: 10,
      minCapacity: 1,
      basePrice: 0,
      currency: 'COP',
      experienceType: 'presential',
      virtualPlatform: 'zoom',
      location: '',
      address: '',
      city: '',
      status: 'draft',
      isFeatured: false,
    }
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

  // Cargar datos de la empresa
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        const companyData = await getCompanyByUserId(user.uid);
        if (!companyData) {
          setCompanyNotFound(true);
          showError('No se encontró información de empresa. Completa el registro de empresa primero.');
          router.push('/company-setup');
          return;
        }
        setCompany(companyData);
        setCompanyNotFound(false);
        
        // Cargar sedes de la empresa
        if (companyData._id) {
          const locationsData = await getLocationsByCompany(companyData._id);
          setLocations(locationsData || []);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
        setCompanyNotFound(true);
        showError('Error al cargar la información de la empresa');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCompanyData();
  }, [user, router, showError]);

  // Cargar calendarios de todas las sedes seleccionadas
  useEffect(() => {
    const loadSchedules = async () => {
      if (selectedLocations.length === 0) {
        setAvailableSchedules([]);
        setSelectedSchedules([]);
        setShowCustomSchedule(false);
        return;
      }

      try {
        // Cargar calendarios de todas las sedes seleccionadas
        const allSchedules: AvailabilitySchedule[] = [];
        
        for (const locationId of selectedLocations) {
          const schedules = await getAvailabilitySchedulesByLocation(locationId);
          if (schedules && schedules.length > 0) {
            allSchedules.push(...schedules);
          }
        }
        
        setAvailableSchedules(allSchedules);
        
        // Filtrar calendarios seleccionados que ya no están disponibles
        setSelectedSchedules(prev => 
          prev.filter(scheduleId => allSchedules.some(s => s._id === scheduleId))
        );
        
        // Si no hay calendarios, mostrar opción de crear uno personalizado
        if (allSchedules.length === 0) {
          setShowCustomSchedule(true);
        } else {
          setShowCustomSchedule(false);
        }
      } catch (error) {
        console.error('Error loading schedules:', error);
        setAvailableSchedules([]);
        setShowCustomSchedule(true);
      }
    };

    loadSchedules();
  }, [selectedLocations]);

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
    if (!company) {
      showError('No se encontró información de empresa');
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

    // Validar que se haya seleccionado al menos una sede para experiencias presenciales/híbridas
    if ((data.experienceType === 'presential' || data.experienceType === 'hybrid') && selectedLocations.length === 0) {
      showError('Por favor selecciona al menos una sede');
      return;
    }

    // Validar que se haya seleccionado al menos un calendario o configurado uno personalizado
    if (selectedLocations.length > 0 && selectedSchedules.length === 0 && !showCustomSchedule) {
      showError('Por favor selecciona al menos un calendario o configura uno personalizado');
      return;
    }

    try {
      setIsLoading(true);

      // Calendarios a vincular (modo sede: se crean antes de la experiencia)
      let finalScheduleIds: string[] = [...selectedSchedules];

      // Modo sede: crear calendarios personalizados vinculados a la sede
      if (availabilityMode === 'location' && showCustomSchedule && selectedLocations.length > 0 && finalScheduleIds.length === 0) {
        try {
          const scheduleName = customScheduleName || `Calendario - ${data.title}`;
          for (const locationId of selectedLocations) {
            const newSchedule = await createAvailabilitySchedule({
              name: `${scheduleName} - ${locations.find(l => l._id === locationId)?.name || 'Sede'}`,
              location: locationId,
              description: `Calendario personalizado para la experiencia: ${data.title}`,
              weeklySchedule: generateDefaultSchedule(),
              blockedDates: [],
              notes: 'Calendario generado automáticamente. Personaliza los horarios según tus necesidades.',
              bufferTime: 0,
              minimumNotice: customMinimumNotice,
            });
            finalScheduleIds.push(newSchedule._id);
          }
        } catch (error) {
          console.error('Error creating location schedules:', error);
          showError('Error al crear los calendarios. La experiencia se creará sin calendarios asociados.');
        }
      }

      const experienceData: CreateExperienceData = {
        ...data,
        categories: selectedCategories as ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[],
        company: company._id,
        requirements: requirements.filter(req => req.trim() !== ''),
        includes: includes.filter(inc => inc.trim() !== ''),
        addons: addons.filter(addon => addon.name.trim() !== ''),
        locations: selectedLocations.length > 0 ? selectedLocations : undefined,
        availabilities: finalScheduleIds.length > 0 ? finalScheduleIds : undefined,
        presentialLocation: data.location,
        presentialAddress: data.address,
        presentialCity: data.city,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        featuredImage: featuredImageAssetId || undefined,
        gallery: galleryImages.length > 0 ? galleryImages : undefined,
      };

      const newExperience = await createExperienceInSanity(experienceData);

      // Modo experiencia: crear calendario vinculado a la experiencia recién creada
      if (availabilityMode === 'experience' && newExperience?._id) {
        try {
          const scheduleName = customScheduleName || `Calendario - ${data.title}`;
          const newSchedule = await createAvailabilitySchedule({
            name: scheduleName,
            experience: newExperience._id,
            description: `Disponibilidad propia de la experiencia: ${data.title}`,
            weeklySchedule: generateDefaultSchedule(),
            blockedDates: [],
            notes: 'Calendario generado automáticamente. Personaliza los horarios en la sección de Disponibilidad.',
            bufferTime: 0,
            minimumNotice: customMinimumNotice,
          });
          await updateExperienceInSanity({
            _id: newExperience._id,
            availabilities: [newSchedule._id],
          });
        } catch (error) {
          console.error('Error creating experience schedule:', error);
          // No bloqueamos: la experiencia ya fue creada
        }
      }

      showSuccess('Experiencia creada exitosamente');
      router.push('/dashboard/experiences');
    } catch (error) {
      console.error('Error creating experience:', error);
      showError('Error al crear la experiencia');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return <Loader message="Cargando información de la empresa..." />;
  }

  if (companyNotFound) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
            Empresa no encontrada
          </h2>
          <p className="text-gray-600 mb-6">
            Necesitas completar el registro de tu empresa antes de crear experiencias.
          </p>
          <Button
            color="primary"
            onClick={() => router.push('/company-setup')}
            className="px-6 py-3"
          >
            Completar Registro de Empresa
          </Button>
        </div>
      </div>
    );
  }

  if (!company) {
    return <Loader message="Cargando información de la empresa..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <Button
            color="gray"
            onClick={() => router.back()}
            size="sm"
            className="shrink-0 mt-0.5"
          >
            <HiArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Volver</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#334C5D]">
              Crear Nueva Experiencia
            </h1>
            <p className="text-sm text-gray-600">
              Completa la información para crear tu experiencia gastronómica
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

          {/* Fecha y hora (opcionales) */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1">Fecha y hora fijas <span className="text-gray-400 font-normal">(opcional)</span></p>
            <p className="text-xs text-gray-500 mb-4">Útil para experiencias con fecha o turno específico. Déjalo vacío si la disponibilidad la controla el calendario.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <TextInput
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha de fin</Label>
                <TextInput
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startTime">Hora de inicio</Label>
                <select
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#F26726] focus:ring-[#F26726]"
                >
                  <option value="">-- Sin hora --</option>
                  {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
                    '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
                    '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
                    '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30',
                    '22:00','22:30','23:00','23:30'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="endTime">Hora de fin</Label>
                <select
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#F26726] focus:ring-[#F26726]"
                >
                  <option value="">-- Sin hora --</option>
                  {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
                    '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
                    '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
                    '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30',
                    '22:00','22:30','23:00','23:30'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
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
                  <Label>Sedes * (Selecciona una o más)</Label>
                  <div className="mt-2 space-y-2 border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <div key={loc._id} className="flex items-center">
                          <Checkbox
                            id={`location-${loc._id}`}
                            checked={selectedLocations.includes(loc._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocations(prev => [...prev, loc._id]);
                              } else {
                                setSelectedLocations(prev => prev.filter(id => id !== loc._id));
                              }
                            }}
                            className="text-[#F26726] focus:ring-[#F26726]"
                          />
                          <Label htmlFor={`location-${loc._id}`} className="ml-2 cursor-pointer">
                            {loc.name}
                            {loc.isMain && ' (Principal)'}
                            <span className="text-gray-500 text-sm ml-2">
                              - {loc.address.city}
                            </span>
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No tienes sedes registradas.{' '}
                        <button
                          type="button"
                          onClick={() => setShowLocationModal(true)}
                          className="text-[#F26726] hover:underline font-medium"
                        >
                          Crear una sede
                        </button>
                      </p>
                    )}
                  </div>
                  {selectedLocations.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedLocations.length} sede{selectedLocations.length > 1 ? 's' : ''} seleccionada{selectedLocations.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {selectedLocations.length > 0 && (
                  <div className="space-y-4">
                    {/* Selector de modo de disponibilidad */}
                    <div>
                      <Label>Disponibilidad *</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        ¿Cómo quieres definir los horarios de esta experiencia?
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => { setAvailabilityMode('location'); setShowCustomSchedule(false); }}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                            availabilityMode === 'location'
                              ? 'border-[#F26726] bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            availabilityMode === 'location' ? 'border-[#F26726]' : 'border-gray-400'
                          }`}>
                            {availabilityMode === 'location' && (
                              <div className="w-2 h-2 rounded-full bg-[#F26726]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Usar calendario de sede</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Esta experiencia comparte la disponibilidad configurada en la sede
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAvailabilityMode('experience'); setSelectedSchedules([]); setShowCustomSchedule(true); }}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                            availabilityMode === 'experience'
                              ? 'border-[#F26726] bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            availabilityMode === 'experience' ? 'border-[#F26726]' : 'border-gray-400'
                          }`}>
                            {availabilityMode === 'experience' && (
                              <div className="w-2 h-2 rounded-full bg-[#F26726]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Disponibilidad propia</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Esta experiencia tiene sus propios horarios, independientes de la sede
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Modo sede: selector de calendarios */}
                    {availabilityMode === 'location' && (
                      <div>
                        {availableSchedules.length > 0 ? (
                          <div className="space-y-2">
                            <div className="space-y-2 border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                              {availableSchedules.map((schedule) => {
                                const locationName = locations.find(l => {
                                  const schedLocation = schedule.location as { _ref: string };
                                  return l._id === schedLocation?._ref;
                                })?.name || 'Sede';
                                return (
                                  <div key={schedule._id} className="flex items-center">
                                    <Checkbox
                                      id={`schedule-${schedule._id}`}
                                      checked={selectedSchedules.includes(schedule._id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedSchedules(prev => [...prev, schedule._id]);
                                        } else {
                                          setSelectedSchedules(prev => prev.filter(id => id !== schedule._id));
                                        }
                                      }}
                                      disabled={!schedule.isActive}
                                      className="text-[#F26726] focus:ring-[#F26726]"
                                    />
                                    <Label htmlFor={`schedule-${schedule._id}`} className="ml-2 cursor-pointer">
                                      {schedule.name}
                                      {schedule.isMain && ' (Principal)'}
                                      {!schedule.isActive && ' (Inactivo)'}
                                      <span className="text-gray-500 text-sm ml-2">- {locationName}</span>
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                            {selectedSchedules.length > 0 && (
                              <p className="text-sm text-gray-600">
                                {selectedSchedules.length} calendario{selectedSchedules.length > 1 ? 's' : ''} seleccionado{selectedSchedules.length > 1 ? 's' : ''}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowCustomSchedule(!showCustomSchedule)}
                              className="text-sm text-[#F26726] hover:underline font-medium"
                            >
                              {showCustomSchedule ? 'Ocultar' : 'Crear nuevo'} calendario para la sede
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                              Las sedes seleccionadas no tienen calendarios configurados.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowCustomSchedule(!showCustomSchedule)}
                              className="text-sm text-[#F26726] hover:underline font-medium"
                            >
                              {showCustomSchedule ? 'Ocultar' : 'Configurar'} calendario para la sede
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modo experiencia: mensaje informativo */}
                    {availabilityMode === 'experience' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Se creará un calendario de disponibilidad propio para esta experiencia con horario estándar (lun–vie 9:00–17:00).
                          Podrás personalizarlo desde <strong>Disponibilidad → Por Experiencia</strong> después de guardar.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Configuración básica del calendario (modo sede custom o modo experiencia) */}
        {(showCustomSchedule && selectedLocations.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-4">
              {availabilityMode === 'experience' ? 'Disponibilidad de la Experiencia' : 'Nuevo Calendario para la Sede'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Calendario</Label>
                <TextInput
                  placeholder="Ej: Calendario de Clases de Cocina"
                  value={customScheduleName || `Calendario - ${watch('title') || 'Nueva Experiencia'}`}
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
            <p className="text-sm text-gray-500 mt-4">
              Se creará con horario lun–vie 9:00–17:00 por defecto. Personalízalo desde <strong>Disponibilidad</strong> después de guardar.
            </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                Creando...
              </>
            ) : (
              <>
                <HiCheckCircle className="w-4 h-4 mr-2" />
                Crear Experiencia
              </>
            )}
          </Button>
        </div>
      </form>

      {showLocationModal && company && (
        <LocationModal
          location={null}
          companyId={company._id}
          existingLocations={locations}
          onClose={() => setShowLocationModal(false)}
          onSave={(updatedLocations) => {
            setLocations(updatedLocations);
            setShowLocationModal(false);
          }}
        />
      )}
    </div>
  );
}
