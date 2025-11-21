"use client";

import React, { useState } from 'react';
import { useAuth } from "@/lib/firebase/AuthContext";
import { 
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineSetting,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineClockCircle
} from 'react-icons/ai';
import { 
  BiMap,
  BiStore
} from 'react-icons/bi';
import { HiOutlineDocumentText } from 'react-icons/hi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const { sanityUser } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: AiOutlineHome,
      current: pathname === '/dashboard',
      enabled: true
    },
    {
      name: 'Mis Experiencias',
      href: '/dashboard/experiences',
      icon: AiOutlineCalendar,
      current: pathname === '/dashboard/experiences',
      enabled: true
    },
    {
      name: 'Reservas',
      href: '/dashboard/reservations',
      icon: AiOutlineTeam,
      current: pathname === '/dashboard/reservations',
      enabled: true
    },
    {
      name: 'Mi Perfil',
      href: '/dashboard/profile',
      icon: AiOutlineUser,
      current: pathname === '/dashboard/profile',
      enabled: true
    },
    {
      name: 'Integraciones',
      href: '/dashboard/integrations',
      icon: AiOutlineSetting,
      current: pathname === '/dashboard/integrations',
      enabled: true
    },
    ...(sanityUser?.role === 'host' ? [
      {
        name: 'Mi Empresa',
        href: '/dashboard/company',
        icon: BiStore,
        current: pathname === '/dashboard/company',
        enabled: true
      },
      {
        name: 'Mis Sedes',
        href: '/dashboard/locations',
        icon: BiMap,
        current: pathname === '/dashboard/locations',
        enabled: true
      },
      {
        name: 'Disponibilidad',
        href: '/dashboard/availability',
        icon: AiOutlineClockCircle,
        current: pathname === '/dashboard/availability',
        enabled: true
      },
      {
        name: 'CRM',
        href: '/dashboard/crm',
        icon: HiOutlineDocumentText,
        current: pathname?.startsWith('/dashboard/crm'),
        enabled: true
      }
    ] : []),
    // {
    //   name: 'Estadísticas',
    //   href: '/analytics',
    //   icon: AiOutlineBarChart,
    //   current: pathname === '/analytics',
    //   enabled: false
    // },
    {
      name: 'Notificaciones',
      href: '/notifications',
      icon: AiOutlineBell,
      current: pathname === '/notifications',
      enabled: false
    },
    {
      name: 'Configuración',
      href: '/dashboard/settings',
      icon: AiOutlineSetting,
      current: pathname === '/dashboard/settings',
      enabled: true
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shrink-0 h-full ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navegación</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            
            if (!item.enabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center px-3 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Próximamente disponible"
                >
                  <Icon className="w-6 h-6 shrink-0 text-gray-400 dark:text-gray-600" />
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium text-gray-400 dark:text-gray-600">{item.name}</span>
                  )}
                </div>
              );
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  item.current
                    ? 'bg-[#F26726] text-white'
                    : 'text-[#334C5D] dark:text-gray-300 hover:bg-[#F26726]/10 dark:hover:bg-[#F26726]/20 hover:text-[#F26726]'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#f26726] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">
                {sanityUser?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {sanityUser?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sanityUser?.role === 'host' ? 'Anfitrión' : 
                   sanityUser?.role === 'admin' ? 'Administrador' : 'Comensal'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
