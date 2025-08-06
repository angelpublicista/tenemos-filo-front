"use client";

import React, { useState } from "react";
import { Button, TextInput, Label } from "flowbite-react";
import FiloLogo from "@/components/FiloLogo";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthContext";

export default function ResetPassword() {
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setError(null);
    setResetLoading(true);
    
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      setResetEmail("");
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al enviar el correo de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 w-full max-w-md mx-auto py-10 px-4">
      <FiloLogo className="w-full max-w-[200px] mb-10" />
      
      {!resetSuccess ? (
        // Formulario de Recuperación de Contraseña
        <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h2>
          <p className="text-sm text-gray-600 text-center">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          
          <form onSubmit={handleResetPassword} className="w-full space-y-4">
            <div className="flex flex-col w-full space-y-2">
              <Label color="gray" className="w-full">
                Correo electrónico
              </Label>
              <TextInput
                type="email"
                color="white"
                placeholder="Correo electrónico"
                className="w-full"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex flex-col w-full space-y-2">
              <Button
                type="submit"
                fullSized
                className="w-full"
                color="primary"
                disabled={resetLoading}
              >
                {resetLoading ? 'Enviando...' : 'Enviar correo de recuperación'}
              </Button>
            </div>
          </form>

          <p className="text-sm text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <Link
              href="/login"
              className="underline hover:text-[#f26726] transition"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      ) : (
        // Mensaje de éxito
        <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">¡Correo enviado!</h2>
            <p className="text-sm text-gray-600">
              Hemos enviado un enlace de recuperación a tu correo electrónico. 
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
          </div>

          <div className="w-full space-y-3">
            <Button
              href="/login"
              color="primary"
              fullSized
              className="w-full"
            >
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 