"use client";

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface CompanySetupGuardProps {
  children: React.ReactNode;
}

export default function CompanySetupGuard({ children }: CompanySetupGuardProps) {
  const { user, sanityUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Permitir acceso a cualquier usuario autenticado
    // No redirigir automáticamente, permitir que el usuario decida
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26726] mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar loading (ya se redirigirá en useEffect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26726] mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Permitir acceso a cualquier usuario autenticado
  return <>{children}</>;
}
