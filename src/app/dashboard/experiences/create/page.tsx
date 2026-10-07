"use client";

import ProtectedRoute from '@/components/ProtectedRoute';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import { createExperienceInSanity, updateExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyById, getCompanyByUserId } from '@/lib/sanity/companyService';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getMenusByCompany } from '@/lib/sanity/menuService';
import { 
  createAvailabilitySchedule, vigenciaPorDefecto,
  generateDefaultSchedule 
} from '@/lib/sanity/availabilityService';
import { CreateExperienceData, Company, Location, Menu } from '@/types';
import LocationModal from '@/components/LocationModal';
import MenuSelector from '@/components/MenuSelector';
import DepartamentoCiudad from '@/components/DepartamentoCiudad';
import { Button, Label, TextInput, Select, Textarea, Checkbox } from 'flowbite-react';
import {
  HiArrowLeft,
  HiCheckCircle,
  HiExclamationCircle,
  HiPlus,
  HiMinus,
  HiSparkles,
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import { ImageUpload, GalleryUpload } from '@/components/ImageUpload';
import Link from 'next/link';
import PrecioInput from '@/components/PrecioInput';

// Esquema de validación
const experienceSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  categories: z.array(z.enum(['cooking', 'mixology', 'tasting', 'catering', 'corporate', 'celebrations', 'workshops', 'other'])).min(1, 'Selecciona al menos una categoría'),
  duration: z.number().min(30, 'La duración mínima es 30 minutos').max(480, 'La duración máxima es 480 minutos'),
  // TR-19. Montaje y limpieza. Opcionales: no es lo mismo decir que no hace
  // falta montaje que no haberlo pensado todavía.
  prepTime: z.number().int().min(0).max(1440).optional(),
  cleanupTime: z.number().int().min(0).max(1440).optional(),
  // La anticipación mínima, en horas. Es de la experiencia: un mismo
  // calendario sirve a una cata que se reserva el mismo día y a una cena de
  // quince que hay que comprar con dos días.
  minimumNotice: z.number().int().min(0).max(8760).optional(),
  minCapacity: z.number().min(1).optional(),
  basePrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  currency: z.enum(['COP', 'USD']),
  // Todo es presencial; lo que cambia es si el anfitrión va a casa de quien
  // reserva.
  atHome: z.boolean().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.enum(['draft', 'pending', 'active', 'inactive']),
  isFeatured: z.boolean(),
  hideAddress: z.boolean().optional(),
});

type ExperienceFormData = z.infer<typeof experienceSchema>;

function CreateExperiencePageContenido() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
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
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customScheduleName, setCustomScheduleName] = useState('');
  const [locationMode, setLocationMode] = useState<'sede' | 'custom'>('sede');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
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
      minCapacity: 1,
      basePrice: 0,
      currency: 'COP',
      atHome: false,
      location: '',
      address: '',
      city: '',
      status: 'draft',
      isFeatured: false,
      hideAddress: false,
    }
  });

  const atHome = watch('atHome');
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
        // La empresa activa la manda AuthContext: es la que respeta el selector
        // de empresa y la que usa el resto del panel. /companies/me no vale
        // como unica fuente —a un ADMIN en modo plataforma le responde null a
        // proposito— y queda solo como respaldo.
        const companyData = sanityUser?.companyId
          ? await getCompanyById(sanityUser.companyId)
          : await getCompanyByUserId(user.uid);
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

          const menusData = await getMenusByCompany(companyData._id);
          setMenus(menusData || []);
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
  }, [user, sanityUser?.companyId, router, showError]);

  // Validar capacidad mínima

  const handleGenerateDescription = async (mode: 'generate' | 'improve') => {
    const values = watch();
    if (!values.title?.trim() && !values.description?.trim()) {
      showError('Escribe al menos un título antes de usar el asistente');
      return;
    }

    if (mode === 'generate') {
      const missing: string[] = [];
      if (selectedCategories.length === 0) missing.push('Categorías');
      if (!values.duration) missing.push('Duración');
      if (!values.basePrice) missing.push('Precio base');
      if (!values.city?.trim()) missing.push('Ciudad');
      if (includes.filter((i) => i.trim()).length === 0) missing.push('Qué incluye');
      if (requirements.filter((r) => r.trim()).length === 0) missing.push('Requisitos');

      if (missing.length > 0) {
        const proceed = await showConfirmation(
          'Para una mejor descripción, completa más campos',
          `La IA será mucho más precisa y SEO-friendly si llenas:\n\n• ${missing.join('\n• ')}\n\n¿Quieres generar igualmente con la información actual?`,
          'Generar ahora',
          'Voy a completar primero',
        );
        if (!proceed) return;
      }
    }

    setIsGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          categories: selectedCategories,
          duration: values.duration,
          minCapacity: values.minCapacity,
          basePrice: values.basePrice,
          currency: values.currency,
          city: values.city,
          includes: includes.filter((i) => i.trim()),
          requirements: requirements.filter((r) => r.trim()),
          currentDescription: values.description,
          mode,
          userId: sanityUser?._id || user?.uid,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        showError(data.error || 'No pudimos generar la descripción');
        return;
      }

      setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
    } catch (error) {
      console.error('Error generating description:', error);
      showError('Error de red. Intenta de nuevo.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

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

    // A domicilio no hay sitio fijo que declarar: la dirección la pone quien
    // reserva, en cada reserva.
    const enUnSitio = !data.atHome;

    // Validar lugar para experiencias presenciales/híbridas
    if (enUnSitio) {
      // No se exige sede: crear la pieza y ponerla en un sitio son dos
      // decisiones, y la segunda vive en Publicaciones. Hasta que se publique,
      // la experiencia queda como borrador y alli se ve que falta.

      if (locationMode === 'custom') {
        if (!data.location?.trim()) {
          showError('Indica el nombre del lugar personalizado');
          return;
        }
        if (!data.address?.trim()) {
          showError('Indica la dirección del lugar personalizado');
          return;
        }
        // El departamento va antes: sin el, el desplegable de ciudad ni
        // siquiera se deja abrir, asi que pedir la ciudad primero mandaria a
        // buscar un campo que esta bloqueado.
        if (!data.state?.trim()) {
          showError('Indica el departamento del lugar personalizado');
          return;
        }
        if (!data.city?.trim()) {
          showError('Indica la ciudad del lugar personalizado');
          return;
        }
      }
    }

    // El horario tampoco se pide aqui: es de la experiencia EN una sede, y la
    // misma pieza puede abrir los sabados en un sitio y los viernes en otro.
    // Se define en Publicaciones, escenario por escenario.

    try {
      setIsLoading(true);

      const experienceData: CreateExperienceData = {
        ...data,
        categories: selectedCategories as ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[],
        company: company._id,
        requirements: requirements.filter(req => req.trim() !== ''),
        includes: includes.filter(inc => inc.trim() !== ''),
        addons: addons.filter(addon => addon.name.trim() !== ''),
        // Las sedes las escribe Publicaciones, que es donde se decide en que
        // escenarios se usa la pieza.
      menus: selectedMenus.length > 0 ? selectedMenus : undefined,
        // Los calendarios se atan en Publicaciones, escenario por escenario.
        // La excepción es el lugar personalizado, que no es una sede y por eso
        // lleva el suyo propio: se crea justo debajo, con la experiencia ya
        // creada para poder colgarlo de ella.
        presentialLocation: data.location,
        presentialAddress: data.address,
        presentialCity: data.city,
        presentialState: data.state,
        hideAddress: data.hideAddress ?? false,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        featuredImage: featuredImageAssetId || undefined,
        gallery: galleryImages.length > 0 ? galleryImages : undefined,
      };

      const newExperience = await createExperienceInSanity(experienceData);

      // Un lugar personalizado no es una sede registrada, asi que no se puede
      // publicar en Publicaciones: su calendario cuelga de la experiencia. Sin
      // esto la pieza nacia sin horario y el catalogo ofrecia las horas por
      // defecto —de ocho a ocho, todos los dias—, que no son las de nadie.
      if (locationMode === 'custom' && enUnSitio && newExperience?._id) {
        try {
          const scheduleName = customScheduleName || `Calendario - ${data.title}`;
          const newSchedule = await createAvailabilitySchedule({
            name: scheduleName,
            experience: newExperience._id,
            description: `Disponibilidad propia de la experiencia: ${data.title}`,
            weeklySchedule: generateDefaultSchedule(),
            ...vigenciaPorDefecto(),
            blockedDates: [],
            notes: 'Calendario generado automáticamente. Personaliza los horarios en la sección de Disponibilidad.',
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <Label htmlFor="description">Descripción *</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDescription(watch('description')?.trim() ? 'improve' : 'generate')}
                    disabled={isGeneratingDescription}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-[#F26726] to-[#d9571f] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Generando…
                      </>
                    ) : (
                      <>
                        <HiSparkles className="w-3.5 h-3.5" />
                        {watch('description')?.trim() ? 'Mejorar con IA' : 'Generar con IA'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              <Textarea
                {...register('description')}
                placeholder="Describe detalladamente tu experiencia..."
                rows={5}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optimizada para SEO y conversión. La IA usa el título, categorías, ciudad y demás campos como contexto.
              </p>
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

            {/* TR-19. Lo que ocupa además de sí misma. La agenda lo cuenta:
                una cena de tres horas no deja el sitio libre a las tres. */}
            <div>
              <Label htmlFor="prepTime">Preparación (minutos)</Label>
              <TextInput
                {...register('prepTime', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                type="number"
                min="0"
                max="1440"
                className="mt-1"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lo que tardas en montar antes de empezar. Queda ocupado en tu
                agenda, así que no se te cruza otra cosa.
              </p>
            </div>

            <div>
              <Label htmlFor="cleanupTime">Limpieza después (minutos)</Label>
              <TextInput
                {...register('cleanupTime', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                type="number"
                min="0"
                max="1440"
                className="mt-1"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lo que tardas en recoger. Tampoco cabe otra cosa en ese rato.
              </p>
            </div>

            {/* La anticipación es de la experiencia, no del horario: un mismo
                calendario sirve a una cata que se reserva el mismo día y a una
                cena de quince que hay que comprar con dos días. */}
            <div>
              <Label htmlFor="minimumNotice">Anticipación mínima (horas)</Label>
              <TextInput
                {...register('minimumNotice', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                type="number"
                min="0"
                max="8760"
                className="mt-1"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                No se aceptan reservas con menos, ni siquiera si se libera un
                cupo a última hora.
              </p>
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

        {/* Cupos y precios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Cupos y precios
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Los cupos NO se piden aquí: son del horario, no de la pieza.
                El almuerzo y la cena de un sábado son dos inventarios
                distintos, y la misma experiencia puede admitir ocho en el
                local y veinte en la terraza; un número único aquí no podía
                decir eso. */}
            <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
              <Label>Cupos por sesión</Label>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Se ponen en cada franja del horario, en{' '}
                <Link href="/dashboard/publicaciones" className="text-[#F26726] hover:underline font-medium">
                  Publicaciones → Horario
                </Link>
                : el almuerzo y la cena pueden admitir distinta gente.
              </p>
            </div>

            <div>
              <Label htmlFor="minCapacity">Cupos mínimos para realizarla</Label>
              <TextInput
                {...register('minCapacity', { valueAsNumber: true })}
                type="number"
                min="1"
                max="100"
                className="mt-1"
              />
              {errors.minCapacity && (
                <p className="text-red-500 text-sm mt-1">{errors.minCapacity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="basePrice">Precio Base por Persona *</Label>
              <div className="mt-1">
                <PrecioInput
                  id="basePrice"
                  value={watch('basePrice')}
                  onChange={(v) =>
                    setValue('basePrice', v ?? 0, { shouldValidate: true, shouldDirty: true })
                  }
                  placeholder="0"
                />
              </div>
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
            {/* Todo es presencial. Lo único que hay que decidir es si el
                anfitrión va a casa de quien reserva: entonces no hay sitio que
                declarar y la dirección la pone el comensal en cada reserva. */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="atHome"
                  {...register('atHome')}
                  className="mt-1 text-[#F26726] focus:ring-[#F26726]"
                />
                <div>
                  <Label htmlFor="atHome" className="cursor-pointer font-medium">
                    Se hace a domicilio
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    El anfitrión va a donde diga quien reserva: un chef que cocina en casa del
                    cliente. No se publica en sedes y la dirección se pide al reservar.
                  </p>
                </div>
              </div>
            </div>

            {!atHome && (
              <div className="space-y-4">
                <div>
                  <Label>¿Dónde se realizará? *</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Elige una sede registrada de tu empresa o define un lugar personalizado para esta experiencia.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLocationMode('sede')}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                        locationMode === 'sede'
                          ? 'border-[#F26726] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        locationMode === 'sede' ? 'border-[#F26726]' : 'border-gray-400'
                      }`}>
                        {locationMode === 'sede' && (
                          <div className="w-2 h-2 rounded-full bg-[#F26726]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Sede registrada</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Después la publicas en una o varias, cada una con su horario.
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('custom')}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                        locationMode === 'custom'
                          ? 'border-[#F26726] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        locationMode === 'custom' ? 'border-[#F26726]' : 'border-gray-400'
                      }`}>
                        {locationMode === 'custom' && (
                          <div className="w-2 h-2 rounded-full bg-[#F26726]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Lugar personalizado</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Define un lugar puntual con su propio calendario para esta experiencia.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {locationMode === 'custom' && (
                  <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <Label htmlFor="location">Nombre del lugar *</Label>
                      <TextInput
                        {...register('location')}
                        placeholder="Ej: Hacienda Los Naranjos"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Dirección *</Label>
                      <TextInput
                        {...register('address')}
                        placeholder="Calle 123 # 45-67"
                        className="mt-1"
                      />
                    </div>
                    <DepartamentoCiudad
                      departamento={watch('state') || ''}
                      ciudad={watch('city') || ''}
                      onDepartamentoChange={(v) =>
                        setValue('state', v, { shouldValidate: true, shouldDirty: true })
                      }
                      onCiudadChange={(v) =>
                        setValue('city', v, { shouldValidate: true, shouldDirty: true })
                      }
                      idDepartamento="experiencia-state"
                      idCiudad="experiencia-city"
                      requerido
                    />
                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                      Como es un lugar personalizado, esta experiencia tendrá su propio calendario de disponibilidad (configúralo abajo).
                    </p>
                  </div>
                )}

                {/* En qué sedes se ofrece NO se decide aquí.
                    Este panel crea la PIEZA; ponerla en un sitio es usarla, y
                    la misma pieza puede ir a una sede como abierta y a otra
                    como privada, con otro horario y otro precio. Eso no cabe
                    en una casilla, y vive en Publicaciones. */}
                {locationMode === 'sede' && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <Label>Dónde y cuándo se ofrece</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Se decide después, en <span className="font-medium">Publicaciones</span>: ahí
                      pones esta experiencia en una o varias sedes, y cada una lleva su modalidad
                      —abierta o privada—, su horario y su precio.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Hasta entonces queda como borrador y no se ofrece en el catálogo.
                    </p>
                  </div>
                )}

                {/* Visibilidad de la dirección */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="hideAddress"
                      {...register('hideAddress')}
                      className="mt-1 text-[#F26726] focus:ring-[#F26726]"
                    />
                    <div>
                      <Label htmlFor="hideAddress" className="cursor-pointer font-medium text-gray-900">
                        Ocultar la dirección exacta en el catálogo público
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Útil para experiencias clandestinas. Solo se mostrará la ciudad; la dirección completa se compartirá con el comensal una vez confirme la reserva.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* El calendario propio del lugar personalizado. Las sedes registradas
            no pasan por aquí: su horario es por escenario y se define en
            Publicaciones. */}
        {locationMode === 'custom' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-4">
              Disponibilidad de la experiencia
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
                    color="danger"
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
                    color="danger"
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

        {/* Menús */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] dark:text-gray-100 mb-6">
            Menús
          </h2>
          <MenuSelector menus={menus} selected={selectedMenus} onChange={setSelectedMenus} />
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
                    color="danger"
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
                    <PrecioInput
                      value={addon.price}
                      onChange={(v) => updateAddon(index, 'price', v ?? 0)}
                      placeholder="Precio"
                      aria-label="Precio del servicio adicional"
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

/**
 * Pantalla de anfitrion: quien crea experiencias es el anfitrion, no su canal de venta.
 *
 * El menu ya no se la enseña a un revendedor, pero por URL se llegaba igual
 * y lo que salia era una pantalla rota —el titulo de su empresa, botones que
 * dan 403 y un error al cargar—. ProtectedRoute lo devuelve al dashboard.
 */
export default function CreateExperiencePage() {
  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <CreateExperiencePageContenido />
    </ProtectedRoute>
  );
}
