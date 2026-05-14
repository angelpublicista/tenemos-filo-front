"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CompanyInfoView from "@/components/CompanyInfoView";

export default function CompanyPage() {
  const { user, sanityUser } = useAuth();

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-2">
            Información de la Empresa
          </h1>
          <p className="text-gray-600">
            Gestiona la información de tu empresa y actualízala cuando sea necesario.
          </p>
        </div>

        {/* Company Info Component */}
        <CompanyInfoView />
      </div>
    </ProtectedRoute>
  );
}
