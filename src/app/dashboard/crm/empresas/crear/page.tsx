"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select, Textarea, Card } from 'flowbite-react';
import { HiArrowLeft, HiSave } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { createCRMCompany } from '@/lib/sanity/crmCompanyService';
import { CreateCRMCompanyData, CRMCompanyIndustry, CRMCompanySource } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

// Función helper para formatear URLs
const formatUrl = (url: string): string => {
  if (!url || url.trim() === '') {
    return '';
  }
  
  const trimmedUrl = url.trim();
  
  // Si ya tiene protocolo, retornar tal cual
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // Si no tiene protocolo, agregar https://
  return `https://${trimmedUrl}`;
};

// Esquema de validación
const companySchema = z.object({
  companyName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  businessName: z.string().optional(),
  companyType: z.enum(['customer', 'supplier', 'other']),
  industry: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.preprocess(
    (val) => {
      if (!val || val === '') return '';
      return formatUrl(String(val));
    },
    z.string().url('URL inválida').optional().or(z.literal(''))
  ),
  documentType: z.enum(['nit', 'cedula', 'pasaporte', 'other']).optional(),
  documentNumber: z.string().optional(),
  status: z.enum(['active', 'inactive', 'qualified', 'unqualified', 'closed']),
  source: z.string().optional(),
  notes: z.string().optional(),
  employeeCount: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  annualRevenue: z.enum(['0-100k', '100k-500k', '500k-1M', '1M-5M', '5M+']).optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

const companyTypes = [
  { value: 'customer', label: 'Cliente' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'other', label: 'Otro' },
];

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'unqualified', label: 'No Calificado' },
  { value: 'closed', label: 'Cerrado' },
];

const sourceOptions = [
  { value: 'web', label: 'Web' },
  { value: 'referral', label: 'Referido' },
  { value: 'social', label: 'Redes Sociales' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'event', label: 'Evento' },
  { value: 'cold_call', label: 'Llamada Fría' },
  { value: 'other', label: 'Otro' },
];

const industryOptions = [
  { value: 'restaurants', label: 'Restaurantes y Bares' },
  { value: 'hospitality', label: 'Hotelería' },
  { value: 'events', label: 'Eventos y Catering' },
  { value: 'retail', label: 'Retail y Comercio' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'construction', label: 'Construcción' },
  { value: 'healthcare', label: 'Salud y Bienestar' },
  { value: 'education', label: 'Educación' },
  { value: 'finance', label: 'Finanzas y Banca' },
  { value: 'real_estate', label: 'Inmobiliaria' },
  { value: 'transport', label: 'Transporte y Logística' },
  { value: 'media', label: 'Medios y Comunicación' },
  { value: 'energy', label: 'Energía y Utilities' },
  { value: 'agriculture', label: 'Agricultura y Agroindustria' },
  { value: 'tourism', label: 'Turismo y Viajes' },
  { value: 'sports', label: 'Deportes y Entretenimiento' },
  { value: 'fashion', label: 'Moda y Textiles' },
  { value: 'automotive', label: 'Automotriz' },
  { value: 'pharmaceutical', label: 'Farmacéutica' },
  { value: 'consulting', label: 'Consultoría' },
  { value: 'marketing', label: 'Marketing y Publicidad' },
  { value: 'legal', label: 'Legal' },
  { value: 'nonprofit', label: 'ONG y Sin Fines de Lucro' },
  { value: 'government', label: 'Gobierno y Sector Público' },
  { value: 'other', label: 'Otro' },
];

const countries = [
  { value: 'AR', label: 'Argentina' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'CL', label: 'Chile' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'CU', label: 'Cuba' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'ES', label: 'España' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'MX', label: 'México' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'PA', label: 'Panamá' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Perú' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'DO', label: 'República Dominicana' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'VE', label: 'Venezuela' },
];

export default function CrearEmpresaPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CompanyFormData>({
    defaultValues: {
      companyName: '',
      businessName: '',
      companyType: 'customer',
      industry: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      documentType: 'nit',
      documentNumber: '',
      status: 'active',
      source: '',
      notes: '',
      employeeCount: undefined,
      annualRevenue: undefined,
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (!sanityUser?.companyId) {
      showError('Debes tener una empresa configurada');
      return;
    }

    try {
      const validationResult = companySchema.safeParse(data);
      if (!validationResult.success) {
        showError('Por favor, completa todos los campos requeridos correctamente');
        return;
      }

      setIsLoading(true);

      const companyData: CreateCRMCompanyData = {
        hostCompany: sanityUser.companyId,
        companyName: data.companyName,
        businessName: data.businessName || undefined,
        companyType: data.companyType,
        industry: (data.industry as CRMCompanyIndustry) || undefined,
        description: data.description || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        website: data.website || undefined,
        documentType: data.documentType || undefined,
        documentNumber: data.documentNumber || undefined,
        address: {
          street: (document.getElementById('address-street') as HTMLInputElement)?.value || undefined,
          city: (document.getElementById('address-city') as HTMLInputElement)?.value || undefined,
          state: (document.getElementById('address-state') as HTMLInputElement)?.value || undefined,
          postalCode: (document.getElementById('address-postalCode') as HTMLInputElement)?.value || undefined,
          country: (document.getElementById('address-country') as HTMLSelectElement)?.value || 'CO',
        },
        employeeCount: data.employeeCount || undefined,
        annualRevenue: data.annualRevenue || undefined,
        status: data.status,
        source: (data.source as CRMCompanySource) || undefined,
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        socialMedia: {
          linkedin: (document.getElementById('social-linkedin') as HTMLInputElement)?.value || undefined,
          twitter: (document.getElementById('social-twitter') as HTMLInputElement)?.value || undefined,
          facebook: (document.getElementById('social-facebook') as HTMLInputElement)?.value || undefined,
          instagram: (document.getElementById('social-instagram') as HTMLInputElement)?.value || undefined,
        },
        isActive: true,
      };

      await createCRMCompany(companyData);
      showSuccess('Empresa creada correctamente');
      router.push('/dashboard/crm/empresas');
    } catch (error) {
      console.error('Error creating company:', error);
      showError('Error al crear la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sanityUser?.companyId) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Debes tener una empresa configurada para crear empresas CRM.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {isLoading && <Loader message="Creando empresa..." />}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/empresas')}
              className="mr-4"
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Nueva Empresa CRM
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Completa la información de la empresa
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Básica */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Información Básica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                <TextInput
                  id="companyName"
                  {...register('companyName')}
                  placeholder="Ej: Restaurante El Buen Sabor"
                  className="mt-1"
                  color={errors.companyName ? 'failure' : undefined}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="businessName">Razón Social</Label>
                <TextInput
                  id="businessName"
                  {...register('businessName')}
                  placeholder="Nombre legal de la empresa"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="companyType">Tipo de Empresa *</Label>
                <Select
                  id="companyType"
                  {...register('companyType')}
                  className="mt-1"
                >
                  {companyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="industry">Industria</Label>
                <Select
                  id="industry"
                  {...register('industry')}
                  className="mt-1"
                >
                  <option value="">Seleccionar...</option>
                  {industryOptions.map(industry => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  placeholder="Descripción de la empresa"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Información de Contacto */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Información de Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <TextInput
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="empresa@ejemplo.com"
                  className="mt-1"
                  color={errors.email ? 'failure' : undefined}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <TextInput
                  id="phone"
                  {...register('phone')}
                  placeholder="+57 300 000 0000"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="website">Sitio Web</Label>
                <TextInput
                  id="website"
                  type="url"
                  {...register('website', {
                    onBlur: (e) => {
                      const value = e.target.value;
                      if (value && value.trim() !== '') {
                        const formatted = formatUrl(value);
                        setValue('website', formatted, { shouldValidate: true });
                      }
                    }
                  })}
                  placeholder="https://www.ejemplo.com o www.ejemplo.com"
                  className="mt-1"
                  color={errors.website ? 'failure' : undefined}
                />
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Información Fiscal */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Información Fiscal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentType">Tipo de Documento</Label>
                <Select
                  id="documentType"
                  {...register('documentType')}
                  className="mt-1"
                >
                  <option value="nit">NIT</option>
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="other">Otro</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="documentNumber">Número de Documento</Label>
                <TextInput
                  id="documentNumber"
                  {...register('documentNumber')}
                  placeholder="123456789"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Dirección */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Dirección
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address-street">Dirección</Label>
                <TextInput
                  id="address-street"
                  placeholder="Calle y número"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address-city">Ciudad</Label>
                <TextInput
                  id="address-city"
                  placeholder="Ciudad"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address-state">Departamento/Estado</Label>
                <TextInput
                  id="address-state"
                  placeholder="Departamento o estado"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address-postalCode">Código Postal</Label>
                <TextInput
                  id="address-postalCode"
                  placeholder="Código postal"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address-country">País</Label>
                <Select
                  id="address-country"
                  defaultValue="CO"
                  className="mt-1"
                >
                  {countries.map(country => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Información Adicional */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Información Adicional
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeCount">Número de Empleados</Label>
                <Select
                  id="employeeCount"
                  {...register('employeeCount')}
                  className="mt-1"
                >
                  <option value="">Seleccionar...</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="500+">500+</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="annualRevenue">Ingresos Anuales</Label>
                <Select
                  id="annualRevenue"
                  {...register('annualRevenue')}
                  className="mt-1"
                >
                  <option value="">Seleccionar...</option>
                  <option value="0-100k">0-100k</option>
                  <option value="100k-500k">100k-500k</option>
                  <option value="500k-1M">500k-1M</option>
                  <option value="1M-5M">1M-5M</option>
                  <option value="5M+">5M+</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* Redes Sociales */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Redes Sociales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="social-linkedin">LinkedIn</Label>
                <TextInput
                  id="social-linkedin"
                  type="url"
                  placeholder="https://linkedin.com/company/..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="social-twitter">Twitter/X</Label>
                <TextInput
                  id="social-twitter"
                  type="url"
                  placeholder="https://twitter.com/..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="social-facebook">Facebook</Label>
                <TextInput
                  id="social-facebook"
                  type="url"
                  placeholder="https://facebook.com/..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="social-instagram">Instagram</Label>
                <TextInput
                  id="social-instagram"
                  type="url"
                  placeholder="https://instagram.com/..."
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Estado y Origen */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Estado y Origen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Estado *</Label>
                <Select
                  id="status"
                  {...register('status')}
                  className="mt-1"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="source">Origen</Label>
                <Select
                  id="source"
                  {...register('source')}
                  className="mt-1"
                >
                  <option value="">Seleccionar...</option>
                  {sourceOptions.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Etiquetas */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Etiquetas
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <TextInput
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Agregar etiqueta"
                  className="flex-1"
                />
                <Button type="button" onClick={addTag}>
                  Agregar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Notas */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Notas
            </h2>
            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={4}
                placeholder="Notas adicionales sobre la empresa..."
                className="mt-1"
              />
            </div>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-4">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/empresas')}
            >
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isLoading}>
              <HiSave className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Empresa'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}

