"use client";

import { useAuth } from "@/lib/firebase/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CompanySetupAlert from "@/components/CompanySetupAlert";
import { 
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineDollar,
  AiOutlineRise,
  AiOutlineFire
} from 'react-icons/ai';
import { BiBuildingHouse } from 'react-icons/bi';

export default function Dashboard() {
  const { user, sanityUser } = useAuth();

  const stats = [
    {
      title: 'Experiencias Activas',
      value: '12',
      change: '+2.5%',
      changeType: 'positive',
      icon: AiOutlineCalendar,
      color: 'bg-[#F26726]' // Naranja principal
    },
    {
      title: 'Reservas Pendientes',
      value: '8',
      change: '+12%',
      changeType: 'positive',
      icon: AiOutlineTeam,
      color: 'bg-[#19A3A2]' // Teal/Cyan
    },
    {
      title: 'Ingresos del Mes',
      value: '$2,450',
      change: '+8.1%',
      changeType: 'positive',
      icon: AiOutlineDollar,
      color: 'bg-[#EBD52C]' // Amarillo
    },
    {
      title: 'Crecimiento',
      value: '24%',
      change: '+5.2%',
      changeType: 'positive',
      icon: AiOutlineRise,
      color: 'bg-[#E23694]' // Rosa/Magenta
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'experience',
      title: 'Nueva experiencia creada',
      description: 'Cena de gala en Restaurante El Bueno',
      time: 'Hace 2 horas',
      icon: AiOutlineCalendar
    },
    {
      id: 2,
      type: 'reservation',
      title: 'Nueva reserva recibida',
      description: 'Juan Pérez reservó para 4 personas',
      time: 'Hace 4 horas',
      icon: AiOutlineTeam
    },
    {
      id: 3,
      type: 'payment',
      title: 'Pago procesado',
      description: 'Reserva #1234 - $150.00',
      time: 'Hace 6 horas',
      icon: AiOutlineDollar
    }
  ];

  const quickActions = [
    {
      title: 'Crear Experiencia',
      description: 'Organiza una nueva experiencia',
      icon: BiBuildingHouse,
      href: '/dashboard/experiences/create',
      color: 'bg-[#F26726] hover:bg-[#F26726]/80' // Naranja principal
    },
    {
      title: 'Ver Reservas',
      description: 'Gestiona las reservas pendientes',
      icon: AiOutlineTeam,
      href: '/reservations',
      color: 'bg-[#19A3A2] hover:bg-[#19A3A2]/80' // Teal/Cyan
    },
    {
      title: 'Mis Experiencias',
      description: 'Revisa tus experiencias activas',
      icon: AiOutlineCalendar,
      href: '/dashboard/experiences',
      color: 'bg-[#334C5D] hover:bg-[#334C5D]/80' // Azul oscuro
    }
  ];

  return (
    <ProtectedRoute>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ¡Hola, {sanityUser?.name?.split(' ')[0] || 'Usuario'}! 👋
              </h1>
              <p className="text-gray-600 mt-2">
                Bienvenido de vuelta. Aquí tienes un resumen de tu actividad.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Hoy es</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Setup Alert */}
        <CompanySetupAlert 
          userRole={sanityUser?.role || 'guest'}
          hasCompletedSetup={sanityUser?.hasCompletedCompanySetup || false}
          hasCompanyId={!!sanityUser?.companyId}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className={`${action.color} text-white p-4 rounded-lg flex items-center space-x-3 transition-colors`}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="font-medium">{action.title}</p>
                        <p className="text-sm opacity-90">{action.description}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
                <a href="/activities" className="text-[#f26726] hover:text-[#f26726]/80 text-sm font-medium">
                  Ver todas
                </a>
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="mt-8 bg-gradient-to-r from-[#f26726] to-[#f26726]/80 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Información de tu cuenta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="opacity-90">Nombre completo</p>
                  <p className="font-medium">{sanityUser?.name || 'No disponible'}</p>
                </div>
                <div>
                  <p className="opacity-90">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="opacity-90">Rol</p>
                  <p className="font-medium">
                    {sanityUser?.role === 'host' ? 'Anfitrión' : 
                     sanityUser?.role === 'admin' ? 'Administrador' : 'Comensal'}
                  </p>
                </div>
                <div>
                  <p className="opacity-90">Teléfono</p>
                  <p className="font-medium">{sanityUser?.phone || 'No disponible'}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <AiOutlineFire className="w-16 h-16 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 