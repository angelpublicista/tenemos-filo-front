"use client";

import ProtectedRoute from '@/components/ProtectedRoute';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import { getExperienceById, updateExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyById, getCompanyByUserId } from '@/lib/sanity/companyService';
import { getLocationsByCompany } from '@/lib/sanity/locationService';
import { getMenusByCompany } from '@/lib/sanity/menuService';
import { UpdateExperienceData, Company, Location, Experience, Menu } from '@/types';
import LocationModal from '@/components/LocationModal';
import MenuSelector from '@/components/MenuSelector';
import Link from 'next/link';
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
import { useRouter, useParams } from 'next/navigation';
import Loader from '@/components/Loader';
import { ImageUpload, GalleryUpload } from '@/components/ImageUpload';

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
  status: z.enum(['draft', 'pending', 'active', 'paused', 'inactive']),
  isFeatured: z.boolean(),
});

type ExperienceFormData = z.infer<typeof experienceSchema>;

function EditExperiencePageContenido() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const experienceId = params.id as string;
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [includes, setIncludes] = useState<string[]>(['']);
  const [addons, setAddons] = useState<Array<{name: string, price: number, priceType: 'per_person' | 'total', description: string}>>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [featuredImageAssetId, setFeaturedImageAssetId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ assetId: string; alt?: string; caption?: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

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

  // Cargar datos de la experiencia y empresa
  useEffect(() => {
    const loadData = async () => {
      if (!user || !experienceId) {
        setIsLoadingData(false);
        return;
      }

      try {
        // Cargar empresa
        // La empresa activa la manda AuthContext: es la que respeta el selector
        // de empresa y la que usa el resto del panel. /companies/me no vale
        // como unica fuente —a un ADMIN en modo plataforma le responde null a
        // proposito— y queda solo como respaldo.
        const companyData = sanityUser?.companyId
          ? await getCompanyById(sanityUser.companyId)
          : await getCompanyByUserId(user.uid);
        if (!companyData) {
          setCompanyNotFound(true);
          setIsLoadingData(false);
          showError('No se encontró información de empresa.');
          router.push('/company-setup');
          return;
        }
        setCompany(companyData);

        // Cargar experiencia
        const experienceData = await getExperienceById(experienceId);
        if (!experienceData) {
          setIsLoadingData(false);
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
          prepTime: experienceData.prepTime ?? undefined,
          cleanupTime: experienceData.cleanupTime ?? undefined,
          minimumNotice: experienceData.minimumNotice ?? undefined,
          minCapacity: experienceData.minCapacity,
          basePrice: experienceData.basePrice,
          currency: experienceData.currency,
          atHome: experienceData.atHome ?? false,
          location: experienceData.presentialLocation || '',
          address: experienceData.presentialAddress || '',
          city: experienceData.presentialCity || '',
          state: experienceData.presentialState || '',
          status: experienceData.status,
          isFeatured: experienceData.isFeatured,
        });

        // Cargar listas
        setRequirements(experienceData.requirements && experienceData.requirements.length > 0 ? experienceData.requirements : ['']);
        setIncludes(experienceData.includes && experienceData.includes.length > 0 ? experienceData.includes : ['']);
        
        // Para compatibilidad con campos antiguos del schema
        const expData = experienceData as Experience & {
          category?: string;
          location?: { _ref: string } | string;
          availabilitySchedule?: { _ref: string } | string;
          availabilitySchedules?: Array<{ _id: string; name: string }>;
        };

        // Cargar addons con compatibilidad hacia atrás (si no tienen priceType, usar 'per_person' por defecto)
        const loadedAddons = (experienceData.addons || []).map(addon => ({
          name: addon.name,
          price: addon.price,
          priceType: (addon.priceType || 'per_person') as 'per_person' | 'total',
          description: addon.description || ''
        }));
        setAddons(loadedAddons);
        
        // Cargar categorías seleccionadas (compatibilidad con campo antiguo 'category')
        if (experienceData.categories && experienceData.categories.length > 0) {
          setSelectedCategories(experienceData.categories);
        } else if (expData.category) {
          // Formato antiguo: una sola categoría
          setSelectedCategories([expData.category]);
        } else {
          setSelectedCategories([]);
        }

        // Cargar imágenes
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

          const menusData = await getMenusByCompany(companyData._id);
          setMenus(menusData || []);

          if (Array.isArray(experienceData.menus)) {
            setSelectedMenus(
              experienceData.menus.map((m) => {
                if (typeof m === 'object' && '_id' in m && m._id) return m._id;
                if (typeof m === 'object' && '_ref' in m) return m._ref;
                return m as unknown as string;
              }),
            );
          }
          
          // Seleccionar sedes actuales si existen (compatibilidad con campo antiguo 'location')
          if (experienceData.locations && Array.isArray(experienceData.locations)) {
            // Nuevo formato: múltiples sedes
            const locationIds: string[] = experienceData.locations.map(loc => {
              if (typeof loc === 'object' && '_id' in loc) {
                return (loc as { _id: string })._id;
              } else if (typeof loc === 'object' && '_ref' in loc) {
                return (loc as { _ref: string })._ref;
              }
              return loc as string;
            });
            setSelectedLocations(locationIds);
          } else if (expData.location) {
            // Formato antiguo: una sola sede
            const locationId = typeof expData.location === 'object' && '_ref' in expData.location 
              ? expData.location._ref 
              : expData.location;
            setSelectedLocations([locationId]);
          }
        }

            } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar los datos');
      } finally {
        // Terminar carga de datos básicos
        // Los calendarios disponibles se cargan en background sin bloquear la UI
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user, sanityUser?.companyId, experienceId, router, showError, reset]);

  // Validar capacidad mínima

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

    // No se exige sede: dónde se ofrece la pieza se decide en Publicaciones, y
    // exigirlo aquí dejaría sin poder guardar un cambio de título a quien
    // todavía no la ha publicado.

    try {
      setIsLoading(true);

      // Preparar datos de actualización
      const updateData: UpdateExperienceData = {
        _id: experience._id,
        title: data.title,
        description: data.description,
        categories: selectedCategories as ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[],
        duration: data.duration,
        // TR-19. Nulo cuando se deja vacío: "no aplica" es una respuesta, y
        // dejarlo sin mandar conservaría el valor viejo para siempre.
        prepTime: data.prepTime ?? null,
        cleanupTime: data.cleanupTime ?? null,
        minimumNotice: data.minimumNotice ?? null,
        minCapacity: data.minCapacity,
        basePrice: data.basePrice,
        currency: data.currency,
        atHome: data.atHome ?? false,
        presentialLocation: data.location,
        presentialAddress: data.address,
        presentialCity: data.city,
        // Esta pantalla no edita el lugar puntual, pero tiene que devolverlo
        // igual que lo recibio: si no, editar cualquier otra cosa lo borraria.
        presentialState: data.state,
        status: data.status,
        isFeatured: data.isFeatured,
        requirements: requirements.filter(req => req && req.trim() !== ''),
        includes: includes.filter(inc => inc && inc.trim() !== ''),
        addons: addons.filter(addon => addon && addon.name && addon.name.trim() !== ''),
        // Las sedes NO se mandan desde aquí: las escribe Publicaciones, que es
        // donde se decide en qué escenarios se usa la pieza. Mandarlas también
        // desde este formulario pisaría lo publicado allí.
        menus: selectedMenus,
        // Los horarios tampoco se mandan desde aquí: son de la experiencia EN
        // una sede y se gestionan en Publicaciones, escenario por escenario.
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <Label htmlFor="description">Descripción *</Label>
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
            {/* Todo es presencial. Lo único que hay que decidir es si el
                anfitrión va a casa de quien reserva: entonces no hay sede que
                publicar y la dirección la pone el comensal en cada reserva. */}
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
                {/* Dónde se ofrece ya NO se decide aquí.
                    Este panel es para la PIEZA —qué se hace, cuánto dura, qué
                    incluye—. Ponerla en un sitio es usarla, y la misma pieza
                    puede ir a una sede como abierta y a otra como privada, con
                    otro horario y otro precio: eso no cabe en una casilla. */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  <Label>Dónde se ofrece</Label>
                  {selectedLocations.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Todavía en ningún sitio. Se decide en{' '}
                      <Link href="/dashboard/publicaciones" className="text-[#F26726] hover:underline font-medium">
                        Publicaciones
                      </Link>
                      , donde también eliges la modalidad y el horario de cada sede.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                        {locations
                          .filter((l) => selectedLocations.includes(l._id))
                          .map((l) => l.name)
                          .join(' · ')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        La modalidad, el precio y el horario de cada sede se gestionan en{' '}
                        <Link href="/dashboard/publicaciones" className="text-[#F26726] hover:underline font-medium">
                          Publicaciones
                        </Link>
                        .
                      </p>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

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
 * Pantalla de anfitrion: quien edita una experiencia es el anfitrion que la hace.
 *
 * El menu ya no se la enseña a un revendedor, pero por URL se llegaba igual
 * y lo que salia era una pantalla rota —el titulo de su empresa, botones que
 * dan 403 y un error al cargar—. ProtectedRoute lo devuelve al dashboard.
 */
export default function EditExperiencePage() {
  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <EditExperiencePageContenido />
    </ProtectedRoute>
  );
}
