"use client";

import React, { useState } from "react";
import { Button, TextInput, Label, Select } from "flowbite-react";
import Link from "next/link";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/firebase/AuthContext";
import { 
  HostStep1Data, 
  HostStep2Data, 
  HostStep3Data 
} from "@/types";
import { createCompanyInSanity, CreateCompanyData, updateCompanyLocations } from "@/lib/sanity/companyService";
import { createLocationInSanity, CreateLocationData } from "@/lib/sanity/locationService";
import { updateUserLocations } from "@/lib/sanity/userService";

interface RegistrationData {
  step1: HostStep1Data;
  step2: HostStep2Data;
  step3: HostStep3Data;
}

export default function HostRegistrationSteps() {
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    step1: {} as HostStep1Data,
    step2: {} as HostStep2Data,
    step3: {} as HostStep3Data,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register: authRegister } = useAuth();

  const step1Form = useForm<HostStep1Data>();
  const step2Form = useForm<HostStep2Data>();
  const step3Form = useForm<HostStep3Data>();

  const [phone, setPhone] = useState("");

  const handleStep1Submit = async (data: HostStep1Data) => {
    setRegistrationData(prev => ({ ...prev, step1: data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = async (data: HostStep2Data) => {
    setRegistrationData(prev => ({ ...prev, step2: data }));
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: HostStep3Data) => {
    setRegistrationData(prev => ({ ...prev, step3: data }));
    await handleFinalSubmit(data);
  };

  const handleFinalSubmit = async (step3Data: HostStep3Data) => {
    setError(null);
    setLoading(true);

    try {
      const { step1, step2 } = registrationData;

      // 1. Crear usuario en Firebase Auth
      const userCredential = await authRegister(step1.email, step1.password, {
        name: `${step1.fname} ${step1.lname}`,
        email: step1.email,
        role: 'host' as const,
        phone: phone,
      });

      // 2. Crear empresa en Sanity
      const companyData: CreateCompanyData = {
        name: step2.companyName,
        companyType: step2.companyType,
        description: step2.description,
        contactInfo: {
          email: step2.companyEmail,
          phone: step2.companyPhone,
        },
      };

      const company = await createCompanyInSanity(companyData);

      // 3. Crear sede principal en Sanity
      const locationData: CreateLocationData = {
        name: step3Data.locationName,
        companyId: company._id,
        isMain: true, // Primera sede siempre es principal
        description: step3Data.locationName,
        address: {
          street: step3Data.street,
          city: step3Data.city,
          state: step3Data.state,
          postalCode: step3Data.postalCode,
          country: step3Data.country,
        },
        contactInfo: {
          phone: step3Data.locationPhone,
          email: step3Data.locationEmail,
        },
        capacity: {
          minGuests: step3Data.minGuests,
          maxGuests: step3Data.maxGuests,
        },
      };

      const location = await createLocationInSanity(locationData);

      // 4. Actualizar empresa con la sede asignada
      await updateCompanyLocations(company._id, [location._id]);

      // 5. Actualizar usuario con la sede asignada
      await updateUserLocations(userCredential.user.uid, [location._id]);

      console.log('Registro completo exitoso');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? 'bg-[#f26726] text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  currentStep > step ? 'bg-[#f26726]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="w-full space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
        Paso 1: Datos Personales
      </h2>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Nombres <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Nombres"
          {...step1Form.register("fname", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Apellidos <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Apellidos"
          {...step1Form.register("lname", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Teléfono <span className="text-red-500">*</span>
        </Label>
        <PhoneInput
          defaultCountry="co"
          placeholder="Teléfono"
          className="block w-full [&>input]:bg-white [&>input]:w-full [&>input]:text-gray-500 [&>input]:border-gray-300 [&>input]:p-2.5 [&>input]:h-3 [&>input]:text-sm [&>input]:rounded-sm [&>button]:bg-white [&>button]:text-gray-500"
          onChange={handlePhoneChange}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Email <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          type="email"
          placeholder="Email"
          {...step1Form.register("email", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Contraseña <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          type="password"
          placeholder="Contraseña"
          {...step1Form.register("password", { required: true })}
        />
      </div>

      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          id="terms"
          className="rounded-sm"
          {...step1Form.register("terms", { required: true })}
        />
        <Label color="gray" htmlFor="terms" className="text-sm">
          Acepto los{" "}
          <Link
            href="/terms"
            target="_blank"
            className="underline hover:text-[#f26726] transition"
          >
            términos y condiciones
          </Link>{" "}
          <span className="text-red-500">*</span>
        </Label>
      </div>

      <Button
        type="submit"
        color="primary"
        className="w-full"
        disabled={step1Form.formState.isSubmitting}
      >
        {step1Form.formState.isSubmitting ? 'Procesando...' : 'Siguiente'}
      </Button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="w-full space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
        Paso 2: Datos de la Empresa
      </h2>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Nombre de la Empresa <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Nombre de la empresa"
          {...step2Form.register("companyName", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Tipo de Empresa <span className="text-red-500">*</span>
        </Label>
        <Select
          {...step2Form.register("companyType", { required: true })}
          color="white"
        >
          <option value="">Selecciona el tipo</option>
          <option value="restaurant">Restaurante</option>
          <option value="catering">Catering</option>
          <option value="foodtruck">Food Truck</option>
          <option value="other">Otro</option>
        </Select>
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Descripción
        </Label>
        <textarea
          className="w-full p-2.5 text-sm text-gray-500 border border-gray-300 rounded-sm bg-white"
          placeholder="Describe tu empresa..."
          rows={3}
          {...step2Form.register("description")}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Email de la Empresa <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          type="email"
          placeholder="Email de la empresa"
          {...step2Form.register("companyEmail", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Teléfono de la Empresa <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Teléfono de la empresa"
          {...step2Form.register("companyPhone", { required: true })}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          color="gray"
          className="flex-1 text-white"
          onClick={() => setCurrentStep(1)}
        >
          Anterior
        </Button>
        <Button
          type="submit"
          color="primary"
          className="flex-1"
          disabled={step2Form.formState.isSubmitting}
        >
          {step2Form.formState.isSubmitting ? 'Procesando...' : 'Siguiente'}
        </Button>
      </div>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="w-full space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
        Paso 3: Sede Principal
      </h2>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Nombre de la Sede <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Nombre de la sede"
          {...step3Form.register("locationName", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Calle y Número <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Calle y número"
          {...step3Form.register("street", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Ciudad <span className="text-red-500">*</span>
        </Label>
        <TextInput
          color="white"
          placeholder="Ciudad"
          {...step3Form.register("city", { required: true })}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Estado/Provincia
        </Label>
        <TextInput
          color="white"
          placeholder="Estado o provincia"
          {...step3Form.register("state")}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Código Postal
        </Label>
        <TextInput
          color="white"
          placeholder="Código postal"
          {...step3Form.register("postalCode")}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          País
        </Label>
        <TextInput
          color="white"
          placeholder="País"
          {...step3Form.register("country")}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Teléfono de la Sede
        </Label>
        <TextInput
          color="white"
          placeholder="Teléfono de la sede"
          {...step3Form.register("locationPhone")}
        />
      </div>

      <div className="flex flex-col w-full space-y-1">
        <Label color="gray" className="w-full">
          Email de la Sede
        </Label>
        <TextInput
          color="white"
          type="email"
          placeholder="Email de la sede"
          {...step3Form.register("locationEmail")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Mínimo de Invitados
          </Label>
          <TextInput
            color="white"
            type="number"
            placeholder="Mínimo"
            {...step3Form.register("minGuests", { valueAsNumber: true })}
          />
        </div>
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Máximo de Invitados
          </Label>
          <TextInput
            color="white"
            type="number"
            placeholder="Máximo"
            {...step3Form.register("maxGuests", { valueAsNumber: true })}
          />
        </div>
      </div>

      {error && (
        <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          color="gray"
          className="flex-1 text-white"
          onClick={() => setCurrentStep(2)}
        >
          Anterior
        </Button>
        <Button
          type="submit"
          color="primary"
          className="flex-1"
          disabled={loading}
        >
          {loading ? 'Completando registro...' : 'Completar registro'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {renderStepIndicator()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
} 