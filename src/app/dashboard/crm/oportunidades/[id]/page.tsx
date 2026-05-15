"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Badge, Card } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiPencilAlt,
  HiTrash,
  HiUser,
  HiCalendar,
  HiTag,
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
} from 'react-icons/hi';
import { useRouter, useParams } from 'next/navigation';
import { getOpportunityById, deleteOpportunity } from '@/lib/sanity/opportunityService';
import { Opportunity } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

// Tipo extendido para oportunidad con propiedades expandidas
type OpportunityWithExpanded = Opportunity & {
  crmCompanyName?: string;
  contactName?: string;
  assignedToName?: string;
  createdByName?: string;
};

const statusColors: Record<string, string> = {
  open: 'info',
  won: 'success',
  lost: 'failure',
  paused: 'warning',
};

const stageLabels: Record<string, string> = {
  prospecting: 'Prospección',
  qualification: 'Calificación',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  approval: 'Aprobación',
  closed_won: 'Cerrado Ganado',
  closed_lost: 'Cerrado Perdido',
};

const sourceLabels: Record<string, string> = {
  web: 'Web',
  referral: 'Referido',
  social: 'Redes Sociales',
  email: 'Email Marketing',
  event: 'Evento',
  cold_call: 'Llamada Fría',
  existing_contact: 'Contacto Existente',
  other: 'Otro',
};

const lostReasonLabels: Record<string, string> = {
  price: 'Precio',
  competition: 'Competencia',
  no_budget: 'No hay Presupuesto',
  no_need: 'No hay Necesidad',
  timing: 'Timing Incorrecto',
  other: 'Otro',
};

const wonReasonLabels: Record<string, string> = {
  best_price: 'Mejor Precio',
  best_proposal: 'Mejor Propuesta',
  existing_relationship: 'Relación Existente',
  best_product: 'Mejor Producto/Servicio',
  other: 'Otro',
};

export default function OportunidadDetailPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const opportunityId = params.id as string;
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [opportunity, setOpportunity] = useState<OpportunityWithExpanded | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (opportunityId) {
      loadOpportunity();
    }
  }, [opportunityId]);

  const loadOpportunity = async () => {
    setIsLoading(true);
    try {
      const data = await getOpportunityById(opportunityId);
      if (!data) {
        showError('Oportunidad no encontrada');
        router.push('/dashboard/crm/oportunidades');
        return;
      }
      setOpportunity(data as OpportunityWithExpanded);
    } catch (error) {
      console.error('Error loading opportunity:', error);
      showError('Error al cargar la oportunidad');
      router.push('/dashboard/crm/oportunidades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;

    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará la oportunidad "${opportunity.name}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteOpportunity(opportunity._id);
        showSuccess('Oportunidad eliminada correctamente');
        router.push('/dashboard/crm/oportunidades');
      } catch (error) {
        console.error('Error deleting opportunity:', error);
        showError('Error al eliminar la oportunidad');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatCurrency = (value: number | undefined, currency: 'COP' | 'USD' = 'COP') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <Loader message="Cargando oportunidad..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (!opportunity) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Oportunidad no encontrada.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <div className="flex items-start gap-3">
              <Button
                color="gray"
                onClick={() => router.push('/dashboard/crm/oportunidades')}
              >
                <HiArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {opportunity.name}
                  </h1>
                  <Badge color={statusColors[opportunity.status] || 'gray'}>
                    {opportunity.status === 'open' && 'Abierta'}
                    {opportunity.status === 'won' && (
                      <span className="flex items-center">
                        <HiCheckCircle className="w-3 h-3 mr-1" />
                        Ganada
                      </span>
                    )}
                    {opportunity.status === 'lost' && (
                      <span className="flex items-center">
                        <HiXCircle className="w-3 h-3 mr-1" />
                        Perdida
                      </span>
                    )}
                    {opportunity.status === 'paused' && 'En Pausa'}
                  </Badge>
                  <Badge color="info">
                    {stageLabels[opportunity.stage] || opportunity.stage}
                  </Badge>
                </div>
                {opportunity.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {opportunity.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                color="primary"
                onClick={() => router.push(`/dashboard/crm/oportunidades/${opportunity._id}/editar`)}
              >
                <HiPencilAlt className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                color="failure"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <HiTrash className="w-4 h-4 mr-2" />
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información General */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Información General
              </h2>
              <div className="space-y-4">
                {opportunity.crmCompanyName && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresa CRM</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {opportunity.crmCompanyName}
                    </p>
                  </div>
                )}
                {opportunity.contactName && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiUser className="w-4 h-4 mr-2" />
                      Contacto Principal
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {opportunity.contactName}
                    </p>
                  </div>
                )}
                {opportunity.assignedToName && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Asignado a</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {opportunity.assignedToName}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Experiencias */}
            {opportunity.experiences && opportunity.experiences.length > 0 && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Experiencias
                </h2>
                <div className="space-y-4">
                  {opportunity.experiences.map((exp, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Experiencia {index + 1}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Cantidad de Participantes</p>
                          <p className="text-gray-900 dark:text-gray-100 mt-1">
                            {exp.quantity}
                          </p>
                        </div>
                        {exp.customPrice !== undefined && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Precio Personalizado</p>
                            <p className="text-gray-900 dark:text-gray-100 mt-1 font-semibold">
                              {formatCurrency(exp.customPrice, opportunity.currency)}
                            </p>
                          </div>
                        )}
                      </div>
                      {exp.notes && (
                        <div className="mt-3">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Notas</p>
                          <p className="text-gray-900 dark:text-gray-100 text-sm mt-1">
                            {exp.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notas */}
            {opportunity.notes && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Notas
                </h2>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {opportunity.notes}
                </p>
              </Card>
            )}

            {/* Razón de Pérdida/Ganancia */}
            {opportunity.status === 'lost' && opportunity.lostReason && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Razón de Pérdida
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Razón</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {lostReasonLabels[opportunity.lostReason] || opportunity.lostReason}
                    </p>
                  </div>
                  {opportunity.lostReasonNotes && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                        {opportunity.lostReasonNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {opportunity.status === 'won' && opportunity.wonReason && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Razón de Ganancia
                </h2>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Razón</p>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {wonReasonLabels[opportunity.wonReason] || opportunity.wonReason}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Columna Lateral */}
          <div className="space-y-6">
            {/* Valor y Estado */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Valor y Estado
              </h2>
              <div className="space-y-4">
                {opportunity.value !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiCurrencyDollar className="w-4 h-4 mr-2" />
                      Valor de la Oportunidad
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1 text-xl font-bold">
                      {formatCurrency(opportunity.value, opportunity.currency)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
                  <Badge color={statusColors[opportunity.status] || 'gray'} className="mt-2">
                    {opportunity.status === 'open' && 'Abierta'}
                    {opportunity.status === 'won' && 'Ganada'}
                    {opportunity.status === 'lost' && 'Perdida'}
                    {opportunity.status === 'paused' && 'En Pausa'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Etapa</p>
                  <Badge color="info" className="mt-2">
                    {stageLabels[opportunity.stage] || opportunity.stage}
                  </Badge>
                </div>
                {opportunity.source && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Origen</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {sourceLabels[opportunity.source] || opportunity.source}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Etiquetas */}
            {opportunity.tags && opportunity.tags.length > 0 && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  <HiTag className="w-5 h-5 inline mr-2" />
                  Etiquetas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {opportunity.tags.map((tag, index) => (
                    <Badge key={index} color="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Fechas Importantes */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                <HiCalendar className="w-5 h-5 inline mr-2" />
                Fechas Importantes
              </h2>
              <div className="space-y-4">
                {opportunity.expectedCloseDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Fecha de Cierre Esperada
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(opportunity.expectedCloseDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {opportunity.actualCloseDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Fecha de Cierre Real
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(opportunity.actualCloseDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Creación</p>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {new Date(opportunity.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {opportunity.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Actualización</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(opportunity.updatedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

