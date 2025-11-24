"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select, Textarea, Card } from 'flowbite-react';
import { HiArrowLeft, HiSave } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { createContact } from '@/lib/sanity/contactService';
import { CreateContactData, ContactType, ContactStatus, ContactSource } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';
import { getCRMCompaniesByHost } from '@/lib/sanity/crmCompanyService';

// Esquema de validación
const contactSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  contactType: z.enum(['customer', 'supplier', 'other']),
  status: z.enum(['active', 'inactive', 'qualified', 'unqualified']),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactTypes = [
  { value: 'customer', label: 'Cliente' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'other', label: 'Otro' },
];

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'unqualified', label: 'No Calificado' },
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

export default function CrearContactoPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [crmCompanies, setCrmCompanies] = useState<Array<{_id: string, companyName: string}>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      jobTitle: '',
      department: '',
      contactType: 'customer',
      status: 'active',
      source: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (sanityUser?.companyId) {
      loadCRMCompanies();
    }
  }, [sanityUser?.companyId]);

  const loadCRMCompanies = async () => {
    if (!sanityUser?.companyId) return;
    setIsLoadingCompanies(true);
    try {
      const companies = await getCRMCompaniesByHost(sanityUser.companyId, { limit: 100 });
      setCrmCompanies(companies.map(c => ({ _id: c._id, companyName: c.companyName })));
    } catch (error) {
      console.error('Error loading CRM companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: ContactFormData) => {
    if (!sanityUser?.companyId || !sanityUser?._id) {
      showError('Debes tener una empresa configurada');
      return;
    }

    try {
      const validationResult = contactSchema.safeParse(data);
      if (!validationResult.success) {
        showError('Por favor, completa todos los campos requeridos correctamente');
        return;
      }

      setIsLoading(true);

      const contactData: CreateContactData = {
        hostCompany: sanityUser.companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        jobTitle: data.jobTitle || undefined,
        department: data.department || undefined,
        company: (document.getElementById('company') as HTMLSelectElement)?.value || undefined,
        contactType: data.contactType,
        status: data.status,
        source: (data.source as ContactSource) || undefined,
        address: {
          street: (document.getElementById('address-street') as HTMLInputElement)?.value || undefined,
          city: (document.getElementById('address-city') as HTMLInputElement)?.value || undefined,
          state: (document.getElementById('address-state') as HTMLInputElement)?.value || undefined,
          postalCode: (document.getElementById('address-postalCode') as HTMLInputElement)?.value || undefined,
          country: (document.getElementById('address-country') as HTMLSelectElement)?.value || 'CO',
        },
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        socialMedia: {
          linkedin: (document.getElementById('social-linkedin') as HTMLInputElement)?.value || undefined,
          twitter: (document.getElementById('social-twitter') as HTMLInputElement)?.value || undefined,
          facebook: (document.getElementById('social-facebook') as HTMLInputElement)?.value || undefined,
          instagram: (document.getElementById('social-instagram') as HTMLInputElement)?.value || undefined,
        },
        isActive: true,
        createdBy: sanityUser._id,
      };

      await createContact(contactData);
      showSuccess('Contacto creado correctamente');
      router.push('/dashboard/crm/contactos');
    } catch (error) {
      console.error('Error creating contact:', error);
      showError('Error al crear el contacto');
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
              Debes tener una empresa configurada para crear contactos CRM.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {isLoading && <Loader message="Creando contacto..." />}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/contactos')}
              className="mr-4"
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Nuevo Contacto CRM
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Completa la información del contacto
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Personal */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Información Personal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <TextInput
                  id="firstName"
                  {...register('firstName')}
                  placeholder="Juan"
                  className="mt-1"
                  color={errors.firstName ? 'failure' : undefined}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Apellido *</Label>
                <TextInput
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Pérez"
                  className="mt-1"
                  color={errors.lastName ? 'failure' : undefined}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="jobTitle">Cargo</Label>
                <TextInput
                  id="jobTitle"
                  {...register('jobTitle')}
                  placeholder="Gerente de Ventas"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="department">Departamento</Label>
                <TextInput
                  id="department"
                  {...register('department')}
                  placeholder="Ventas"
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
                  placeholder="juan.perez@ejemplo.com"
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
                  placeholder="+57 1 234 5678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mobile">Celular</Label>
                <TextInput
                  id="mobile"
                  {...register('mobile')}
                  placeholder="+57 300 123 4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="company">Empresa CRM</Label>
                <Select
                  id="company"
                  className="mt-1"
                  disabled={isLoadingCompanies}
                >
                  <option value="">Seleccionar empresa (opcional)</option>
                  {crmCompanies.map(company => (
                    <option key={company._id} value={company._id}>
                      {company.companyName}
                    </option>
                  ))}
                </Select>
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

          {/* Estado y Origen */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Estado y Origen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactType">Tipo de Contacto *</Label>
                <Select
                  id="contactType"
                  {...register('contactType')}
                  className="mt-1"
                >
                  {contactTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

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
                  placeholder="https://linkedin.com/in/..."
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
                placeholder="Notas adicionales sobre el contacto..."
                className="mt-1"
              />
            </div>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-4">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/contactos')}
            >
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isLoading}>
              <HiSave className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Contacto'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}

