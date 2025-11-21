"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Badge, Card } from 'flowbite-react';
import { 
  HiArrowLeft, 
  HiPencilAlt,
  HiTrash,
  HiMail,
  HiPhone,
  HiGlobe,
  HiLocationMarker,
  HiCalendar,
  HiTag
} from 'react-icons/hi';
import { useRouter, useParams } from 'next/navigation';
import { getCRMCompanyById, deleteCRMCompany } from '@/lib/sanity/crmCompanyService';
import { CRMCompany } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

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

const sourceLabels: Record<string, string> = {
  web: 'Web',
  referral: 'Referido',
  social: 'Redes Sociales',
  email: 'Email Marketing',
  event: 'Evento',
  cold_call: 'Llamada Fría',
  other: 'Otro',
};

const industryLabels: Record<string, string> = {
  restaurants: 'Restaurantes y Bares',
  hospitality: 'Hotelería',
  events: 'Eventos y Catering',
  retail: 'Retail y Comercio',
  technology: 'Tecnología',
  services: 'Servicios Profesionales',
  manufacturing: 'Manufactura',
  construction: 'Construcción',
  healthcare: 'Salud y Bienestar',
  education: 'Educación',
  finance: 'Finanzas y Banca',
  real_estate: 'Inmobiliaria',
  transport: 'Transporte y Logística',
  media: 'Medios y Comunicación',
  energy: 'Energía y Utilities',
  agriculture: 'Agricultura y Agroindustria',
  tourism: 'Turismo y Viajes',
  sports: 'Deportes y Entretenimiento',
  fashion: 'Moda y Textiles',
  automotive: 'Automotriz',
  pharmaceutical: 'Farmacéutica',
  consulting: 'Consultoría',
  marketing: 'Marketing y Publicidad',
  legal: 'Legal',
  nonprofit: 'ONG y Sin Fines de Lucro',
  government: 'Gobierno y Sector Público',
  other: 'Otro',
};

export default function EmpresaDetailPage() {
  const { sanityUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [company, setCompany] = useState<CRMCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  const loadCompany = async () => {
    setIsLoading(true);
    try {
      const data = await getCRMCompanyById(companyId);
      if (!data) {
        showError('Empresa no encontrada');
        router.push('/dashboard/crm/empresas');
        return;
      }
      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
      showError('Error al cargar la empresa');
      router.push('/dashboard/crm/empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;

    const confirmed = await showConfirmation(
      '¿Estás seguro?',
      `Esta acción eliminará la empresa "${company.companyName}". Esta acción se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );

    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteCRMCompany(company._id);
        showSuccess('Empresa eliminada correctamente');
        router.push('/dashboard/crm/empresas');
      } catch (error) {
        console.error('Error deleting company:', error);
        showError('Error al eliminar la empresa');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <Loader message="Cargando empresa..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (!company) {
    return (
      <ProtectedRoute>
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Empresa no encontrada.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button
                color="gray"
                onClick={() => router.push('/dashboard/crm/empresas')}
                className="mr-4"
              >
                <HiArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {company.companyName}
                  </h1>
                  <Badge color={statusColors[company.status] || 'gray'}>
                    {company.status === 'active' && 'Activo'}
                    {company.status === 'inactive' && 'Inactivo'}
                    {company.status === 'qualified' && 'Calificado'}
                    {company.status === 'unqualified' && 'No Calificado'}
                    {company.status === 'closed' && 'Cerrado'}
                  </Badge>
                </div>
                {company.businessName && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {company.businessName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                onClick={() => router.push(`/dashboard/crm/empresas/${company._id}/editar`)}
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
            {/* Información Básica */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Información Básica
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Empresa</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {companyTypeLabels[company.companyType] || company.companyType}
                    </p>
                  </div>
                  {company.industry && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Industria</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {industryLabels[company.industry] || company.industry}
                      </p>
                    </div>
                  )}
                </div>
                {company.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Descripción</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {company.description}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Información de Contacto
              </h2>
              <div className="space-y-3">
                {company.email && (
                  <div className="flex items-center">
                    <HiMail className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${company.email}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {company.email}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center">
                    <HiPhone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${company.phone}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {company.phone}
                    </a>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center">
                    <HiGlobe className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Dirección */}
            {company.address && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Dirección
                </h2>
                <div className="space-y-2">
                  {company.address.street && (
                    <div className="flex items-start">
                      <HiLocationMarker className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-gray-900 dark:text-gray-100">
                          {company.address.street}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {[
                            company.address.city,
                            company.address.state,
                            company.address.postalCode,
                            company.address.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Información Fiscal */}
            {(company.documentType || company.documentNumber) && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Información Fiscal
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {company.documentType && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Documento</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1 capitalize">
                        {company.documentType}
                      </p>
                    </div>
                  )}
                  {company.documentNumber && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Número de Documento</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {company.documentNumber}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Información Adicional */}
            {(company.employeeCount || company.annualRevenue) && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Información Adicional
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {company.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Número de Empleados</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {company.employeeCount}
                      </p>
                    </div>
                  )}
                  {company.annualRevenue && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos Anuales</p>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {company.annualRevenue}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Redes Sociales */}
            {company.socialMedia && (
              (company.socialMedia.linkedin || 
               company.socialMedia.twitter || 
               company.socialMedia.facebook || 
               company.socialMedia.instagram) && (
                <Card>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Redes Sociales
                  </h2>
                  <div className="space-y-3">
                    {company.socialMedia.linkedin && (
                      <div>
                        <a
                          href={company.socialMedia.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {company.socialMedia.twitter && (
                      <div>
                        <a
                          href={company.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Twitter/X
                        </a>
                      </div>
                    )}
                    {company.socialMedia.facebook && (
                      <div>
                        <a
                          href={company.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Facebook
                        </a>
                      </div>
                    )}
                    {company.socialMedia.instagram && (
                      <div>
                        <a
                          href={company.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 dark:text-gray-100 hover:text-[#F26726]"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              )
            )}

            {/* Notas */}
            {company.notes && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Notas
                </h2>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {company.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Columna Lateral */}
          <div className="space-y-6">
            {/* Estado y Origen */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Estado y Origen
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
                  <Badge color={statusColors[company.status] || 'gray'} className="mt-2">
                    {company.status === 'active' && 'Activo'}
                    {company.status === 'inactive' && 'Inactivo'}
                    {company.status === 'qualified' && 'Calificado'}
                    {company.status === 'unqualified' && 'No Calificado'}
                    {company.status === 'closed' && 'Cerrado'}
                  </Badge>
                </div>
                {company.source && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Origen</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {sourceLabels[company.source] || company.source}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Etiquetas */}
            {company.tags && company.tags.length > 0 && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Etiquetas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((tag, index) => (
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
                Fechas Importantes
              </h2>
              <div className="space-y-4">
                {company.lastContactDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiCalendar className="w-4 h-4 mr-2" />
                      Último Contacto
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(company.lastContactDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {company.nextFollowUp && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <HiCalendar className="w-4 h-4 mr-2" />
                      Próximo Seguimiento
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(company.nextFollowUp).toLocaleDateString('es-ES', {
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
                    {new Date(company.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {company.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Actualización</p>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(company.updatedAt).toLocaleDateString('es-ES', {
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

