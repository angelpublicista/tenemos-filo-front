"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/firebase/AuthContext';
import { createCompanyInSanity, getCompanyByUserId } from '@/lib/sanity/companyService';
import { associateUserWithCompany, markCompanySetupCompleted } from '@/lib/sanity/userService';
import { sanityClient } from '@/lib/sanity/sanityClient';
import { Button, Label, TextInput, Select, Textarea } from 'flowbite-react';
import { HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import { AiOutlineBuild, AiOutlineMail, AiOutlineInfoCircle, AiOutlineIdcard, AiOutlineHome, AiOutlineGlobal, AiOutlineTeam } from 'react-icons/ai';
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import StepIndicator from './StepIndicator';
import { CompleteCompanyData, Company } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import CompanyInfoView from './CompanyInfoView';
import Loader from './Loader';

// Esquemas de validación por pasos
const basicInfoSchema = z.object({
  companyName: z.string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa no puede exceder 100 caracteres'),
  companyType: z.enum(['restaurant', 'catering', 'foodtruck', 'other'], {
    message: 'Selecciona un tipo de empresa válido'
  }),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  companyEmail: z.string()
    .email('Ingresa un email válido')
    .min(5, 'El email debe tener al menos 5 caracteres')
    .max(100, 'El email no puede exceder 100 caracteres'),
});

const fiscalInfoSchema = z.object({
  documentType: z.enum(['nit', 'cedula', 'pasaporte', 'other'], {
    message: 'Selecciona un tipo de documento válido'
  }),
  documentNumber: z.string()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(20, 'El número de documento no puede exceder 20 caracteres')
    .regex(/^[0-9]+$/, 'El número de documento solo puede contener números'),
  businessName: z.string()
    .min(2, 'La razón social debe tener al menos 2 caracteres')
    .max(200, 'La razón social no puede exceder 200 caracteres'),
  website: z.string()
    .url('Ingresa una URL válida')
    .optional()
    .or(z.literal('')),
  address: z.object({
    street: z.string()
      .min(5, 'La dirección debe tener al menos 5 caracteres')
      .max(200, 'La dirección no puede exceder 200 caracteres'),
    city: z.string()
      .min(2, 'La ciudad debe tener al menos 2 caracteres')
      .max(100, 'La ciudad no puede exceder 100 caracteres'),
    state: z.string()
      .max(100, 'El departamento no puede exceder 100 caracteres')
      .optional(),
    postalCode: z.string()
      .max(20, 'El código postal no puede exceder 20 caracteres')
      .optional(),
    country: z.string()
      .min(2, 'El país debe tener al menos 2 caracteres')
      .max(100, 'El país no puede exceder 100 caracteres'),
  }),
});

const sizeInfoSchema = z.object({
  employeeCount: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], {
    message: 'Selecciona un rango de empleados válido'
  }),
  annualRevenue: z.enum(['0-100k', '100k-500k', '500k-1M', '1M-5M', '5M+'], {
    message: 'Selecciona un rango de ingresos válido'
  }).optional(),
  businessYears: z.enum(['0-1', '1-3', '3-5', '5-10', '10+'], {
    message: 'Selecciona un rango de años válido'
  }).optional(),
});

const companyTypes = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'catering', label: 'Catering' },
  { value: 'foodtruck', label: 'Food Truck' },
  { value: 'other', label: 'Otro' }
];

const documentTypes = [
  { value: 'nit', label: 'NIT' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'other', label: 'Otro' }
];

const employeeCounts = [
  { value: '1-10', label: '1-10 empleados' },
  { value: '11-50', label: '11-50 empleados' },
  { value: '51-200', label: '51-200 empleados' },
  { value: '201-500', label: '201-500 empleados' },
  { value: '500+', label: 'Más de 500 empleados' }
];

const annualRevenues = [
  { value: '0-100k', label: '$0 - $100,000' },
  { value: '100k-500k', label: '$100,000 - $500,000' },
  { value: '500k-1M', label: '$500,000 - $1,000,000' },
  { value: '1M-5M', label: '$1,000,000 - $5,000,000' },
  { value: '5M+', label: 'Más de $5,000,000' }
];

const businessYears = [
  { value: '0-1', label: 'Menos de 1 año' },
  { value: '1-3', label: '1-3 años' },
  { value: '3-5', label: '3-5 años' },
  { value: '5-10', label: '5-10 años' },
  { value: '10+', label: 'Más de 10 años' }
];

const steps = ['Información Básica', 'Información Fiscal', 'Tamaño de Empresa'];

export default function CompanySetupForm() {
  const { user, sanityUser, markSetupCompleted, isSetupCompleted, hasCompany, companySetupState } = useAuth();
  const { showSuccess, showError, showConfirmation, showLoading, hideLoading } = useSweetAlert();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyPhone, setCompanyPhone] = useState("");
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const handleCompanyPhoneChange = (value: string) => {
    setCompanyPhone(value);
  };

  // Cargar datos existentes de la empresa
  useEffect(() => {
    const loadExistingCompanyData = async () => {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        const company = await getCompanyByUserId(user.uid);
        if (company) {
          setExistingCompany(company);
          setCompanyPhone(company.companyPhone || '');
        }
      } catch (error) {
        console.error('Error loading existing company data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadExistingCompanyData();
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm<CompleteCompanyData>({
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      companyType: 'restaurant',
      description: '',
      companyEmail: '',
      companyPhone: '',
      documentType: 'nit',
      documentNumber: '',
      businessName: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Colombia'
      },
      employeeCount: '1-10',
      annualRevenue: '0-100k',
      businessYears: '0-1'
    }
  });

  // Actualizar el formulario cuando se carguen los datos existentes
  useEffect(() => {
    if (existingCompany) {
      reset({
        companyName: existingCompany.companyName || '',
        companyType: existingCompany.companyType || 'restaurant',
        description: existingCompany.description || '',
        companyEmail: existingCompany.companyEmail || '',
        companyPhone: existingCompany.companyPhone || '',
        documentType: existingCompany.documentType || 'nit',
        documentNumber: existingCompany.documentNumber || '',
        businessName: existingCompany.businessName || '',
        website: existingCompany.website || '',
        address: {
          street: existingCompany.address?.street || '',
          city: existingCompany.address?.city || '',
          state: existingCompany.address?.state || '',
          postalCode: existingCompany.address?.postalCode || '',
          country: existingCompany.address?.country || 'Colombia'
        },
        employeeCount: existingCompany.employeeCount || '1-10',
        annualRevenue: existingCompany.annualRevenue || '0-100k',
        businessYears: existingCompany.businessYears || '0-1'
      });
    }
  }, [existingCompany, reset]);

  // Si está cargando datos, mostrar indicador de carga
  if (isLoadingData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <Loader message="Cargando datos de empresa..." />
        </div>
      </div>
    );
  }

  // Si el usuario ya completó el setup Y tiene una empresa asociada, mostrar mensaje informativo
  // Solo mostrar mensaje de "completado" si NO hay datos existentes para editar
  const hasCompletedSetup = isSetupCompleted();
  const hasCompanyAssociated = hasCompany();
  
  // Solo mostrar mensaje de "completado" si:
  // 1. El setup está completado
  // 2. Tiene empresa asociada en localStorage
  console.log('Debug localStorage:', {
    hasCompletedSetup,
    hasCompanyAssociated,
    existingCompany: !!existingCompany,
    companySetupState: companySetupState
  });
  
  // Si el usuario ya completó el setup Y tiene empresa asociada, mostrar mensaje de completado
  // PERO solo si NO hay datos existentes para editar
  if (hasCompletedSetup && hasCompanyAssociated && !existingCompany) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mb-6">
          <div className="mb-4">
            <HiCheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
              Configuración Completada
            </h2>
            <p className="text-gray-600 text-lg">
              Ya has completado la configuración de empresa. 
              {sanityUser?.role === 'host' 
                ? ' Puedes crear experiencias desde tu dashboard.'
                : ' Puedes cotizar experiencias desde tu dashboard.'
              }
            </p>
          </div>
          <Button
            color="primary"
            onClick={() => window.location.href = '/dashboard'}
            className="px-8 py-3"
          >
            Ir al Dashboard
          </Button>
        </div>

        {/* Información de la Empresa */}
        <CompanyInfoView 
          showEditButton={true}
          onEdit={() => setCurrentStep(1)}
          className="mt-6"
        />
      </div>
    );
  }

  const nextStep = async () => {
    const currentData = getValues();
    let isValid = false;

    try {
      if (currentStep === 1) {
        // Validar datos básicos + teléfono de empresa
        if (!companyPhone) {
          await showError('Campo requerido', 'El teléfono de la empresa es requerido');
          return;
        }
        basicInfoSchema.parse(currentData);
        isValid = true;
      } else if (currentStep === 2) {
        fiscalInfoSchema.parse(currentData);
        isValid = true;
      } else if (currentStep === 3) {
        // En el paso 3, validar pero no avanzar (el botón cambiará a "Completar Registro")
        sizeInfoSchema.parse(currentData);
        isValid = true;
      }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', error.issues);
          await showError('Campos requeridos', 'Por favor, completa todos los campos requeridos correctamente');
        }
        isValid = false;
      }

    if (isValid && currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const onSubmit = async (data: CompleteCompanyData) => {
    if (!user || !sanityUser) {
      await showError('Error', 'No se encontró información del usuario');
      return;
    }

    showLoading('Registrando empresa...');

    try {
      let company;
      
      if (existingCompany) {
        // Actualizar empresa existente
        const updateData = {
          companyName: data.companyName,
          companyType: data.companyType,
          description: data.description || undefined,
          companyEmail: data.companyEmail,
          companyPhone: companyPhone,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          businessName: data.businessName,
          website: data.website || undefined,
          address: data.address,
          employeeCount: data.employeeCount,
          annualRevenue: data.annualRevenue,
          businessYears: data.businessYears,
          updatedAt: new Date().toISOString()
        };

        // Actualizar la empresa existente
        await sanityClient
          .patch(existingCompany._id)
          .set(updateData)
          .commit();
        
        company = { _id: existingCompany._id };
        
        await showSuccess(
          '¡Empresa actualizada exitosamente!',
          'Tu información de empresa ha sido actualizada correctamente.'
        );
      } else {
        // Crear nueva empresa
        const companyData = {
          companyName: data.companyName,
          companyType: data.companyType,
          description: data.description || undefined,
          companyEmail: data.companyEmail,
          companyPhone: companyPhone,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          businessName: data.businessName,
          website: data.website || undefined,
          address: data.address,
          employeeCount: data.employeeCount,
          annualRevenue: data.annualRevenue,
          businessYears: data.businessYears
        };

        company = await createCompanyInSanity(companyData);
        
        // Asociar la empresa al usuario en Sanity
        await associateUserWithCompany(user.uid, company._id);
        
        await showSuccess(
          '¡Empresa registrada exitosamente!',
          'Tu información de empresa ha sido guardada correctamente.'
        );
      }
      
      // Marcar el setup como completado en localStorage
      markSetupCompleted(company._id);
      
      hideLoading();

      // Redirigir al dashboard
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Error creating company:', error);
      hideLoading();
      await showError(
        'Error al registrar empresa',
        error instanceof Error ? error.message : 'Error al registrar la información de empresa'
      );
    }
  };

  const skipCompanySetup = async () => {
    if (!user || !sanityUser) {
      await showError('Error', 'No se encontró información del usuario');
      return;
    }

    // Mostrar confirmación elegante antes de proceder
    const warningTitle = '¿Saltar configuración de empresa?';
    const warningText = sanityUser.role === 'host' 
      ? 'Recuerda que no podrás crear experiencias hasta completar esta información.'
      : 'Recuerda que no podrás cotizar experiencias hasta completar esta información.';

    const result = await showConfirmation(
      warningTitle,
      warningText,
      'Sí, saltar',
      'Cancelar'
    );
    
    if (!result.isConfirmed) {
      return; // Usuario canceló la acción
    }

    showLoading('Procesando...');

    try {
      // Marcar que el usuario completó el setup (aunque sea saltándolo)
      await markCompanySetupCompleted(user.uid);
      
      // Marcar en localStorage también
      markSetupCompleted();
      
      hideLoading();

      await showSuccess(
        'Configuración saltada',
        sanityUser.role === 'host' 
          ? 'Has saltado la configuración de empresa. Recuerda que no podrás crear experiencias hasta completar esta información.'
          : 'Has saltado la configuración de empresa. Recuerda que no podrás cotizar experiencias hasta completar esta información.'
      );

      // Redirigir al dashboard
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Error skipping company setup:', error);
      hideLoading();
      await showError('Error', 'Error al procesar la solicitud');
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#334C5D] mb-2">Información Básica</h3>
        <p className="text-gray-600">Proporciona los datos básicos de tu empresa</p>
      </div>
      
      {/* Nombre de la Empresa */}
      <div>
        <Label color="gray" className="mb-2 block">
          Nombre de la empresa <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="companyName"
          type="text"
          placeholder="Ej: Restaurante El Bueno"
          icon={AiOutlineBuild}
          color={errors.companyName ? 'failure' : 'white'}
          {...register('companyName')}
        />
        {errors.companyName && (
          <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
        )}
      </div>

      {/* Tipo de Empresa */}
      <div>
        <Label color="gray" className="mb-2 block">
          Tipo de empresa <span className="text-red-500">*</span>
        </Label>
        <Select
          id="companyType"
          icon={AiOutlineInfoCircle}
          color={errors.companyType ? 'failure' : 'white'}
          {...register('companyType')}
        >
          {companyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        {errors.companyType && (
          <p className="mt-1 text-sm text-red-600">{errors.companyType.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <Label color="gray" className="mb-2 block">
          Descripción de la empresa
        </Label>
        <Textarea
          id="description"
          placeholder="Describe brevemente tu empresa y los servicios que ofreces..."
          rows={4}
          color={errors.description ? 'failure' : 'white'}
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Email de la Empresa */}
      <div>
        <Label color="gray" className="mb-2 block">
          Email de la empresa <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="companyEmail"
          type="email"
          placeholder="empresa@ejemplo.com"
          icon={AiOutlineMail}
          color={errors.companyEmail ? 'failure' : 'white'}
          {...register('companyEmail')}
        />
        {errors.companyEmail && (
          <p className="mt-1 text-sm text-red-600">{errors.companyEmail.message}</p>
        )}
      </div>

      {/* Teléfono de la Empresa */}
      <div>
        <Label color="gray" className="mb-2 block">
          Teléfono de la empresa <span className="text-red-500">*</span>
        </Label>
        <PhoneInput
          defaultCountry="co"
          placeholder="Teléfono de la empresa"
          value={companyPhone}
          className="block w-full [&>input]:bg-white [&>input]:w-full [&>input]:text-gray-500 [&>input]:border-gray-300 [&>input]:p-2.5 [&>input]:h-3 [&>input]:text-sm [&>input]:rounded-sm [&>button]:bg-white [&>button]:text-gray-500"
          onChange={handleCompanyPhoneChange}
        />
        {!companyPhone && (
          <p className="mt-1 text-sm text-red-600">El teléfono de la empresa es requerido</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#334C5D] mb-2">Información Fiscal</h3>
        <p className="text-gray-600">Completa los datos fiscales y de ubicación de tu empresa</p>
      </div>
      
      {/* Tipo de Documento */}
      <div>
        <Label color="gray" className="mb-2 block">
          Tipo de documento <span className="text-red-500">*</span>
        </Label>
        <Select
          id="documentType"
          icon={AiOutlineIdcard}
          color={errors.documentType ? 'failure' : 'white'}
          {...register('documentType')}
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        {errors.documentType && (
          <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
        )}
      </div>

      {/* Número de Documento */}
      <div>
        <Label color="gray" className="mb-2 block">
          Número de documento <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="documentNumber"
          type="text"
          placeholder="12345678"
          icon={AiOutlineIdcard}
          color={errors.documentNumber ? 'failure' : 'white'}
          {...register('documentNumber')}
        />
        {errors.documentNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
        )}
      </div>

      {/* Razón Social */}
      <div>
        <Label color="gray" className="mb-2 block">
          Razón social <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="businessName"
          type="text"
          placeholder="Nombre legal de la empresa"
          icon={AiOutlineBuild}
          color={errors.businessName ? 'failure' : 'white'}
          {...register('businessName')}
        />
        {errors.businessName && (
          <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
        )}
      </div>

      {/* Sitio Web */}
      <div>
        <Label color="gray" className="mb-2 block">
          Sitio web
        </Label>
        <TextInput
          id="website"
          type="url"
          placeholder="https://www.empresa.com"
          icon={AiOutlineGlobal}
          color={errors.website ? 'failure' : 'white'}
          {...register('website')}
        />
        {errors.website && (
          <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
        )}
      </div>

      {/* Dirección */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#334C5D]">Dirección</h3>
        
        <div>
          <Label color="gray" className="mb-2 block">
            Dirección <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="address.street"
            type="text"
            placeholder="Calle 123 #45-67"
            icon={AiOutlineHome}
            color={errors.address?.street ? 'failure' : 'white'}
            {...register('address.street')}
          />
          {errors.address?.street && (
            <p className="mt-1 text-sm text-red-600">{errors.address.street.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label color="gray" className="mb-2 block">
              Ciudad <span className="text-red-500">*</span>
            </Label>
            <TextInput
              id="address.city"
              type="text"
              placeholder="Bogotá"
              color={errors.address?.city ? 'failure' : 'white'}
              {...register('address.city')}
            />
            {errors.address?.city && (
              <p className="mt-1 text-sm text-red-600">{errors.address.city.message}</p>
            )}
          </div>

          <div>
            <Label color="gray" className="mb-2 block">
              Departamento
            </Label>
            <TextInput
              id="address.state"
              type="text"
              placeholder="Cundinamarca"
              color={errors.address?.state ? 'failure' : 'white'}
              {...register('address.state')}
            />
            {errors.address?.state && (
              <p className="mt-1 text-sm text-red-600">{errors.address.state.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label color="gray" className="mb-2 block">
              Código postal
            </Label>
            <TextInput
              id="address.postalCode"
              type="text"
              placeholder="110111"
              color={errors.address?.postalCode ? 'failure' : 'white'}
              {...register('address.postalCode')}
            />
            {errors.address?.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.address.postalCode.message}</p>
            )}
          </div>

          <div>
            <Label color="gray" className="mb-2 block">
              País <span className="text-red-500">*</span>
            </Label>
            <TextInput
              id="address.country"
              type="text"
              placeholder="Colombia"
              color={errors.address?.country ? 'failure' : 'white'}
              {...register('address.country')}
            />
            {errors.address?.country && (
              <p className="mt-1 text-sm text-red-600">{errors.address.country.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#334C5D] mb-2">Tamaño de Empresa</h3>
        <p className="text-gray-600">Ayúdanos a entender mejor el tamaño de tu empresa</p>
      </div>
      
      {/* Número de Empleados */}
      <div>
        <Label color="gray" className="mb-2 block">
          Número de empleados <span className="text-red-500">*</span>
        </Label>
        <Select
          id="employeeCount"
          icon={AiOutlineTeam}
          color={errors.employeeCount ? 'failure' : 'white'}
          {...register('employeeCount')}
        >
          {employeeCounts.map((count) => (
            <option key={count.value} value={count.value}>
              {count.label}
            </option>
          ))}
        </Select>
        {errors.employeeCount && (
          <p className="mt-1 text-sm text-red-600">{errors.employeeCount.message}</p>
        )}
      </div>

      {/* Ingresos Anuales */}
      <div>
        <Label color="gray" className="mb-2 block">
          Ingresos anuales aproximados
        </Label>
        <Select
          id="annualRevenue"
          icon={AiOutlineInfoCircle}
          color={errors.annualRevenue ? 'failure' : 'white'}
          {...register('annualRevenue')}
        >
          {annualRevenues.map((revenue) => (
            <option key={revenue.value} value={revenue.value}>
              {revenue.label}
            </option>
          ))}
        </Select>
        {errors.annualRevenue && (
          <p className="mt-1 text-sm text-red-600">{errors.annualRevenue.message}</p>
        )}
      </div>

      {/* Años en el Negocio */}
      <div>
        <Label color="gray" className="mb-2 block">
          Años en el negocio
        </Label>
        <Select
          id="businessYears"
          icon={AiOutlineInfoCircle}
          color={errors.businessYears ? 'failure' : 'white'}
          {...register('businessYears')}
        >
          {businessYears.map((years) => (
            <option key={years.value} value={years.value}>
              {years.label}
            </option>
          ))}
        </Select>
        {errors.businessYears && (
          <p className="mt-1 text-sm text-red-600">{errors.businessYears.message}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Mensaje informativo si hay datos existentes */}
      {existingCompany && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <HiCheckCircle className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Datos de Empresa Cargados
              </h3>
              <p className="text-green-700">
                Se han cargado los datos previamente registrados de tu empresa. 
                Puedes editarlos y actualizar la información.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje especial si el usuario saltó el setup anteriormente */}
      {hasCompletedSetup && !hasCompanyAssociated && (
        <div className="mb-6 bg-gradient-to-r from-[#EBD52C] to-[#EBD52C]/80 border border-[#EBD52C] rounded-lg p-4">
          <div className="flex items-center">
            <HiExclamationCircle className="w-6 h-6 text-[#334C5D] mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-[#334C5D]">
                Configuración Pendiente
              </h3>
              <p className="text-[#334C5D]/80">
                Anteriormente saltaste la configuración de empresa. 
                {sanityUser?.role === 'host' 
                  ? ' Para crear experiencias, completa la información a continuación.'
                  : ' Para cotizar experiencias, completa la información a continuación.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de pasos */}
      <StepIndicator 
        currentStep={currentStep} 
        totalSteps={steps.length} 
        steps={steps} 
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contenido del paso actual */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Botones de navegación */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                color="gray"
                onClick={prevStep}
                className="px-8 py-3 text-white"
              >
                ← Anterior
              </Button>
            ) : (
              <div></div>
            )}
            
            {/* Botón "Lo haré después" */}
            <button
              type="button"
              onClick={skipCompanySetup}
              className="text-sm text-gray-500 hover:text-[#F26726] transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Lo haré después
            </button>
          </div>

          {currentStep < steps.length ? (
            <Button
              type="button"
              color="primary"
              onClick={nextStep}
              className="px-8 py-3"
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              type="button"
              color="primary"
              onClick={async () => {
                // Validar el paso final antes de enviar
                const currentData = getValues();
                try {
                  sizeInfoSchema.parse(currentData);
                  // Si la validación pasa, entonces enviar el formulario
                  await onSubmit(currentData);
                } catch (error) {
                  if (error instanceof z.ZodError) {
                    console.error('Validation errors:', error.issues);
                    await showError('Campos requeridos', 'Por favor, completa todos los campos requeridos correctamente');
                  }
                }
              }}
              className="px-8 py-3"
            >
              ✓ Completar Registro
            </Button>
          )}
        </div>
      </form>
      </div>

      {/* Información adicional */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Esta información será utilizada para crear tu perfil de empresa. 
          Puedes actualizarla más tarde desde tu perfil.
        </p>
      </div>
    </div>
  );
}