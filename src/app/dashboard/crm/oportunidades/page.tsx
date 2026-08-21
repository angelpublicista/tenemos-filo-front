"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Label, TextInput, Select, Badge, Card, Dropdown, DropdownItem } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiPlus, 
  HiSearch, 
  HiPencilAlt, 
  HiEye,
  HiTrash,
  HiCurrencyDollar,
  HiCalendar,
  HiUser,
  HiDownload,
  HiCheckCircle,
  HiXCircle,
} from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { getOpportunitiesByHost, deleteOpportunity } from '@/lib/sanity/opportunityService';
import { Opportunity, OpportunityFilters } from '@/types';
import { SkeletonTableRow } from '@/components/Skeleton';
import { useSweetAlert } from '@/hooks/useSweetAlert';

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

export default function OportunidadesPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [opportunities, setOpportunities] = useState<OpportunityWithExpanded[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (sanityUser?.companyId) {
      loadOpportunities();
    }
  }, [sanityUser?.companyId, searchQuery, filters]);

  const loadOpportunities = async () => {
    if (!sanityUser?.companyId) return;

    setIsLoading(true);
    try {
      const data = await getOpportunitiesByHost(sanityUser.companyId, {
        query: searchQuery || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setOpportunities(data);
    } catch (error) {
      console.error('Error loading opportunities:', error);
      showError('Error al cargar las oportunidades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (opportunityId: string, opportunityName: string) => {
    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará la oportunidad "${opportunityName}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(opportunityId);
      try {
        await deleteOpportunity(opportunityId);
        showSuccess('Oportunidad eliminada correctamente');
        loadOpportunities();
      } catch (error) {
        console.error('Error deleting opportunity:', error);
        showError('Error al eliminar la oportunidad');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleFilterChange = (key: keyof OpportunityFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const formatCurrency = (value: number | undefined, currency: 'COP' | 'USD' = 'COP') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!sanityUser?.companyId) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Debes tener una empresa configurada para gestionar oportunidades CRM.
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
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                color="gray"
                onClick={() => router.push('/dashboard/crm')}
              >
                <HiArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Oportunidades CRM
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestiona tu pipeline de oportunidades de negocio
                </p>
              </div>
            </div>
            <Button
              color="primary"
              onClick={() => router.push('/dashboard/crm/oportunidades/crear')}
              className="w-full sm:w-auto"
            >
              <HiPlus className="w-4 h-4 mr-2" />
              Nueva Oportunidad
            </Button>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <TextInput
                id="search"
                type="text"
                placeholder="Buscar por nombre, descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={HiSearch}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                id="status"
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1"
              >
                <option value="all">Todos</option>
                <option value="open">Abierta</option>
                <option value="won">Ganada</option>
                <option value="lost">Perdida</option>
                <option value="paused">En Pausa</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage">Etapa</Label>
              <Select
                id="stage"
                value={filters.stage || 'all'}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="mt-1"
              >
                <option value="all">Todas</option>
                <option value="prospecting">Prospección</option>
                <option value="qualification">Calificación</option>
                <option value="proposal">Propuesta</option>
                <option value="negotiation">Negociación</option>
                <option value="approval">Aprobación</option>
                <option value="closed_won">Cerrado Ganado</option>
                <option value="closed_lost">Cerrado Perdido</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tabla de Oportunidades */}
        {isLoading ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            {opportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No se encontraron oportunidades.
                </p>
                <Button
                  color="primary"
                  onClick={() => router.push('/dashboard/crm/oportunidades/crear')}
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Crear Primera Oportunidad
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">Oportunidad</th>
                      <th scope="col" className="px-6 py-3">Empresa/Contacto</th>
                      <th scope="col" className="px-6 py-3">Etapa</th>
                      <th scope="col" className="px-6 py-3">Valor</th>
                      <th scope="col" className="px-6 py-3">Estado</th>
                      <th scope="col" className="px-6 py-3">Fecha Cierre Esperada</th>
                      <th scope="col" className="px-6 py-3">Asignado a</th>
                      <th scope="col" className="px-6 py-3 sticky right-0 bg-gray-50 border-l border-gray-200 dark:bg-gray-700 dark:border-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((opportunity) => (
                      <tr key={opportunity._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div>
                            <div className="font-semibold">{opportunity.name}</div>
                            {opportunity.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {opportunity.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {opportunity.crmCompanyName && (
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {opportunity.crmCompanyName}
                              </div>
                            )}
                            {opportunity.contactName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <HiUser className="w-3 h-3 inline mr-1" />
                                {opportunity.contactName}
                              </div>
                            )}
                            {!opportunity.crmCompanyName && !opportunity.contactName && (
                              <span className="text-xs text-gray-400">Sin empresa/contacto</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color="info" className="text-xs">
                            {stageLabels[opportunity.stage] || opportunity.stage}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {opportunity.value ? (
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(opportunity.value, opportunity.currency)}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin valor</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
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
                        </td>
                        <td className="px-6 py-4">
                          {opportunity.expectedCloseDate ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(opportunity.expectedCloseDate).toLocaleDateString('es-ES')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Sin fecha</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {opportunity.assignedToName || 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-6 py-4 sticky right-0 bg-white border-l border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/oportunidades/${opportunity._id}`)}
                            >
                              <HiEye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/oportunidades/${opportunity._id}/editar`)}
                            >
                              <HiPencilAlt className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="danger"
                              onClick={() => handleDelete(opportunity._id, opportunity.name)}
                              disabled={isDeleting === opportunity._id}
                            >
                              <HiTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

