"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select, Textarea, Card } from 'flowbite-react';
import { HiArrowLeft, HiSave, HiPlus, HiX } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { createOpportunity } from '@/lib/sanity/opportunityService';
import { CreateOpportunityData, OpportunityStage, OpportunityStatus, OpportunitySource, Experience } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';
import { getCRMCompaniesByHost } from '@/lib/sanity/crmCompanyService';
import { getContactsByHost } from '@/lib/sanity/contactService';
import { getExperiencesByCompany } from '@/lib/sanity/experienceService';

// Esquema de validación
const opportunitySchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'approval', 'closed_won', 'closed_lost']),
  status: z.enum(['open', 'won', 'lost', 'paused']),
  value: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  currency: z.enum(['COP', 'USD']),
  expectedCloseDate: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

const stageOptions = [
  { value: 'prospecting', label: 'Prospección' },
  { value: 'qualification', label: 'Calificación' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'approval', label: 'Aprobación' },
  { value: 'closed_won', label: 'Cerrado Ganado' },
  { value: 'closed_lost', label: 'Cerrado Perdido' },
];

const statusOptions = [
  { value: 'open', label: 'Abierta' },
  { value: 'won', label: 'Ganada' },
  { value: 'lost', label: 'Perdida' },
  { value: 'paused', label: 'En Pausa' },
];

const sourceOptions = [
  { value: 'web', label: 'Web' },
  { value: 'referral', label: 'Referido' },
  { value: 'social', label: 'Redes Sociales' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'event', label: 'Evento' },
  { value: 'cold_call', label: 'Llamada Fría' },
  { value: 'existing_contact', label: 'Contacto Existente' },
  { value: 'other', label: 'Otro' },
];

interface ExperienceItem {
  experience: string;
  quantity: number;
  customPrice?: number;
  notes?: string;
}

export default function CrearOportunidadPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [crmCompanies, setCrmCompanies] = useState<Array<{_id: string, companyName: string}>>([]);
  const [contacts, setContacts] = useState<Array<{_id: string, firstName: string, lastName: string}>>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<ExperienceItem[]>([]);
  const [decisionMakers, setDecisionMakers] = useState<string[]>([]);
  const [crmCompanyId, setCrmCompanyId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormData>({
    defaultValues: {
      name: '',
      description: '',
      stage: 'prospecting',
      status: 'open',
      currency: 'COP',
      source: '',
      notes: '',
    },
  });

  const loadData = useCallback(async () => {
    if (!sanityUser?.companyId) return;
    setIsLoadingData(true);
    try {
      const [companies, contactsList, experiencesList] = await Promise.all([
        getCRMCompaniesByHost(sanityUser.companyId, { limit: 100 }),
        getContactsByHost(sanityUser.companyId, { limit: 100 }),
        getExperiencesByCompany(sanityUser.companyId),
      ]);
      setCrmCompanies(companies.map(c => ({ _id: c._id, companyName: c.companyName })));
      setContacts(contactsList.map(c => ({ _id: c._id, firstName: c.firstName, lastName: c.lastName })));
      setExperiences(experiencesList.filter(e => e.status === 'active'));
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    } finally {
      setIsLoadingData(false);
    }
  }, [sanityUser?.companyId, showError]);

  useEffect(() => {
    if (sanityUser?.companyId && sanityUser?._id) {
      loadData();
      setAssignedToId(sanityUser._id);
    }
  }, [sanityUser?.companyId, sanityUser?._id, loadData]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addExperience = () => {
    setSelectedExperiences([...selectedExperiences, {
      experience: '',
      quantity: 1,
      customPrice: undefined,
      notes: '',
    }]);
  };

  const removeExperience = (index: number) => {
    setSelectedExperiences(selectedExperiences.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string | number | undefined) => {
    const updated = [...selectedExperiences];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExperiences(updated);
  };

  const toggleDecisionMaker = (contactId: string) => {
    if (decisionMakers.includes(contactId)) {
      setDecisionMakers(decisionMakers.filter(id => id !== contactId));
    } else {
      setDecisionMakers([...decisionMakers, contactId]);
    }
  };

  const onSubmit = async (data: OpportunityFormData) => {
    if (!sanityUser?.companyId || !sanityUser?._id) {
      showError('Debes tener una empresa configurada');
      return;
    }

    if (!assignedToId) {
      showError('Debes asignar la oportunidad a un usuario');
      return;
    }

    try {
      const validationResult = opportunitySchema.safeParse(data);
      if (!validationResult.success) {
        showError('Por favor, completa todos los campos requeridos correctamente');
        return;
      }

      setIsLoading(true);

      const opportunityData: CreateOpportunityData = {
        name: data.name,
        hostCompany: sanityUser.companyId,
        crmCompany: crmCompanyId || undefined,
        contact: contactId || undefined,
        stage: data.stage as OpportunityStage,
        status: data.status as OpportunityStatus,
        value: data.value,
        currency: data.currency,
        expectedCloseDate: data.expectedCloseDate || undefined,
        description: data.description || undefined,
        source: (data.source as OpportunitySource) || undefined,
        assignedTo: assignedToId,
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        experiences: selectedExperiences.length > 0 ? selectedExperiences.filter(exp => exp.experience).map(exp => ({
          experience: exp.experience,
          quantity: exp.quantity,
          customPrice: exp.customPrice,
          notes: exp.notes || undefined,
        })) : undefined,
        decisionMakers: decisionMakers.length > 0 ? decisionMakers : undefined,
        isActive: true,
        createdBy: sanityUser._id,
      };

      await createOpportunity(opportunityData);
      showSuccess('Oportunidad creada correctamente');
      router.push('/dashboard/crm/oportunidades');
    } catch (error) {
      console.error('Error creating opportunity:', error);
      showError('Error al crear la oportunidad');
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
              Debes tener una empresa configurada para crear oportunidades CRM.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoadingData) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando datos..." />
      </ProtectedRoute>
    );
  }

  const formatCurrency = (value: number | undefined, currency: 'COP' | 'USD' = 'COP') => {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {isLoading && <Loader message="Creando oportunidad..." />}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/oportunidades')}
              className="mr-4"
            >
              <HiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Nueva Oportunidad
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Completa la información de la oportunidad
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
              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre de la Oportunidad *</Label>
                <TextInput
                  id="name"
                  {...register('name')}
                  placeholder="Ej: Clase de Cocina para Empresa XYZ"
                  className="mt-1"
                  color={errors.name ? 'failure' : undefined}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  placeholder="Describe la oportunidad..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="stage">Etapa del Pipeline *</Label>
                <Select
                  id="stage"
                  {...register('stage')}
                  className="mt-1"
                >
                  {stageOptions.map(stage => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
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

          {/* Empresa y Contacto */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Empresa y Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crmCompany">Empresa CRM</Label>
                <Select
                  id="crmCompany"
                  value={crmCompanyId}
                  onChange={(e) => setCrmCompanyId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Seleccionar empresa...</option>
                  {crmCompanies.map(company => (
                    <option key={company._id} value={company._id}>
                      {company.companyName}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="contact">Contacto Principal</Label>
                <Select
                  id="contact"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Seleccionar contacto...</option>
                  {contacts.map(contact => (
                    <option key={contact._id} value={contact._id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Valor y Fechas */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Valor y Fechas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Valor de la Oportunidad</Label>
                <TextInput
                  id="value"
                  type="number"
                  min="0"
                  step="1"
                  {...register('value', { valueAsNumber: true })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="currency">Moneda *</Label>
                <Select
                  id="currency"
                  {...register('currency')}
                  className="mt-1"
                >
                  <option value="COP">Peso Colombiano (COP)</option>
                  <option value="USD">Dólar Americano (USD)</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedCloseDate">Fecha de Cierre Esperada</Label>
                <TextInput
                  id="expectedCloseDate"
                  type="date"
                  {...register('expectedCloseDate')}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Experiencias */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Experiencias
              </h2>
              <Button
                type="button"
                size="sm"
                color="gray"
                onClick={addExperience}
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Agregar Experiencia
              </Button>
            </div>
            
            {selectedExperiences.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay experiencias agregadas. Haz clic en &quot;Agregar Experiencia&quot; para comenzar.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedExperiences.map((expItem, index) => {
                  const selectedExp = experiences.find(e => e._id === expItem.experience);
                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          Experiencia {index + 1}
                        </h3>
                        <Button
                          type="button"
                          size="xs"
                          color="failure"
                          onClick={() => removeExperience(index)}
                        >
                          <HiX className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`exp-${index}-experience`}>Experiencia *</Label>
                          <Select
                            id={`exp-${index}-experience`}
                            value={expItem.experience}
                            onChange={(e) => updateExperience(index, 'experience', e.target.value)}
                            className="mt-1"
                          >
                            <option value="">Seleccionar experiencia...</option>
                            {experiences.map(exp => (
                              <option key={exp._id} value={exp._id}>
                                {exp.title} - ${exp.basePrice.toLocaleString()} {exp.currency}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`exp-${index}-quantity`}>Cantidad de Participantes *</Label>
                          <TextInput
                            id={`exp-${index}-quantity`}
                            type="number"
                            min="1"
                            value={expItem.quantity}
                            onChange={(e) => updateExperience(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`exp-${index}-customPrice`}>Precio Personalizado (opcional)</Label>
                          <TextInput
                            id={`exp-${index}-customPrice`}
                            type="number"
                            min="0"
                            step="1"
                            value={expItem.customPrice || ''}
                            onChange={(e) => updateExperience(index, 'customPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder={selectedExp ? formatCurrency(selectedExp.basePrice, selectedExp.currency) : 'Precio base'}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label htmlFor={`exp-${index}-notes`}>Notas</Label>
                        <Textarea
                          id={`exp-${index}-notes`}
                          rows={2}
                          value={expItem.notes || ''}
                          onChange={(e) => updateExperience(index, 'notes', e.target.value)}
                          placeholder="Notas específicas sobre esta experiencia..."
                          className="mt-1"
                        />
                      </div>

                      {selectedExp && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <p>
                            Precio base: {formatCurrency(selectedExp.basePrice, selectedExp.currency)} por persona
                            {expItem.customPrice && ` • Precio personalizado: ${formatCurrency(expItem.customPrice, selectedExp.currency)}`}
                          </p>
                          {expItem.customPrice && (
                            <p className="font-semibold text-[#F26726] mt-1">
                              Total: {formatCurrency(expItem.customPrice * expItem.quantity, selectedExp.currency)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Tomadores de Decisión */}
          {contacts.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Tomadores de Decisión
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.map(contact => (
                  <label key={contact._id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={decisionMakers.includes(contact._id)}
                      onChange={() => toggleDecisionMaker(contact._id)}
                      className="w-4 h-4 text-[#F26726] rounded focus:ring-[#F26726]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {contact.firstName} {contact.lastName}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )}

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
                placeholder="Notas adicionales sobre la oportunidad..."
                className="mt-1"
              />
            </div>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-4">
            <Button
              color="gray"
              onClick={() => router.push('/dashboard/crm/oportunidades')}
            >
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isLoading}>
              <HiSave className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Oportunidad'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}

