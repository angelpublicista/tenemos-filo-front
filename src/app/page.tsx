"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import Loader from "@/components/Loader";

export default function Home() {
  const { user, sanityUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && sanityUser) {
        // Verificar si el usuario está activo en Sanity
        if (sanityUser.isActive) {
          router.push('/dashboard');
        } else {
          // Si el usuario no está activo, redirigir al login con mensaje
          router.push('/login?message=account-pending');
        }
      } else if (user && !sanityUser) {
        // Si hay usuario de Firebase pero no de Sanity, redirigir al login
        router.push('/login?message=user-not-found');
      } else {
        // Si no hay usuario, redirigir al login
        router.push('/login');
      }
    }
  }, [user, sanityUser, loading, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return <Loader message="Cargando..." className="min-h-screen" />;
  }

  // Este return no debería ejecutarse, pero por seguridad
  return null;
}
