"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, TextInput, Label } from "flowbite-react";
import FiloLogo from "@/components/FiloLogo";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/firebase/AuthContext";
import { LoginFormData } from "@/types";
import { useSearchParams } from "next/navigation";
import { getTranslatedFirebaseError } from "@/lib/firebase/firebaseErrors";
import RecaptchaComponent from "@/components/Recaptcha";

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaRef = useRef<{ reset: () => void } | null>(null);
  const { login } = useAuth();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  // Verificar mensajes de URL al cargar la página
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'account-pending') {
      setError('Tu cuenta está pendiente de activación. Por favor, contacta al administrador.');
    } else if (message === 'user-not-found') {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } else if (message === 'registration-success') {
      setSuccess('¡Registro exitoso! Tu cuenta ha sido creada. Ya puedes iniciar sesión.');
    } else if (message === 'login-success') {
      setSuccess('¡Inicio de sesión exitoso!');
    }
  }, [searchParams]);

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

  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    console.error('RECAPTCHA_SITE_KEY no está configurado');
  }

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);

    // Verificar que reCAPTCHA esté completado
    if (!recaptchaToken) {
      setError('Por favor, completa la verificación reCAPTCHA');
      setLoading(false);
      return;
    }
    
    try {
      await login(data.email, data.password);
      
      // Resetear reCAPTCHA después del login exitoso
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } catch (error) {
      setError(getTranslatedFirebaseError(error));
      
      // Resetear reCAPTCHA en caso de error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 w-full max-w-md mx-auto py-10 px-4">
      <FiloLogo className="w-full max-w-[200px] mb-10" />
      
      <form
        className="flex flex-col items-center justify-center max-w-md w-full space-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <Label color="gray" className="w-full">
            Correo electrónico
          </Label>
          <TextInput
            {...register("email", { required: true })}
            color="white"
            placeholder="Correo electrónico"
            className="w-full"
            type="email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm text-left w-full">
              {errors.email.type === "required"
                ? "El correo electrónico es requerido"
                : "El correo electrónico es incorrecto"}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <Label color="gray" className="w-full">
            Contraseña
          </Label>
          <TextInput
            {...register("password", { required: true })}
            color="white"
            placeholder="Contraseña"
            className="w-full"
            type="password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm text-left w-full">
              {errors.password.type === "required"
                ? "La contraseña es requerida"
                : "La contraseña es incorrecta"}
            </p>
          )}
        </div>
        {error && (
          <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="w-full p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
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
        
        <div className="flex flex-col items-center justify-center w-full">
          <Button 
            type="submit" 
            fullSized 
            className="w-full" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="underline hover:text-[#f26726] transition"
          >
            Regístrate
          </Link>
        </p>

        <p className="text-sm text-gray-500">
          ¿Olvidaste tu contraseña?{" "}
          <Link
            href="/reset-password"
            className="underline hover:text-[#f26726] transition"
          >
            Recupérala aquí
          </Link>
        </p>
      </form>
    </div>
  );
}
