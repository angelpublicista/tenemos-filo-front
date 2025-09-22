"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProfileView from "@/components/ProfileView";

export default function ProfilePage() {
  const { user, sanityUser } = useAuth();

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
            Mi Perfil
          </h1>
          <p className="text-gray-600">
            Gestiona tu información personal y configuración de cuenta.
          </p>
        </div>

        {/* Profile Component */}
        <ProfileView />
      </div>
    </ProtectedRoute>
  );
}
