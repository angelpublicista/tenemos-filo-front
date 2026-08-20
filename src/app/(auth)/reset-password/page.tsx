"use client";

import React, { Suspense, useState } from "react";
import { Button, TextInput, Label } from "flowbite-react";
import FiloLogo from "@/components/FiloLogo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

// Debe coincidir con resetPasswordSchema del API (min 8), o el submit
// se rechaza con 400 despues de que el usuario ya escribio la contraseña.
const MIN_PASSWORD_LENGTH = 8;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Ocurrio un error. Intenta de nuevo.";
}

/**
 * Modo 1 (sin ?token): pedir el correo de recuperacion.
 */
function RequestLinkForm() {
  const { resetPassword } = useAuth();
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Por favor ingresa tu correo electrónico");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setSent(true);
      setResetEmail("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">¡Correo enviado!</h2>
          <p className="text-sm text-gray-600">
            Si existe una cuenta con ese correo, te enviamos un enlace de recuperación.
            Revisa tu bandeja de entrada y sigue las instrucciones.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button href="/login" color="primary" fullSized className="w-full">
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h2>
      <p className="text-sm text-gray-600 text-center">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
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
          <Button type="submit" fullSized className="w-full" color="primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar correo de recuperación"}
          </Button>
        </div>
      </form>

      <p className="text-sm text-gray-500">
        ¿Recordaste tu contraseña?{" "}
        <Link href="/login" className="underline hover:text-[#f26726] transition">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

/**
 * Modo 2 (con ?token): fijar la contraseña nueva.
 */
function NewPasswordForm({ token }: { token: string }) {
  const { confirmPasswordReset } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
      // El token ya se consumio; mandamos al login para que entre con la nueva.
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">¡Contraseña actualizada!</h2>
          <p className="text-sm text-gray-600">
            Ya puedes iniciar sesión con tu contraseña nueva. Te llevamos al inicio de sesión...
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button href="/login" color="primary" fullSized className="w-full">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center max-w-md w-full space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Nueva contraseña</h2>
      <p className="text-sm text-gray-600 text-center">
        Elige una contraseña nueva para tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="flex flex-col w-full space-y-2">
          <Label color="gray" className="w-full">
            Contraseña nueva
          </Label>
          <TextInput
            type="password"
            color="white"
            placeholder="Contraseña nueva"
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col w-full space-y-2">
          <Label color="gray" className="w-full">
            Confirmar contraseña
          </Label>
          <TextInput
            type="password"
            color="white"
            placeholder="Confirmar contraseña"
            className="w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col w-full space-y-2">
          <Button type="submit" fullSized className="w-full" color="primary" disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </div>
      </form>

      <p className="text-sm text-gray-500">
        ¿El enlace expiró?{" "}
        <Link href="/reset-password" className="underline hover:text-[#f26726] transition">
          Solicita uno nuevo
        </Link>
      </p>
    </div>
  );
}

function ResetPasswordContent() {
  // El correo de recuperacion apunta a /reset-password?token=...
  // (ver sendPasswordResetEmail en src/lib/email/brevoService.ts)
  const token = useSearchParams().get("token");
  return token ? <NewPasswordForm token={token} /> : <RequestLinkForm />;
}

export default function ResetPassword() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 w-full max-w-md mx-auto py-10 px-4">
      <FiloLogo className="w-full max-w-[200px] mb-10" />
      {/* useSearchParams() exige un limite de Suspense en el App Router. */}
      <Suspense fallback={<p className="text-sm text-gray-500">Cargando...</p>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
