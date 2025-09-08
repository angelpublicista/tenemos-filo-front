'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseConfig';
import { Card } from 'flowbite-react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { FiloLogo } from '@/components/FiloLogo';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams.get('oobCode');
      
      if (!oobCode) {
        setStatus('invalid');
        setMessage('Código de verificación no válido o faltante.');
        return;
      }

      try {
        // Verificar que el código sea válido
        await checkActionCode(auth, oobCode);
        
        // Aplicar el código para verificar el email
        await applyActionCode(auth, oobCode);
        
        setStatus('success');
        setMessage('¡Tu email ha sido verificado exitosamente!');
        
        // Redirigir al dashboard después de 3 segundos
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        
      } catch (error: any) {
        console.error('Error verificando email:', error);
        setStatus('error');
        
        if (error.code === 'auth/invalid-action-code') {
          setMessage('El código de verificación ha expirado o ya ha sido usado.');
        } else if (error.code === 'auth/expired-action-code') {
          setMessage('El código de verificación ha expirado. Solicita uno nuevo.');
        } else {
          setMessage('Error verificando el email. Intenta de nuevo más tarde.');
        }
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <HiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />;
      case 'error':
      case 'invalid':
        return <HiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />;
      default:
        return (
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verificando tu email...';
      case 'success':
        return '¡Email verificado!';
      case 'error':
      case 'invalid':
        return 'Error de verificación';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'success':
        return 'Redirigiendo al dashboard...';
      case 'error':
      case 'invalid':
        return 'Ir al dashboard';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <FiloLogo />
        </div>
        
        <Card className="py-8 px-4 shadow-lg">
          <div className="text-center">
            {getIcon()}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getTitle()}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            
            {status !== 'loading' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={status === 'success'}
              >
                {getButtonText()}
              </button>
            )}
            
            {status === 'success' && (
              <p className="text-sm text-gray-500 mt-4">
                Serás redirigido automáticamente en unos segundos...
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
