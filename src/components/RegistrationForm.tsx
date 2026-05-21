"use client";

import React, { useState, useRef } from "react";
import { Button, TextInput, Label, Select } from "flowbite-react";
import Link from "next/link";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/auth/AuthContext";
import { GuestStep1Data } from "@/types";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getTranslatedFirebaseError } from "@/lib/firebase/firebaseErrors";
import RecaptchaComponent from "@/components/Recaptcha";

interface RegistrationFormProps {
  role: 'guest' | 'host' | 'reseller';
}

const ROLE_LABELS: Record<RegistrationFormProps['role'], string> = {
  guest: 'Comensal',
  host: 'Anfitrión',
  reseller: 'Revendedor',
};

export default function RegistrationForm({ role }: RegistrationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaRef = useRef<{ reset: () => void } | null>(null);
  const { register: authRegister } = useAuth();

  const form = useForm<GuestStep1Data>({
    mode: 'onChange',
  });
  const [phone, setPhone] = useState("");

  const handlePhoneChange = (value: string) => {
    setPhone(value);
  };

  const handleRecaptchaVerify = (token: string | null) => {
    setRecaptchaToken(token);
    setRecaptchaError(null);
  };

  const handleRecaptchaExpire = () => {
    setRecaptchaToken(null);
    setRecaptchaError('El reCAPTCHA ha expirado. Por favor, vuelve a verificarlo.');
  };

  const handleRecaptchaError = () => {
    setRecaptchaToken(null);
    setRecaptchaError('Error de reCAPTCHA. Por favor, recarga la página e intenta nuevamente.');
  };

  const handleSubmit = async (data: GuestStep1Data) => {
    setError(null);
    setLoading(true);

    try {
      // Verificar que las contraseñas coincidan
      if (data.password !== data.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      // Verificar que reCAPTCHA esté completado
      if (!recaptchaToken && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        setError('Por favor, completa la verificación reCAPTCHA');
        setLoading(false);
        return;
      }

      // Preparar datos para Sanity
      const userData = {
        name: `${data.fname} ${data.lname}`,
        email: data.email,
        role: role,
        phone: phone,
        typeDocument: data.typeDocument,
        documentNumber: data.documentNumber,
      };

      // Registrar usuario en Firebase Auth y Sanity
      await authRegister(data.email, data.password, userData);

      console.log(`${ROLE_LABELS[role]} registrado exitosamente en Firebase y Sanity`);
      
      // Resetear reCAPTCHA después del registro exitoso
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
      
      // Mostrar mensaje de redirección
      setLoading(false);
      setRedirecting(true);

    } catch (error) {
      // Manejar errores específicos de duplicados y permisos de Sanity primero
      if (error instanceof Error) {
        if (error.message.includes('email') && !error.message.includes('auth/')) {
          setError('Ya existe un usuario registrado con este email. Por favor, utiliza otro email o inicia sesión.');
        } else if (error.message.includes('documento')) {
          setError('Ya existe un usuario registrado con este número de documento. Por favor, verifica tus datos.');
        } else if (error.message.includes('Error de permisos en Sanity')) {
          setError('Error de configuración: No se pueden crear usuarios en la base de datos. Contacta al administrador.');
        } else if (error.message.includes('Error de autenticación en Sanity')) {
          setError('Error de configuración: Problema con la autenticación de la base de datos. Contacta al administrador.');
        } else if (error.message.includes('Error de configuración en Sanity')) {
          setError('Error de configuración: Problema con la configuración de la base de datos. Contacta al administrador.');
        } else {
          // Para todos los demás errores (especialmente de Firebase), usar la traducción
          setError(getTranslatedFirebaseError(error));
        }
      } else {
        // Para errores no identificados, usar la función de traducción
        setError(getTranslatedFirebaseError(error));
      }
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
      
      // Resetear reCAPTCHA en caso de error (si no se hizo ya en el bloque de éxito)
      if (!redirecting && recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    }
  };

  const getTitle = () => {
    return `Registro de ${ROLE_LABELS[role]}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
        {getTitle()}
      </h2>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-4">
        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Nombres <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Nombres"
            {...form.register("fname", { required: true })}
          />
          {form.formState.errors.fname && (
            <p className="text-red-500 text-xs">Los nombres son requeridos</p>
          )}
        </div>

        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Apellidos <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Apellidos"
            {...form.register("lname", { required: true })}
          />
          {form.formState.errors.lname && (
            <p className="text-red-500 text-xs">Los apellidos son requeridos</p>
          )}
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
            {...form.register("email", { required: true })}
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-xs">El email es requerido</p>
          )}
        </div>

        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Tipo de Documento <span className="text-red-500">*</span>
          </Label>
          <Select
            {...form.register("typeDocument", { required: true })}
            color="white"
          >
            <option value="">Selecciona el tipo</option>
            <option value="cc">Cédula de Ciudadanía</option>
            <option value="ce">Cédula de Extranjería</option>
            <option value="ti">Tarjeta de Identidad</option>
            <option value="pp">Pasaporte</option>
          </Select>
          {form.formState.errors.typeDocument && (
            <p className="text-red-500 text-xs">El tipo de documento es requerido</p>
          )}
        </div>

        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Número de Documento <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Número de documento"
            {...form.register("documentNumber", { required: true })}
          />
          {form.formState.errors.documentNumber && (
            <p className="text-red-500 text-xs">El número de documento es requerido</p>
          )}
        </div>

        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Contraseña <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <TextInput
              color="white"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              {...form.register("password", {
                required: true,
                minLength: {
                  value: 6,
                  message: "La contraseña debe tener al menos 6 caracteres"
                },
                deps: ["confirmPassword"]
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col w-full space-y-1">
          <Label color="gray" className="w-full">
            Confirmar Contraseña <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <TextInput
              color="white"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirma tu contraseña"
              {...form.register("confirmPassword", { 
                required: true,
                validate: (value) => {
                  const password = form.getValues("password");
                  return value === password || "Las contraseñas no coinciden";
                }
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-red-500 text-xs">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="terms"
            className="rounded-sm"
            {...form.register("terms", { required: true })}
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
        
        {form.formState.errors.terms && (
          <p className="text-red-500 text-xs">Debes aceptar los términos y condiciones</p>
        )}

        {error && (
          <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {redirecting && (
          <div className="w-full p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            ¡Registro exitoso! Redirigiendo al dashboard...
          </div>
        )}

        {/* reCAPTCHA */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <>
            <RecaptchaComponent
              ref={recaptchaRef}
              onVerify={handleRecaptchaVerify}
              onExpire={handleRecaptchaExpire}
              onError={handleRecaptchaError}
            />
            {recaptchaError && (
              <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {recaptchaError}
              </div>
            )}
          </>
        )}

        <Button
          type="submit"
          color="primary"
          className="w-full"
          disabled={loading || redirecting}
        >
          {loading ? 'Registrando...' : redirecting ? 'Redirigiendo...' : 'Completar Registro'}
        </Button>
      </form>
    </div>
  );
}
