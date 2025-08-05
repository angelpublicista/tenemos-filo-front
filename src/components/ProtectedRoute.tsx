"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProtectedRouteProps } from "@/types";

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f26726] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !sanityUser || !sanityUser.isActive) {
    return null;
  }

  return <>{children}</>;
} 