"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const { user, sanityUser } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Bienvenido de vuelta, {sanityUser?.name || user?.email}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-2">Información del usuario</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">
                    <strong>Nombre:</strong> {sanityUser?.name || 'No disponible'}
                  </p>
                  <p className="text-gray-600">
                    <strong>Email:</strong> {user?.email}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    <strong>Rol:</strong> {
                      sanityUser?.role === 'host' ? 'Anfitrión' : 
                      sanityUser?.role === 'admin' ? 'Administrador' : 'Comensal'
                    }
                  </p>
                  <p className="text-gray-600">
                    <strong>Teléfono:</strong> {sanityUser?.phone || 'No disponible'}
                  </p>
                </div>
              </div>
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

            {sanityUser?.role === 'host' && (
              <div className="mt-6 bg-orange-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">Panel de Anfitrión</h3>
                <p className="text-orange-700 mb-3">
                  Como anfitrión, puedes crear y gestionar eventos en tus sedes.
                </p>
                <div className="flex gap-3">
                  <button className="bg-[#f26726] text-white px-4 py-2 rounded hover:bg-[#f26726]/80 transition">
                    Crear Evento
                  </button>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition">
                    Ver Mis Eventos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 