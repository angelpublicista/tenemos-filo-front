"use client";

import React, { useState } from 'react';
import { useAuth } from "@/lib/auth/AuthContext";
import {
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineSetting,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineShareAlt
} from 'react-icons/ai';
import {
  BiMap,
  BiStore,
  BiChevronLeft,
  BiChevronRight,
  BiX
} from 'react-icons/bi';
import { HiOutlineDocumentText } from 'react-icons/hi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { sanityUser, activeCompanyId } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Un admin "actuando como" una empresa usa las mismas pantallas que un
  // anfitrion, asi que le mostramos las mismas secciones.
  const operaComoEmpresa =
    sanityUser?.role === 'host' || (sanityUser?.role === 'admin' && !!activeCompanyId);

  // En modo plataforma el admin no tiene empresa, y estas pantallas resuelven
  // su contenido con /companies/me: sin empresa terminan empujandolo a
  // /company-setup, que no le corresponde. Para la vista global tiene la
  // seccion de Administracion.
  const esAdminSinEmpresa = sanityUser?.role === 'admin' && !activeCompanyId;

  type NavItem =
    | { type: 'section'; name: string }
    | { type: 'divider' }
    | {
        type?: 'link';
        name: string;
        href: string;
        icon: React.ComponentType<{ className?: string }>;
        current: boolean;
        enabled: boolean;
      };

  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: AiOutlineHome,
      current: pathname === '/dashboard',
      enabled: true
    },
    ...(operaComoEmpresa ? [
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
      }
    ] as NavItem[] : []),
    ...(!esAdminSinEmpresa ? [
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
      { type: 'section', name: 'Herramientas' },
      {
        name: 'Catálogo digital',
        href: '/dashboard/booking-link',
        icon: AiOutlineShareAlt,
        current: pathname === '/dashboard/booking-link',
        enabled: true
      }
    ] as NavItem[] : []),
    ...(operaComoEmpresa ? [
      {
        name: 'CRM',
        href: '/dashboard/crm',
        icon: HiOutlineDocumentText,
        current: pathname?.startsWith('/dashboard/crm') ?? false,
        enabled: true
      }
    ] as NavItem[] : []),
    // Panel de plataforma: solo para el equipo de Tenemos Filo.
    ...(sanityUser?.role === 'admin' ? [
      { type: 'section', name: 'Administración' },
      {
        name: 'Empresas',
        href: '/dashboard/admin/empresas',
        icon: BiStore,
        current: pathname === '/dashboard/admin/empresas',
        enabled: true
      },
      {
        name: 'Usuarios',
        href: '/dashboard/admin/usuarios',
        icon: AiOutlineTeam,
        current: pathname === '/dashboard/admin/usuarios',
        enabled: true
      },
      {
        name: 'Experiencias',
        href: '/dashboard/admin/experiencias',
        icon: AiOutlineCalendar,
        current: pathname === '/dashboard/admin/experiencias',
        enabled: true
      },
      {
        name: 'Actividad',
        href: '/dashboard/admin/actividad',
        icon: HiOutlineDocumentText,
        current: pathname === '/dashboard/admin/actividad',
        enabled: true
      }
    ] as NavItem[] : []),
    { type: 'divider' },
    {
      name: 'Mi Perfil',
      href: '/dashboard/profile',
      icon: AiOutlineUser,
      current: pathname === '/dashboard/profile',
      enabled: true
    },
    ...(operaComoEmpresa ? [
      {
        name: 'Mi Empresa',
        href: '/dashboard/company',
        icon: BiStore,
        current: pathname === '/dashboard/company',
        enabled: true
      }
    ] as NavItem[] : []),
    {
      name: 'Notificaciones',
      href: '/dashboard/notifications',
      icon: AiOutlineBell,
      current: pathname === '/dashboard/notifications',
      enabled: true
    },
    {
      name: 'Configuración',
      href: '/dashboard/settings',
      icon: AiOutlineSetting,
      current: pathname === '/dashboard/settings',
      enabled: true
    }
  ];

  const handleLinkClick = () => {
    // Close drawer on mobile when navigating
    onClose();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`
        hidden lg:flex flex-col bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 shrink-0 h-full
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <SidebarContent
          navigationItems={navigationItems}
          isCollapsed={isCollapsed}
          sanityUser={sanityUser}
          onLinkClick={() => {}}
          collapseButton={
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              {isCollapsed
                ? <BiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                : <BiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              }
            </button>
          }
        />
      </div>

      {/* Mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-72 max-w-[85vw]
        bg-white dark:bg-gray-800 shadow-xl
        transition-transform duration-300 ease-in-out
        lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent
          navigationItems={navigationItems}
          isCollapsed={false}
          sanityUser={sanityUser}
          onLinkClick={handleLinkClick}
          collapseButton={
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Cerrar menú"
            >
              <BiX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          }
        />
      </div>
    </>
  );
}

interface SidebarContentProps {
  navigationItems: Array<
    | { type: 'section'; name: string }
    | { type: 'divider' }
    | { type?: 'link'; name: string; href: string; icon: React.ComponentType<{ className?: string }>; current: boolean; enabled: boolean }
  >;
  isCollapsed: boolean;
  sanityUser: { name?: string; role?: string } | null | undefined;
  onLinkClick: () => void;
  collapseButton: React.ReactNode;
}

function SidebarContent({ navigationItems, isCollapsed, sanityUser, onLinkClick, collapseButton }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navegación</h2>
        )}
        <div className={isCollapsed ? 'mx-auto' : ''}>
          {collapseButton}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item, idx) => {
          if (item.type === 'section') {
            if (isCollapsed) {
              return (
                <div key={`section-${item.name}`} className="my-2 border-t border-gray-200 dark:border-gray-700" />
              );
            }
            return (
              <div key={`section-${item.name}`} className="pt-3 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {item.name}
              </div>
            );
          }

          if (item.type === 'divider') {
            return <div key={`divider-${idx}`} className="my-2 border-t border-gray-200 dark:border-gray-700" />;
          }

          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.name}
                className="flex items-center px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed"
                title="Próximamente disponible"
              >
                <Icon className="w-5 h-5 shrink-0 text-gray-400" />
                {!isCollapsed && <span className="ml-3 text-sm font-medium text-gray-400">{item.name}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                item.current
                  ? 'bg-[#F26726] text-white'
                  : 'text-[#334C5D] dark:text-gray-300 hover:bg-[#F26726]/10 dark:hover:bg-[#F26726]/20 hover:text-[#F26726]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="ml-3 text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center min-w-0">
          <div className="w-8 h-8 bg-[#f26726] rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {sanityUser?.name?.charAt(0) || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {sanityUser?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sanityUser?.role === 'host' ? 'Anfitrión' :
                 sanityUser?.role === 'admin' ? 'Administrador' :
                 sanityUser?.role === 'reseller' ? 'Revendedor' : 'Comensal'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
