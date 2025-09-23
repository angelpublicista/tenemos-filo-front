"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getCompanyByUserId } from '@/lib/sanity/companyService';
import { Company } from '@/types';
import { Button } from 'flowbite-react';
import { 
  HiPencilAlt, 
  HiCheckCircle, 
  HiExclamationCircle
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from './Loader';

interface CompanyInfoViewProps {
  showEditButton?: boolean;
  onEdit?: () => void;
  className?: string;
}

export default function CompanyInfoView({ 
  showEditButton = true, 
  onEdit,
  className = ""
}: CompanyInfoViewProps) {
  const router = useRouter();
  const { user, hasCompany } = useAuth();
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { showError } = useSweetAlert();

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user || !hasCompany()) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);
        const companyData = await getCompanyByUserId(user.uid);
        setExistingCompany(companyData);
      } catch (error) {
        console.error('Error loading company data:', error);
        showError('Error al cargar la información de la empresa');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCompanyData();
  }, [user, hasCompany, showError]);

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      // Redirigir al company-setup para editar usando Next.js router
      router.push('/company-setup');
    }
  };

  if (isLoadingData) {
    return <Loader message="Cargando información de la empresa..." className={className} />;
  }

  if (!hasCompany() || !existingCompany) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center ${className}`}>
        <div className="mb-4">
          <HiExclamationCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
            No hay información de empresa
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Aún no has completado la configuración de tu empresa. 
            Completa el registro para acceder a todas las funcionalidades.
          </p>
        </div>
        <Button
          color="warning"
          onClick={() => router.push('/company-setup')}
          className="px-8 py-3"
        >
          Completar Registro de Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-[#334C5D] mb-2">
            {existingCompany.companyName}
          </h3>
          <div className="flex items-center text-green-600">
            <HiCheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Configuración completada</span>
          </div>
        </div>
        {showEditButton && (
          <Button
            color="gray"
            onClick={handleEdit}
            className="px-6 py-2"
          >
            <HiPencilAlt className="w-4 h-4 mr-2" />
            Editar Información
          </Button>
        )}
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Información Básica */}
        <div className="space-y-6">
          <h4 className="text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información Básica
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Nombre de la Empresa
              </label>
              <p className="text-gray-900 font-medium text-lg">
                {existingCompany.companyName}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Tipo de Empresa
              </label>
              <p className="text-gray-900">
                {existingCompany.companyType === 'restaurant' && 'Restaurante'}
                {existingCompany.companyType === 'catering' && 'Catering'}
                {existingCompany.companyType === 'foodtruck' && 'Food Truck'}
                {existingCompany.companyType === 'other' && 'Otro'}
              </p>
            </div>

            {existingCompany.description && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Descripción
                </label>
                <p className="text-gray-900">{existingCompany.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Email
              </label>
              <p className="text-gray-900">{existingCompany.companyEmail}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Teléfono
              </label>
              <p className="text-gray-900">{existingCompany.companyPhone}</p>
            </div>

            {existingCompany.website && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Sitio Web
                </label>
                <p className="text-gray-900">
                  <a 
                    href={existingCompany.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#F26726] hover:text-[#F26726]/80 underline"
                  >
                    {existingCompany.website}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Información Fiscal */}
        <div className="space-y-6">
          <h4 className="text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información Fiscal
          </h4>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Tipo de Documento
              </label>
              <p className="text-gray-900">
                {existingCompany.documentType === 'nit' && 'NIT'}
                {existingCompany.documentType === 'cedula' && 'Cédula'}
                {existingCompany.documentType === 'pasaporte' && 'Pasaporte'}
                {existingCompany.documentType === 'other' && 'Otro'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">
                Número de Documento
              </label>
              <p className="text-gray-900">{existingCompany.documentNumber}</p>
            </div>

            {existingCompany.businessName && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Razón Social
                </label>
                <p className="text-gray-900">{existingCompany.businessName}</p>
              </div>
            )}

            {/* Dirección */}
            {existingCompany.address && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Dirección
                </label>
                <p className="text-gray-900">
                  {existingCompany.address.street && `${existingCompany.address.street}, `}
                  {existingCompany.address.city && `${existingCompany.address.city}, `}
                  {existingCompany.address.state && `${existingCompany.address.state}, `}
                  {existingCompany.address.country}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Información Empresarial */}
        <div className="space-y-6 lg:col-span-2">
          <h4 className="text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información Empresarial
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-500 block mb-2">
                Número de Empleados
              </label>
              <p className="text-gray-900 font-semibold text-lg">
                {existingCompany.employeeCount === '1-10' && '1-10 empleados'}
                {existingCompany.employeeCount === '11-50' && '11-50 empleados'}
                {existingCompany.employeeCount === '51-200' && '51-200 empleados'}
                {existingCompany.employeeCount === '201-500' && '201-500 empleados'}
                {existingCompany.employeeCount === '500+' && 'Más de 500 empleados'}
              </p>
            </div>

            {existingCompany.annualRevenue && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Ingresos Anuales
                </label>
                <p className="text-gray-900 font-semibold text-lg">
                  {existingCompany.annualRevenue === '0-100k' && '$0 - $100,000'}
                  {existingCompany.annualRevenue === '100k-500k' && '$100,000 - $500,000'}
                  {existingCompany.annualRevenue === '500k-1M' && '$500,000 - $1,000,000'}
                  {existingCompany.annualRevenue === '1M-5M' && '$1,000,000 - $5,000,000'}
                  {existingCompany.annualRevenue === '5M+' && 'Más de $5,000,000'}
                </p>
              </div>
            )}

            {existingCompany.businessYears && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Años en el Negocio
                </label>
                <p className="text-gray-900 font-semibold text-lg">
                  {existingCompany.businessYears === '0-1' && 'Menos de 1 año'}
                  {existingCompany.businessYears === '1-3' && '1-3 años'}
                  {existingCompany.businessYears === '3-5' && '3-5 años'}
                  {existingCompany.businessYears === '5-10' && '5-10 años'}
                  {existingCompany.businessYears === '10+' && 'Más de 10 años'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <p>
            Última actualización: {new Date(existingCompany.updatedAt).toLocaleDateString('es-ES')}
          </p>
          <p>
            ID de empresa: {existingCompany._id}
          </p>
        </div>
      </div>
    </div>
  );
}
