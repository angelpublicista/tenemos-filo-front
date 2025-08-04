"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import { Button } from "flowbite-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <Button color="primary" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-2">Información del usuario</h2>
              <p className="text-gray-600">
                <strong>Email:</strong> {user?.email}
              </p>
              <p className="text-gray-600">
                <strong>ID:</strong> {user?.uid}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Bienvenido a Tenemos Filo</h3>
                <p className="text-blue-700">
                  Tu cuenta ha sido configurada correctamente. Aquí podrás gestionar tus eventos y reservas.
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Próximos pasos</h3>
                <ul className="text-green-700 space-y-1">
                  <li>• Crear tu primer evento</li>
                  <li>• Configurar tu perfil</li>
                  <li>• Explorar eventos disponibles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 