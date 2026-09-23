"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import { createCompanyInSanity, getCompanyByUserId, updateCompanyInSanity } from '@/lib/sanity/companyService';
import { associateUserWithCompany, markCompanySetupCompleted } from '@/lib/sanity/userService';
import { Button, Label, TextInput, Select, Textarea } from 'flowbite-react';
import { HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import { AiOutlineBuild, AiOutlineMail, AiOutlineInfoCircle, AiOutlineIdcard, AiOutlineHome, AiOutlineGlobal, AiOutlineTeam } from 'react-icons/ai';
import TelefonoInput from "./TelefonoInput";
import { telefonoVacio } from "@/lib/telefono";
import StepIndicator from './StepIndicator';
import { CompleteCompanyData, Company } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import CompanyInfoView from './CompanyInfoView';
import CompanyDocuments from './CompanyDocuments';
import type { CampoDetectado } from '@/lib/company/documentos';
import {
  TIPOS_DE_EMPRESA,
  VALORES_DE_TIPO,
  TIPOS_DE_PERSONA,
  VALORES_DE_PERSONA,
  documentoSugerido,
  pideCamaraDeComercio,
} from '@/lib/company/tipos';
import Loader from './Loader';
import { ImageUpload } from './ImageUpload';
import DepartamentoCiudad from './DepartamentoCiudad';
import { digitoVerificacion } from '@/lib/company/nit';
import { CIIU_SUGERIDOS, nombreDeCiiu } from '@/data/ciiu';
import ContactosDeEmpresa from './ContactosDeEmpresa';
import {
  CONTACTOS_OBLIGATORIOS,
  contactoVacio,
  erroresDeContactos,
  paraGuardar as contactosParaGuardar,
  type ContactoDeEmpresa,
} from '@/lib/company/contactos';

// Esquemas de validación por pasos
const basicInfoSchema = z.object({
  companyName: z.string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa no puede exceder 100 caracteres'),
  // Sale de la lista comun: escrita a mano se quedo atras y habria rechazado
  // los tipos nuevos con un "selecciona un tipo valido" sobre uno que si lo era.
  companyType: z.enum(VALORES_DE_TIPO, {
    message: 'Selecciona un tipo de empresa válido'
  }),
  // Vacio = sin segundo tipo. Se admite la cadena vacia porque es lo que
  // entrega un <select> cuando se elige "Ninguno".
  companyTypeSecondary: z.union([z.enum(VALORES_DE_TIPO), z.literal('')]).optional(),
  personType: z.enum(VALORES_DE_PERSONA, {
    message: 'Indica si eres persona natural o jurídica'
  }),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  companyEmail: z.string()
    .email('Ingresa un email válido')
    .min(5, 'El email debe tener al menos 5 caracteres')
    .max(100, 'El email no puede exceder 100 caracteres'),
});

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

const fiscalInfoSchema = z.object({
  documentType: z.enum(['nit', 'cedula', 'pasaporte', 'other'], {
    message: 'Selecciona un tipo de documento válido'
  }),
  documentNumber: z.string()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(20, 'El número de documento no puede exceder 20 caracteres')
    .regex(/^[0-9]+$/, 'El número de documento solo puede contener números'),
  ciiuCode: z
    .string()
    .regex(/^[0-9]{4}$/, 'El código CIIU son cuatro dígitos')
    .optional()
    .or(z.literal('')),
  businessName: z.string()
    .min(2, 'La razón social debe tener al menos 2 caracteres')
    .max(200, 'La razón social no puede exceder 200 caracteres'),
  website: z.preprocess(
    (val) => {
      if (!val || val === '') return '';
      return formatUrl(String(val));
    },
    z.string().url('Ingresa una URL válida').optional().or(z.literal(''))
  ),
  address: z.object({
    street: z.string()
      .min(5, 'La dirección debe tener al menos 5 caracteres')
      .max(200, 'La dirección no puede exceder 200 caracteres'),
    city: z.string()
      .min(2, 'La ciudad debe tener al menos 2 caracteres')
      .max(100, 'La ciudad no puede exceder 100 caracteres'),
    state: z.string()
      .min(2, 'Selecciona un departamento')
      .max(100, 'El departamento no puede exceder 100 caracteres'),
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

const companyTypes = TIPOS_DE_EMPRESA;

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

const steps = ['Información Básica', 'Información Fiscal', 'Contactos', 'Tamaño de Empresa'];

export default function CompanySetupForm() {
  const router = useRouter();
  const { user, sanityUser, markSetupCompleted, isSetupCompleted, hasCompany } = useAuth();
  const { showSuccess, showError, showConfirmation, showLoading, hideLoading } = useSweetAlert();
  const [currentStep, setCurrentStep] = useState(1);

  /**
   * Los contactos viven fuera de react-hook-form.
   *
   * Es una lista de longitud variable con reglas propias —dos fijos, hasta
   * tres libres—; meterla en el esquema de pasos obligaria a un array de
   * campos anidados para no ganar nada. Igual que el telefono y el logo.
   *
   * Arranca con los dos obligatorios vacios para que se vean desde el
   * principio: son parte del formulario, no algo que haya que ir a buscar.
   */
  const [contactos, setContactos] = useState<ContactoDeEmpresa[]>(() =>
    CONTACTOS_OBLIGATORIOS.map((c) => contactoVacio(c.type)),
  );
  const [erroresContactos, setErroresContactos] = useState(false);
  const [companyPhone, setCompanyPhone] = useState("");
  const [logoAssetId, setLogoAssetId] = useState<string>("");
  // Claves de S3, no URLs: los documentos son privados. Van en useState y no
  // en react-hook-form, como el logo y el telefono.
  const [rutKey, setRutKey] = useState<string>("");
  const [camaraKey, setCamaraKey] = useState<string>("");
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
          setLogoAssetId(company.logo?.asset?._ref || '');
          setRutKey(company.rutKey || '');
          setCamaraKey(company.camaraKey || '');
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
    setValue,
    reset,
    watch
  } = useForm<CompleteCompanyData>({
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      companyType: 'restaurant',
      companyTypeSecondary: '',
      personType: 'juridica',
      description: '',
      companyEmail: '',
      companyPhone: '',
      documentType: 'nit',
      ciiuCode: '',
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

  // El DV se deriva del NIT en vez de guardarse en estado: es una funcion pura
  // del numero, asi que tener una copia editable solo abriria la puerta a que
  // se desincronicen.
  const documentTypeActual = watch('documentType');
  const personTypeActual = watch('personType');
  const companyTypeActual = watch('companyType');
  const ciiuActual = watch('ciiuCode');

  /**
   * Al cambiar el tipo de persona se preselecciona el documento que le toca.
   *
   * Es una sugerencia, no una imposicion: una persona natural comerciante si
   * tiene NIT. Por eso solo se toca si el campo sigue en el otro valor por
   * defecto —nit o cedula—; si el anfitrion eligio pasaporte u otro, se
   * respeta, porque eso ya es una decision suya.
   */
  useEffect(() => {
    if (!personTypeActual) return;
    const sugerido = documentoSugerido(personTypeActual);
    const actual = getValues('documentType');
    if (actual !== 'nit' && actual !== 'cedula') return;
    if (actual !== sugerido) setValue('documentType', sugerido, { shouldValidate: true });
  }, [personTypeActual, getValues, setValue]);

  /**
   * El segundo tipo no puede repetir al principal. Si al cambiar el principal
   * coinciden, el segundo se vacia: dejarlo mostraria una opcion que el
   * desplegable ya no ofrece.
   */
  useEffect(() => {
    if (companyTypeActual && getValues('companyTypeSecondary') === companyTypeActual) {
      setValue('companyTypeSecondary', '');
    }
  }, [companyTypeActual, getValues, setValue]);
  const documentNumberActual = watch('documentNumber') || '';
  const dvCalculado =
    documentTypeActual === 'nit' ? digitoVerificacion(documentNumberActual) : null;

  const selectedDepartment = watch('address.state') || '';

  // Actualizar el formulario cuando se carguen los datos existentes
  useEffect(() => {
    if (existingCompany) {
      reset({
        companyName: existingCompany.companyName || '',
        companyType: existingCompany.companyType || 'restaurant',
        companyTypeSecondary: existingCompany.companyTypeSecondary || '',
        personType: existingCompany.personType || 'juridica',
        description: existingCompany.description || '',
        companyEmail: existingCompany.companyEmail || '',
        companyPhone: existingCompany.companyPhone || '',
        documentType: existingCompany.documentType || 'nit',
        documentNumber: existingCompany.documentNumber || '',
        ciiuCode: existingCompany.ciiuCode || '',
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

      // Los contactos van aparte de react-hook-form. Los obligatorios se
      // completan con uno vacio si faltan: las empresas anteriores a este
      // campo no tienen ninguno, y sin esto el paso saldria en blanco sin
      // dejar claro que hay dos que rellenar.
      const guardados = existingCompany.contacts ?? [];
      setContactos([
        ...CONTACTOS_OBLIGATORIOS.map(
          (o) => guardados.find((c) => c.type === o.type) ?? contactoVacio(o.type),
        ),
        ...guardados.filter((c) => c.type === 'otro'),
      ]);
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
  
  if (hasCompletedSetup && hasCompanyAssociated && !existingCompany) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Sin veredicto sobre si esta completa: aqui `existingCompany` es
            null por definicion, asi que no hay datos que mirar. Quien los
            tiene es el CompanyInfoView de abajo, y es el que dice si falta
            algo. Antes se cantaba "Configuración Completada" desde una marca
            en localStorage, que solo significaba que alguien paso por el
            formulario alguna vez. */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mb-6">
          <div className="mb-4">
            <HiCheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#334C5D] mb-2">
              Tu empresa ya está registrada
            </h2>
            <p className="text-gray-600 text-lg">
              {sanityUser?.role === 'host'
                ? 'Puedes crear experiencias desde tu dashboard.'
                : 'Puedes cotizar experiencias desde tu dashboard.'
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
        // Contactos: se validan aqui y no con zod porque el mensaje util es
        // cual de los bloques esta mal, y eso el esquema no lo señala.
        const fallos = erroresDeContactos(contactos);
        if (fallos.size > 0) {
          setErroresContactos(true);
          await showError(
            'Faltan datos de contacto',
            'Revisa los contactos marcados en rojo. Reservas y contabilidad son obligatorios.',
          );
          return;
        }
        setErroresContactos(false);
        isValid = true;
      } else if (currentStep === 4) {
        // En el ultimo paso se valida pero no se avanza: el boton pasa a ser
        // "Completar Registro".
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
        await updateCompanyInSanity(existingCompany._id, {
          companyName: data.companyName,
          companyType: data.companyType,
          personType: data.personType,
          // Vacio significa "ninguno": va como null para borrarlo, no como "".
          companyTypeSecondary: data.companyTypeSecondary || null,
          description: data.description || undefined,
          companyEmail: data.companyEmail,
          companyPhone: companyPhone,
          logo: logoAssetId || null,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          ciiuCode: data.ciiuCode || undefined,
          contacts: contactosParaGuardar(contactos),
          documentDv: dvCalculado ?? undefined,
          businessName: data.businessName,
          website: data.website || undefined,
          address: data.address,
          employeeCount: data.employeeCount,
          annualRevenue: data.annualRevenue,
          businessYears: data.businessYears,
          // null y no undefined: al quitar un documento hay que desvincularlo,
          // y undefined dejaria el anterior puesto.
          rutKey: rutKey || null,
          camaraKey: camaraKey || null,
        });

        company = { _id: existingCompany._id };
        
        // Asegurarse de que el usuario esté asociado con la empresa
        await associateUserWithCompany(user.uid, existingCompany._id);
        
        await showSuccess(
          '¡Empresa actualizada exitosamente!',
          'Tu información de empresa ha sido actualizada correctamente.'
        );
      } else {
        // Crear nueva empresa
        const companyData = {
          companyName: data.companyName,
          companyType: data.companyType,
          personType: data.personType,
          // En un alta no hay nada que borrar: "ninguno" es no mandarlo.
          companyTypeSecondary: data.companyTypeSecondary || undefined,
          description: data.description || undefined,
          companyEmail: data.companyEmail,
          companyPhone: companyPhone,
          logo: logoAssetId || undefined,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          ciiuCode: data.ciiuCode || undefined,
          contacts: contactosParaGuardar(contactos),
          documentDv: dvCalculado ?? undefined,
          businessName: data.businessName,
          website: data.website || undefined,
          address: data.address,
          employeeCount: data.employeeCount,
          annualRevenue: data.annualRevenue,
          businessYears: data.businessYears,
          rutKey: rutKey || undefined,
          camaraKey: camaraKey || undefined
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

      // Esperar un momento para asegurar que Sanity procese los cambios
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Forzar recarga completa de la página para actualizar el AuthContext
      // Esto asegura que sanityUser tenga el companyId actualizado
      window.location.replace('/dashboard');

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

    const confirmed = await showConfirmation(
      warningTitle,
      warningText,
      'Sí, saltar',
      'Cancelar'
    );
    
    if (!confirmed) {
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

      {/* Logo de la Empresa */}
      <ImageUpload
        label="Logo de la empresa"
        value={logoAssetId || undefined}
        onChange={(assetId) => setLogoAssetId(assetId)}
        helpText="Imagen cuadrada · mínimo 400 × 400 px · PNG o JPG hasta 10 MB."
        compact
        placeholder="Subir logo"
        circular
      />

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

      {/* Tipo de Persona. Va antes que el tipo de empresa porque decide que
          documentacion se pedira en el paso siguiente. */}
      <div>
        <Label color="gray" className="mb-2 block">
          Tipo de persona <span className="text-red-500">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPOS_DE_PERSONA.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                personTypeActual === t.value
                  ? 'border-[#F26726] bg-orange-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                value={t.value}
                className="mt-1 accent-[#F26726]"
                {...register('personType')}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{t.label}</span>
                <span className="block text-xs text-gray-500">{t.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Determina qué documentos legales te pediremos más adelante.
        </p>
        {errors.personType && (
          <p className="mt-1 text-sm text-red-600">{errors.personType.message}</p>
        )}
      </div>

      {/* Tipo de Empresa principal */}
      <div>
        <Label color="gray" className="mb-2 block">
          Tipo de empresa principal <span className="text-red-500">*</span>
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

      {/* Tipo de Empresa secundario */}
      <div>
        <Label color="gray" className="mb-2 block">
          Tipo de empresa secundario <span className="text-gray-400">(opcional)</span>
        </Label>
        <Select
          id="companyTypeSecondary"
          icon={AiOutlineInfoCircle}
          color={errors.companyTypeSecondary ? 'failure' : 'white'}
          {...register('companyTypeSecondary')}
        >
          <option value="">Ninguno</option>
          {/* El principal se excluye: repetirlo no clasificaria nada. */}
          {companyTypes
            .filter((type) => type.value !== companyTypeActual)
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Si tu negocio es más de una cosa: un hotel que además hace catering,
          una finca que además da clases.
        </p>
        {errors.companyTypeSecondary && (
          <p className="mt-1 text-sm text-red-600">{errors.companyTypeSecondary.message}</p>
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
        <TelefonoInput
          label="Teléfono de la empresa"
          requerido
          value={companyPhone}
          onChange={handleCompanyPhoneChange}
          placeholder="Teléfono de la empresa"
          error={telefonoVacio(companyPhone) ? 'El teléfono de la empresa es requerido' : undefined}
        />
      </div>
    </div>
  );

  /**
   * Vuelca al formulario lo que la IA leyo del documento.
   *
   * El orden importa: el departamento va antes que la ciudad porque el select
   * de ciudad se alimenta de `getCitiesByDepartment(departamento)`, y si la
   * ciudad llega primero no hay lista donde encajarla. El resto va en el orden
   * que venga.
   */
  const aplicarDatosDelDocumento = (
    campos: CampoDetectado[],
    telefono: string,
    nombre: string,
  ) => {
    const depto = campos.find((c) => c.campo === 'address.state');
    if (depto) {
      setValue('address.state', depto.valor, { shouldValidate: true, shouldDirty: true });
    }

    for (const c of campos) {
      if (c.campo === 'address.state') continue;
      setValue(c.campo as keyof CompleteCompanyData, c.valor as never, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    // El pais no viene en el RUT, pero si el departamento es colombiano, el
    // pais tambien lo es.
    if (depto) setValue('address.country', 'Colombia', { shouldValidate: true });

    // Estos dos viven fuera de react-hook-form.
    if (telefono) setCompanyPhone(telefono);
    // El nombre solo si esta vacio: es lo unico que la persona pudo haber
    // elegido a conciencia distinto de lo que dice el papel.
    if (nombre && !getValues('companyName')?.trim()) {
      setValue('companyName', nombre, { shouldValidate: true, shouldDirty: true });
    }
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#334C5D] mb-2">Información Fiscal</h3>
        <p className="text-gray-600">Completa los datos fiscales y de ubicación de tu empresa</p>
      </div>

      {/* Va lo primero del paso: los campos que rellena estan justo debajo, en
          esta misma pantalla, asi que se ve el efecto al instante. */}
      <CompanyDocuments
        rutKey={rutKey}
        camaraKey={camaraKey}
        onRutChange={setRutKey}
        onCamaraChange={setCamaraKey}
        onAplicar={aplicarDatosDelDocumento}
              pideCamara={pideCamaraDeComercio(personTypeActual)}
      />
      
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

      {/* Número de Documento. Con el DV al lado cuando es NIT: asi se lee
          igual que viene impreso en el RUT y en las facturas. */}
      <div>
        <Label color="gray" className="mb-2 block">
          Número de documento <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <TextInput
              id="documentNumber"
              type="text"
              placeholder="12345678"
              icon={AiOutlineIdcard}
              color={errors.documentNumber ? 'failure' : 'white'}
              {...register('documentNumber')}
            />
          </div>
          {documentTypeActual === 'nit' && (
            <>
              <span className="pb-2.5 text-gray-400 select-none">-</span>
              <div className="w-16 shrink-0">
                <TextInput
                  id="documentDv"
                  type="text"
                  value={dvCalculado ?? ''}
                  readOnly
                  disabled
                  placeholder="DV"
                  color="white"
                  aria-label="Dígito de verificación"
                />
              </div>
            </>
          )}
        </div>
        {documentTypeActual === 'nit' && (
          <p className="mt-1 text-sm text-gray-500">
            {dvCalculado
              ? 'El dígito de verificación se calcula solo a partir del NIT.'
              : 'Escribe el NIT y calcularemos su dígito de verificación.'}
          </p>
        )}
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

      {/* Actividad económica */}
      <div>
        <Label color="gray" className="mb-2 block">
          Actividad económica <span className="text-gray-400">(código CIIU)</span>
        </Label>
        <TextInput
          id="ciiuCode"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Ej: 5611"
          list="ciiu-sugeridos"
          color={errors.ciiuCode ? 'failure' : 'white'}
          {...register('ciiuCode')}
        />
        {/* Sugerencias, no catalogo: el campo acepta cualquier codigo de
            cuatro digitos porque la clasificacion es de la DIAN y cambia. */}
        <datalist id="ciiu-sugeridos">
          {CIIU_SUGERIDOS.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.nombre}
            </option>
          ))}
        </datalist>
        <p className="mt-1 text-sm text-gray-500">
          {nombreDeCiiu(ciiuActual) ??
            'Lo encuentras en la casilla 46 de tu RUT. Si subes el documento lo tomamos de ahí.'}
        </p>
        {errors.ciiuCode && (
          <p className="mt-1 text-sm text-red-600">{errors.ciiuCode.message}</p>
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
          placeholder="https://www.empresa.com o www.empresa.com"
          icon={AiOutlineGlobal}
          color={errors.website ? 'failure' : 'white'}
          {...register('website', {
            onBlur: (e) => {
              const value = e.target.value;
              if (value && value.trim() !== '') {
                const formatted = formatUrl(value);
                setValue('website', formatted, { shouldValidate: true });
              }
            }
          })}
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

        <DepartamentoCiudad
          departamento={selectedDepartment}
          ciudad={watch('address.city') || ''}
          onDepartamentoChange={(v) =>
            setValue('address.state', v, { shouldValidate: true, shouldDirty: true })
          }
          onCiudadChange={(v) =>
            setValue('address.city', v, { shouldValidate: true, shouldDirty: true })
          }
          pais={watch('address.country')}
          idDepartamento="address.state"
          idCiudad="address.city"
          requerido
          errorDepartamento={errors.address?.state?.message}
          errorCiudad={errors.address?.city?.message}
        />

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

  const renderStepContactos = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#334C5D] mb-2">Contactos</h3>
        <p className="text-gray-600">
          A quién escribimos para cada asunto. Si tu empresa eres tú, usa el
          botón para copiar tus datos.
        </p>
      </div>

      <ContactosDeEmpresa
        valor={contactos}
        onChange={setContactos}
        misDatos={{
          name: sanityUser?.name,
          email: sanityUser?.email,
          phone: companyPhone,
        }}
        mostrarErrores={erroresContactos}
      />
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
        {currentStep === 3 && renderStepContactos()}
        {currentStep === 4 && renderStep3()}

        {/* Botones de navegación */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                color="gray"
                onClick={prevStep}
                className="px-8 py-3"
              >
                ← Anterior
              </Button>
            ) : (
              <div></div>
            )}
            
            {existingCompany ? (
              <button
                type="button"
                onClick={() => router.push('/dashboard/company')}
                className="text-sm text-gray-500 hover:text-[#F26726] transition-colors underline cursor-pointer"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={skipCompanySetup}
                className="text-sm text-gray-500 hover:text-[#F26726] transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Lo haré después
              </button>
            )}
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