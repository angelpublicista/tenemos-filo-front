"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import { createExperienceInSanity } from '@/lib/sanity/experienceService';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { CreateExperienceData, Company } from '@/types';
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

// Esquema de validación
const experienceSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.enum(['cooking', 'mixology', 'tasting', 'catering', 'corporate', 'celebrations', 'workshops', 'other']),
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
  const [addons, setAddons] = useState<Array<{name: string, price: number, description: string}>>([]);

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
      category: 'cooking',
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
          router.push('/dashboard/company-setup');
          return;
        }
        setCompany(companyData);
        setCompanyNotFound(false);
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

  // Validar capacidad mínima
  useEffect(() => {
    if (minCapacity && capacity && minCapacity > capacity) {
      setValue('minCapacity', capacity);
    }
  }, [capacity, minCapacity, setValue]);

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
    setAddons([...addons, { name: '', price: 0, description: '' }]);
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

    try {
      setIsLoading(true);

      // Validar datos adicionales
      const experienceData: CreateExperienceData = {
        ...data,
        company: company._id,
        requirements: requirements.filter(req => req.trim() !== ''),
        includes: includes.filter(inc => inc.trim() !== ''),
        addons: addons.filter(addon => addon.name.trim() !== ''),
        presentialLocation: data.location,
        presentialAddress: data.address,
        presentialCity: data.city,
      };

      await createExperienceInSanity(experienceData);
      
      showSuccess('Experiencia creada exitosamente');
      router.push('/dashboard/my-experiences');
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
            onClick={() => router.push('/dashboard/company-setup')}
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
              Crear Nueva Experiencia
            </h1>
            <p className="text-gray-600">
              Completa la información para crear tu experiencia gastronómica
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Información Básica */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
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

            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select {...register('category')} className="mt-1">
                <option value="cooking">Cocina</option>
                <option value="mixology">Mixología</option>
                <option value="tasting">Degustación</option>
                <option value="catering">Catering</option>
                <option value="corporate">Eventos Corporativos</option>
                <option value="celebrations">Celebraciones</option>
                <option value="workshops">Talleres</option>
                <option value="other">Otro</option>
              </Select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
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

        {/* Capacidad y Precios */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
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
              />
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
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
                  <Label htmlFor="location">Ubicación/Nombre del Lugar</Label>
                  <TextInput
                    {...register('location')}
                    placeholder="Ej: Cocina Principal, Salón de Eventos"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <TextInput
                    {...register('address')}
                    placeholder="Ej: Calle 123 #45-67"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <TextInput
                    {...register('city')}
                    placeholder="Ej: Bogotá"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requisitos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D]">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D]">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#334C5D]">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <TextInput
                    value={addon.name}
                    onChange={(e) => updateAddon(index, 'name', e.target.value)}
                    placeholder="Nombre del servicio"
                  />
                  <TextInput
                    type="number"
                    value={addon.price}
                    onChange={(e) => updateAddon(index, 'price', Number(e.target.value))}
                    placeholder="Precio adicional"
                  />
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#334C5D] mb-6">
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
    </div>
  );
}
