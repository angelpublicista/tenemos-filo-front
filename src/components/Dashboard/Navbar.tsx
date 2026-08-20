"use client";

import { Dropdown, DropdownItem, DropdownDivider } from "flowbite-react";
import { useAuth } from "@/lib/auth/AuthContext";
import FiloLogo from "@/components/FiloLogo";
import { useEffect, useState } from "react";
import { HiPlus, HiMenu } from "react-icons/hi";
import NotificationBell from "@/components/Notifications/NotificationBell";
import CompanySwitcher from "@/components/Admin/CompanySwitcher";
import Link from "next/link";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, sanityUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // El bloque de acciones depende de auth (sanityUser?.role) y monta el
  // Dropdown de flowbite (que usa useId via @floating-ui). Para evitar
  // hydration mismatch lo renderizamos solo despues del mount cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserDisplayName = () => sanityUser?.name || user?.email || 'Usuario';

  const getUserInitial = () => {
    if (sanityUser?.name) return sanityUser.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 gap-3 z-20 relative">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <HiMenu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="shrink-0">
        <FiloLogo className="h-8 w-auto" />
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3" suppressHydrationWarning>
        {!mounted ? (
          // Placeholder con el ancho aproximado del area de acciones para
          // evitar layout shift al montar.
          <div className="w-8 h-8" aria-hidden />
        ) : (
        <>
        {/* Solo se pinta para ADMIN; el propio componente lo decide. */}
        <CompanySwitcher />

        {sanityUser?.role === 'host' && (
          <Link
            href="/dashboard/experiences/create"
            className="hidden sm:flex items-center gap-1 px-3 py-2 bg-[#F26726] text-white text-sm font-medium rounded-lg hover:bg-[#d9571f] transition-colors whitespace-nowrap"
          >
            <HiPlus className="w-4 h-4 shrink-0" />
            Crear Experiencia
          </Link>
        )}

        <NotificationBell />

        <Dropdown
          label={
            <div className="w-8 h-8 bg-[#F26726] rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white text-sm font-semibold">{getUserInitial()}</span>
            </div>
          }
          arrowIcon={false}
          inline
        >
          <DropdownItem className="px-4 py-2 pointer-events-none">
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900">{getUserDisplayName()}</span>
              <span className="text-xs text-gray-500">
                {sanityUser?.role === 'host' ? 'Anfitrión' :
                 sanityUser?.role === 'admin' ? 'Administrador' :
                 sanityUser?.role === 'reseller' ? 'Revendedor' : 'Comensal'}
              </span>
            </div>
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem href="/dashboard/profile" className="px-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mi Perfil
            </div>
          </DropdownItem>

          <DropdownItem href="/dashboard/settings" className="px-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración
            </div>
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 text-red-600 hover:text-red-700"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </div>
          </DropdownItem>
        </Dropdown>
        </>
        )}
      </div>
    </header>
  );
}
