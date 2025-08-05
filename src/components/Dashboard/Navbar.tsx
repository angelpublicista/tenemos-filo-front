"use client";

import { Navbar as FlowbiteNavbar, NavbarBrand, NavbarToggle, NavbarCollapse, NavbarLink, Dropdown, DropdownItem, Avatar, DropdownDivider } from "flowbite-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import FiloLogo from "@/components/FiloLogo";
import { useState } from "react";

export default function Navbar() {
  const { user, sanityUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const getUserInitials = () => {
    if (sanityUser?.name) {
      const names = sanityUser.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    return sanityUser?.name || user?.email || 'Usuario';
  };

  return (
    <FlowbiteNavbar fluid={true} className="bg-white border-b border-gray-200">
      <NavbarBrand href="/dashboard">
        <FiloLogo className="w-22" />
      </NavbarBrand>
      
      <NavbarToggle />
      
      <NavbarCollapse className="flex justify-end items-center [&>ul]:items-center [&>ul]:flex [&>ul]:h-full">
        <NavbarLink href="/dashboard" className="text-gray-700 hover:text-[#f26726]">
          Dashboard
        </NavbarLink>
        <NavbarLink href="/events" className="text-gray-700 hover:text-[#f26726]">
          Eventos
        </NavbarLink>
        <NavbarLink href="/reservations" className="text-gray-700 hover:text-[#f26726]">
          Reservas
        </NavbarLink>
        {sanityUser?.role === 'host' && (
          <NavbarLink href="/my-events" className="text-gray-700 hover:text-[#f26726]">
            Mis Eventos
          </NavbarLink>
        )}
        
        <div className="flex items-center gap-3 ml-4">
          <Dropdown
            label={
              <Avatar
                alt="User settings"
                img=""
                rounded
                size="sm"
                className="text-white font-semibold cursor-pointer"
              >
              </Avatar>
            }
            arrowIcon={false}
            inline
          >
            <DropdownItem className="px-4 py-2">
              <div className="flex flex-col justify-start items-start">
                <span className="text-sm font-medium text-gray-200">
                  {getUserDisplayName()}
                </span>
                <span className="text-xs text-gray-300">
                  {sanityUser?.role === 'host' ? 'Anfitrión' : 
                   sanityUser?.role === 'admin' ? 'Administrador' : 'Comensal'}
                </span>
              </div>
            </DropdownItem>

            <DropdownDivider /> 
            
            <DropdownItem href="/profile" className="px-4 py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi Perfil
              </div>
            </DropdownItem>
            
            <DropdownItem href="/settings" className="px-4 py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </div>
            </DropdownItem>
            
            <DropdownItem 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-red-600 hover:text-red-700"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </div>
            </DropdownItem>
          </Dropdown>
        </div>
      </NavbarCollapse>
    </FlowbiteNavbar>
  );
}
