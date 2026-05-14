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
  HiMail,
  HiPhone,
  HiGlobe,
  HiLocationMarker,
  HiDownload
} from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { getCRMCompaniesByHost, deleteCRMCompany } from '@/lib/sanity/crmCompanyService';
import { CRMCompany, CRMCompanyFilters } from '@/types';
import { SkeletonTableRow } from '@/components/Skeleton';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { exportCompaniesToExcel, exportCompaniesToCSV } from '@/utils/exportUtils';

const statusColors: Record<string, string> = {
  active: 'success',
  inactive: 'gray',
  qualified: 'info',
  unqualified: 'warning',
  closed: 'failure',
};

const companyTypeLabels: Record<string, string> = {
  customer: 'Cliente',
  supplier: 'Proveedor',
  other: 'Otro',
};

export default function EmpresasPage() {
  const { user, sanityUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CRMCompanyFilters>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (sanityUser?.companyId) {
      loadCompanies();
    }
  }, [sanityUser?.companyId, searchQuery, filters]);

  const loadCompanies = async () => {
    if (!sanityUser?.companyId) return;

    setIsLoading(true);
    try {
      const data = await getCRMCompaniesByHost(sanityUser.companyId, {
        query: searchQuery || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      showError('Error al cargar las empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (companyId: string, companyName: string) => {
    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará la empresa "${companyName}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(companyId);
      try {
        await deleteCRMCompany(companyId);
        showSuccess('Empresa eliminada correctamente');
        loadCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
        showError('Error al eliminar la empresa');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleFilterChange = (key: keyof CRMCompanyFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleExportExcel = () => {
    if (companies.length === 0) {
      showError('No hay empresas para exportar');
      return;
    }
    setIsExporting(true);
    try {
      exportCompaniesToExcel(companies, 'empresas_crm');
      showSuccess('Empresas exportadas a Excel correctamente');
    } catch (error) {
      console.error('Error exporting companies:', error);
      showError('Error al exportar las empresas');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (companies.length === 0) {
      showError('No hay empresas para exportar');
      return;
    }
    setIsExporting(true);
    try {
      exportCompaniesToCSV(companies, 'empresas_crm');
      showSuccess('Empresas exportadas a CSV correctamente');
    } catch (error) {
      console.error('Error exporting companies:', error);
      showError('Error al exportar las empresas');
    } finally {
      setIsExporting(false);
    }
  };

  if (!sanityUser?.companyId) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Debes tener una empresa configurada para gestionar empresas CRM.
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
                  Empresas CRM
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestiona tu base de datos de empresas
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {companies.length > 0 && (
                <Dropdown
                  label=""
                  renderTrigger={() => (
                    <Button
                      color="gray"
                      disabled={isExporting}
                    >
                      <HiDownload className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exportando...' : 'Exportar'}
                    </Button>
                  )}
                  placement="bottom-end"
                >
                  <DropdownItem onClick={handleExportExcel} disabled={isExporting}>
                    Exportar a Excel (.xlsx)
                  </DropdownItem>
                  <DropdownItem onClick={handleExportCSV} disabled={isExporting}>
                    Exportar a CSV (.csv)
                  </DropdownItem>
                </Dropdown>
              )}
              <Button
                color="primary"
                onClick={() => router.push('/dashboard/crm/empresas/crear')}
              >
                <HiPlus className="w-4 h-4 mr-2" />
                Nueva Empresa
              </Button>
            </div>
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
                placeholder="Buscar por nombre, email, teléfono..."
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
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="qualified">Calificado</option>
                <option value="unqualified">No Calificado</option>
                <option value="closed">Cerrado</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="companyType">Tipo</Label>
              <Select
                id="companyType"
                value={filters.companyType || 'all'}
                onChange={(e) => handleFilterChange('companyType', e.target.value)}
                className="mt-1"
              >
                <option value="all">Todos</option>
                <option value="customer">Cliente</option>
                <option value="supplier">Proveedor</option>
                <option value="other">Otro</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tabla de Empresas */}
        {isLoading ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            {companies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No se encontraron empresas.
                </p>
                <Button
                  color="primary"
                  onClick={() => router.push('/dashboard/crm/empresas/crear')}
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Crear Primera Empresa
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">Empresa</th>
                      <th scope="col" className="px-6 py-3">Tipo</th>
                      <th scope="col" className="px-6 py-3">Contacto</th>
                      <th scope="col" className="px-6 py-3">Estado</th>
                      <th scope="col" className="px-6 py-3">Último Contacto</th>
                      <th scope="col" className="px-6 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div>
                            <div className="font-semibold">{company.companyName}</div>
                            {company.businessName && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {company.businessName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color="info">
                            {companyTypeLabels[company.companyType] || company.companyType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {company.email && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <HiMail className="w-4 h-4 mr-1" />
                                {company.email}
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <HiPhone className="w-4 h-4 mr-1" />
                                {company.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge color={statusColors[company.status] || 'gray'}>
                            {company.status === 'active' && 'Activo'}
                            {company.status === 'inactive' && 'Inactivo'}
                            {company.status === 'qualified' && 'Calificado'}
                            {company.status === 'unqualified' && 'No Calificado'}
                            {company.status === 'closed' && 'Cerrado'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {company.lastContactDate ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(company.lastContactDate).toLocaleDateString('es-ES')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Nunca</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/empresas/${company._id}`)}
                            >
                              <HiEye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => router.push(`/dashboard/crm/empresas/${company._id}/editar`)}
                            >
                              <HiPencilAlt className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => handleDelete(company._id, company.companyName)}
                              disabled={isDeleting === company._id}
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

