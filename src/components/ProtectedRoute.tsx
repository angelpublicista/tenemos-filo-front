"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProtectedRouteProps } from "@/types";
import Loader from './Loader';

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, sanityUser, loading } = useAuth();
  const router = useRouter();

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
      }
    }
  }, [user, sanityUser, loading, router]);

  if (loading) {
    return <Loader message="Cargando..." className="min-h-screen" />;
  }

  if (!user || !sanityUser || !sanityUser.isActive) {
    return null;
  }

  return <>{children}</>;
} 