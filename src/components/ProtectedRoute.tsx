"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProtectedRouteProps } from "@/types";
import Loader from './Loader';

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, sanityUser, loading } = useAuth();
  const router = useRouter();

  const rolePermitido = !roles || (!!sanityUser && roles.includes(sanityUser.role));

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!sanityUser) {
        // Si hay usuario de Firebase pero no de Sanity
        router.push('/login?message=user-not-found');
      } else if (!sanityUser.isActive) {
        // Si el usuario no está activo
        router.push('/login?message=account-pending');
      } else if (!rolePermitido) {
        // Rol sin acceso a esta seccion: lo devolvemos al dashboard en vez
        // de al login, que ya inicio sesion correctamente.
        router.push('/dashboard');
      }
    }
  }, [user, sanityUser, loading, rolePermitido, router]);

  if (loading) {
    return <Loader message="Cargando..." className="min-h-screen" />;
  }

  if (!user || !sanityUser || !sanityUser.isActive || !rolePermitido) {
    return null;
  }

  return <>{children}</>;
} 