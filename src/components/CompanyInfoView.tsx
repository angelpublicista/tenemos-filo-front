"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCompanyByUserId, updateCompanyInSanity } from '@/lib/sanity/companyService';
import { uploadImage } from '@/lib/api/uploads';
import { Company } from '@/types';
import { Button } from 'flowbite-react';
import {
  HiPencilAlt,
  HiCheckCircle,
  HiExclamationCircle,
  HiPhotograph,
  HiUpload,
  HiTrash,
} from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from './Loader';
import { urlDeImagen } from '@/lib/images';


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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { showError, showSuccess, showDestructiveConfirmation } = useSweetAlert();

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

  const handleLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !existingCompany) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Selecciona un archivo de imagen válido');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('La imagen no puede superar 10 MB');
      return;
    }

    setIsUploadingLogo(true);
    setLogoError(null);
    try {
      const url = await uploadImage(file, 'logos');
      await updateCompanyInSanity(existingCompany._id, { logo: url });
      setExistingCompany({
        ...existingCompany,
        logo: { asset: { _ref: url, _type: 'reference' } },
        updatedAt: new Date().toISOString(),
      });
      await showSuccess('Logo actualizado', 'El logo se subió correctamente.');
    } catch (err) {
      console.error('Error uploading logo:', err);
      setLogoError('Error al subir el logo. Intenta de nuevo.');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!existingCompany?.logo) return;
    const confirmed = await showDestructiveConfirmation(
      '¿Eliminar logo?',
      'Se quitará el logo actual de la empresa.',
      'Sí, eliminar',
      'Cancelar',
    );
    if (!confirmed) return;

    setIsUploadingLogo(true);
    setLogoError(null);
    try {
      await updateCompanyInSanity(existingCompany._id, { logo: null });
      setExistingCompany({
        ...existingCompany,
        logo: undefined,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error removing logo:', err);
      setLogoError('Error al eliminar el logo. Intenta de nuevo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoadingData) {
    return <Loader message="Cargando información de la empresa..." className={className} />;
  }

  if (!hasCompany() || !existingCompany) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-8 text-center ${className}`}>
        <div className="mb-4">
          <HiExclamationCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#334C5D] mb-2">
            No hay información de empresa
          </h2>
          <p className="text-gray-600 text-base sm:text-lg mb-6">
            Aún no has completado la configuración de tu empresa.
            Completa el registro para acceder a todas las funcionalidades.
          </p>
        </div>
        <Button
          color="warning"
          onClick={() => router.push('/company-setup')}
          className="w-full sm:w-auto"
        >
          Completar Registro de Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {urlDeImagen(existingCompany.logo?.asset?._ref) ? (
                <Image
                  src={urlDeImagen(existingCompany.logo?.asset?._ref)!}
                  alt={`Logo de ${existingCompany.companyName}`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <HiPhotograph className="w-10 h-10 text-gray-400" />
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F26726]" />
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoFile}
              className="hidden"
            />
            {showEditButton && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                aria-label={existingCompany.logo ? 'Cambiar logo' : 'Subir logo'}
                title="Imagen cuadrada · mínimo 400 × 400 px · PNG o JPG hasta 10 MB"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#F26726] hover:bg-[#d9571f] text-white flex items-center justify-center shadow-md disabled:opacity-60"
              >
                <HiUpload className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#334C5D] mb-2 truncate">
              {existingCompany.companyName}
            </h3>
            <div className="flex items-center text-green-600">
              <HiCheckCircle className="w-5 h-5 mr-2 shrink-0" />
              <span className="text-sm font-medium">Configuración completada</span>
            </div>
            {showEditButton && existingCompany.logo && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isUploadingLogo}
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-60"
              >
                <HiTrash className="w-3.5 h-3.5" />
                Quitar logo
              </button>
            )}
          </div>
        </div>
        {showEditButton && (
          <Button
            color="gray"
            onClick={handleEdit}
            className="w-full sm:w-auto"
          >
            <HiPencilAlt className="w-4 h-4 mr-2" />
            Editar Información
          </Button>
        )}
      </div>

      {logoError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-red-600 text-sm flex items-start gap-1.5">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            {logoError}
          </p>
        </div>
      )}

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Información Básica */}
        <div className="space-y-6">
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
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
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
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
          <h4 className="text-lg sm:text-xl font-semibold text-[#334C5D] border-b border-gray-200 pb-3">
            Información Empresarial
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs sm:text-sm text-gray-500 break-all">
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
