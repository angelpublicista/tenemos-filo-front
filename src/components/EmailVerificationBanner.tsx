'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Alert } from 'flowbite-react';
import { HiInformationCircle } from 'react-icons/hi';
import { FirebaseDebugInfo } from './FirebaseDebugInfo';

export const EmailVerificationBanner = () => {
  const { user, sendVerificationEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastError, setLastError] = useState<unknown>(null);

  // No mostrar si el usuario no existe, ya está verificado, o fue descartado
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsLoading(true);
    setMessage(null);
    setLastError(null);
    
    try {
      const result = await sendVerificationEmail();
      setMessage(result.message);
      setTimeout(() => setMessage(null), 5000); // Limpiar mensaje después de 5 segundos
    } catch (error) {
      setLastError(error);
      setMessage(error instanceof Error ? error.message : 'Error enviando email de verificación');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="mb-4">
      <Alert
        color="warning"
        icon={HiInformationCircle}
        onDismiss={handleDismiss}
        className="border-l-4 border-yellow-400"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="font-medium">Email no verificado</span>
            <p className="text-sm mt-1">
              Por favor, verifica tu dirección de email <strong>{user.email}</strong> para acceder a todas las funcionalidades.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSendVerification}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isLoading ? 'Enviando...' : 'Reenviar verificación'}
            </button>
          </div>
        </div>
        {message && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            {message}
          </div>
        )}
      </Alert>
      
      {/* Mostrar información de debugging en ambiente de desarrollo */}
      {lastError && process.env.NODE_ENV === 'development' ? (
        <FirebaseDebugInfo error={lastError} showDebug={true} />
      ) : null}
    </div>
  );
};
