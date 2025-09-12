'use client';

import { useState } from 'react';
import { Alert } from 'flowbite-react';
import { HiExclamationTriangle, HiInformationCircle } from 'react-icons/hi';

interface FirebaseDebugInfoProps {
  error: unknown;
  showDebug?: boolean;
}

export const FirebaseDebugInfo = ({ error, showDebug = false }: FirebaseDebugInfoProps) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!error || !showDebug) {
    return null;
  }

  const getErrorCode = (error: unknown): string => {
    if (error && typeof error === 'object' && 'code' in error) {
      return String(error.code);
    }
    return 'unknown';
  };

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Error desconocido';
  };

  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  const isDomainError = errorCode === 'auth/unauthorized-domain';
  const isApiKeyError = errorCode === 'auth/invalid-api-key';

  return (
    <div className="mt-4">
      <Alert color="warning" icon={HiExclamationTriangle}>
        <div>
          <h3 className="text-lg font-medium">Error de Firebase Detectado</h3>
          <p className="mt-2">{errorMessage}</p>
          
          {isDomainError && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-start">
                <HiInformationCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-orange-800">Dominio No Autorizado</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    El dominio <code className="bg-orange-100 px-1 rounded">{window.location.hostname}</code> no está autorizado en Firebase.
                  </p>
                  <div className="mt-2 text-sm text-orange-700">
                    <strong>Solución:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Ve a <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">Firebase Console</a></li>
                      <li>Selecciona tu proyecto</li>
                      <li>Ve a <strong>Authentication</strong> → <strong>Settings</strong></li>
                      <li>En <strong>Authorized domains</strong>, agrega: <code className="bg-orange-100 px-1 rounded">{window.location.hostname}</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isApiKeyError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <HiInformationCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-red-800">API Key Inválida</h4>
                  <p className="text-sm text-red-700 mt-1">
                    La API Key de Firebase no es válida o ha expirado.
                  </p>
                  <div className="mt-2 text-sm text-red-700">
                    <strong>Solución:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Verifica tu archivo <code className="bg-red-100 px-1 rounded">.env.local</code></li>
                      <li>Confirma que <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_FIREBASE_API_KEY</code> sea correcta</li>
                      <li>Regenera la API Key en Firebase Console si es necesario</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-3 text-sm text-orange-600 hover:text-orange-800 underline"
          >
            {showDetails ? 'Ocultar' : 'Mostrar'} detalles técnicos
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="font-medium text-gray-800 mb-2">Detalles Técnicos:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Código de error:</strong> <code className="bg-gray-100 px-1 rounded">{errorCode}</code></p>
                <p><strong>Mensaje:</strong> <code className="bg-gray-100 px-1 rounded">{errorMessage}</code></p>
                <p><strong>Dominio actual:</strong> <code className="bg-gray-100 px-1 rounded">{window.location.hostname}</code></p>
                <p><strong>URL completa:</strong> <code className="bg-gray-100 px-1 rounded">{window.location.href}</code></p>
              </div>
            </div>
          )}
        </div>
      </Alert>
    </div>
  );
};

