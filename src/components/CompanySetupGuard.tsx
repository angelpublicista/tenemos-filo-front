"use client";

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loader from './Loader';

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
    return <Loader message="Verificando acceso..." className="min-h-screen" />;
  }

  // Si no hay usuario autenticado, mostrar loading (ya se redirigirá en useEffect)
  if (!user) {
    return <Loader message="Redirigiendo al login..." className="min-h-screen" />;
  }

  // Permitir acceso a cualquier usuario autenticado
  return <>{children}</>;
}
