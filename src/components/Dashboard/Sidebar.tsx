"use client";

import React, { useState } from 'react';
import { useAuth } from "@/lib/firebase/AuthContext";
import { 
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineSetting,
  AiOutlineBarChart,
  AiOutlineBell
} from 'react-icons/ai';
import { 
  BiBuildingHouse,
  BiMap
} from 'react-icons/bi';
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
      current: pathname === '/dashboard'
    },
    {
      name: 'Eventos',
      href: '/events',
      icon: AiOutlineCalendar,
      current: pathname === '/events'
    },
    {
      name: 'Reservas',
      href: '/reservations',
      icon: AiOutlineTeam,
      current: pathname === '/reservations'
    },
    ...(sanityUser?.role === 'host' ? [
      {
        name: 'Mis Eventos',
        href: '/my-events',
        icon: BiBuildingHouse,
        current: pathname === '/my-events'
      },
      {
        name: 'Mis Sedes',
        href: '/my-locations',
        icon: BiMap,
        current: pathname === '/my-locations'
      }
    ] : []),
    {
      name: 'Estadísticas',
      href: '/analytics',
      icon: AiOutlineBarChart,
      current: pathname === '/analytics'
    },
    {
      name: 'Notificaciones',
      href: '/notifications',
      icon: AiOutlineBell,
      current: pathname === '/notifications'
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: AiOutlineSetting,
      current: pathname === '/settings'
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 h-full ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">Navegación</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  item.current
                    ? 'bg-[#f26726] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#f26726] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {sanityUser?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {sanityUser?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
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
