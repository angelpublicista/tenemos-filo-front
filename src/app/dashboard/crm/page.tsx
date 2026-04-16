"use client";

import { useAuth } from '@/lib/firebase/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HiOutlineDocumentText, HiOutlineUsers, HiOutlineCalendar, HiOutlineTrendingUp } from 'react-icons/hi';
import { BiStore } from 'react-icons/bi';
import Link from 'next/link';

export default function CRMPage() {
  const { sanityUser } = useAuth();

  const modules = [
    {
      title: 'Cotizaciones',
      description: 'Genera cotizaciones personalizadas para tus clientes',
      icon: HiOutlineDocumentText,
      href: '/dashboard/crm/cotizaciones',
      color: 'bg-[#F26726]',
      available: true,
    },
    {
      title: 'Empresas',
      description: 'Gestiona tu base de datos de empresas CRM',
      icon: BiStore,
      href: '/dashboard/crm/empresas',
      color: 'bg-[#19A3A2]',
      available: true,
    },
    {
      title: 'Contactos',
      description: 'Gestiona tu base de datos de contactos CRM',
      icon: HiOutlineUsers,
      href: '/dashboard/crm/contactos',
      color: 'bg-[#8B5CF6]',
      available: true,
    },
    {
      title: 'Oportunidades',
      description: 'Gestiona tu pipeline de oportunidades de negocio',
      icon: HiOutlineTrendingUp,
      href: '/dashboard/crm/oportunidades',
      color: 'bg-[#E23694]',
      available: true,
    },
    {
      title: 'Clientes',
      description: 'Gestiona tu base de datos de clientes',
      icon: HiOutlineUsers,
      href: '/dashboard/crm/clientes',
      color: 'bg-[#F59E0B]',
      available: false,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            CRM - Gestión de Relaciones
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Administra tus cotizaciones, clientes y oportunidades de negocio
          </p>
        </div>

        {/* Módulos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link
                key={index}
                href={module.available ? module.href : '#'}
                className={`
                  bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4
                  hover:shadow-md transition-shadow
                  ${!module.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={(e) => {
                  if (!module.available) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${module.color} p-2 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {module.title}
                    </h2>
                    {!module.available && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (Próximamente)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Información adicional */}
        {sanityUser?.role === 'host' && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💡 Comienza con Cotizaciones
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              El módulo de Cotizaciones te permite buscar experiencias disponibles según las necesidades
              de tus clientes y generar cotizaciones profesionales para enviar por email.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}





