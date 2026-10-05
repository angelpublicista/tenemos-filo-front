"use client";

import React, { useState } from 'react';
import Avatar from '@/components/Avatar';
import { useAuth } from "@/lib/auth/AuthContext";
import {
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineSetting,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineShareAlt,
  AiOutlineDollar,
  AiOutlineWarning
} from 'react-icons/ai';
import {
  BiMap,
  BiRestaurant,
  BiStore,
  BiChevronLeft,
  BiChevronRight,
  BiX
} from 'react-icons/bi';
import { HiOutlineCash, HiOutlineClipboardList, HiOutlineCreditCard, HiOutlineDocumentText, HiOutlineGlobeAlt, HiOutlineKey, HiOutlineSparkles } from 'react-icons/hi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { sanityUser, activeCompanyId, esPanelRevendedor } = useAuth();
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

  // Un revendedor pertenece a una empresa, pero no la opera: no tiene
  // experiencias, ni sedes, ni reservas que gestionar. Enseñarle esas
  // pantallas le muestra datos de un anfitrion que no es el, o le da un
  // 403. Lo suyo son sus comisiones y sus claves de API.
  //
  // Vale igual para el admin que actua como una empresa de revendedor:
  // esa empresa no tiene sedes ni experiencias por mucho que quien mire
  // sea administrador. El menu lo decide el negocio, no quien lo abre.
  const esReseller = esPanelRevendedor;

  // Un comensal solo reserva. El menu de anfitrion no le sirve: la mitad
  // de esas pantallas le responden 403 y la otra mitad le enseña datos de
  // empresas que no son suyas.
  const esComensal = sanityUser?.role === 'guest';

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

  // Las entradas de Integraciones. Se arman aparte para poder preguntar si
  // quedo alguna antes de pintar la cabecera.
  const integraciones: NavItem[] = [
    // Con que pasarela cobra el anfitrion. Solo quien opera experiencias
    // propias: un revendedor no cobra, cobra el anfitrion de la experiencia.
    ...(operaComoEmpresa && !esReseller
      ? [
          {
            name: 'Pagos',
            href: '/dashboard/integraciones/pagos',
            icon: HiOutlineCreditCard,
            current: pathname === '/dashboard/integraciones/pagos',
            enabled: true,
          },
        ]
      : []),
    // El agente de IA y su WhatsApp. Es una integracion como las demas: conecta
    // a FILO con algo de fuera.
    ...(operaComoEmpresa && !esReseller
      ? [
          {
            name: 'Agente IA',
            href: '/dashboard/integraciones/agente',
            icon: HiOutlineSparkles,
            current: pathname === '/dashboard/integraciones/agente',
            enabled: true,
          },
        ]
      : []),
    ...(!esAdminSinEmpresa && !esReseller && !esComensal
      ? [
          {
            name: 'Canales de venta',
            href: '/dashboard/canales',
            icon: HiOutlineGlobeAlt,
            current: pathname === '/dashboard/canales',
            enabled: true,
          },
        ]
      : []),
    // El admin entra siempre, opere o no como empresa: la clave cuelga de
    // una empresa, pero desde la pantalla elige cual. Antes se le ocultaba
    // la entrada por no tener empresa propia, y no habia forma de llegar.
    ...(esReseller || sanityUser?.role === 'admin'
      ? [
          {
            name: 'Claves de API',
            href: '/dashboard/api-keys',
            icon: HiOutlineKey,
            current: pathname === '/dashboard/api-keys',
            enabled: true,
          },
        ]
      : []),
  ];

  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: AiOutlineHome,
      current: pathname === '/dashboard',
      enabled: true
    },
    ...(operaComoEmpresa && !esReseller ? [
      {
        name: 'Mis Sedes',
        href: '/dashboard/locations',
        icon: BiMap,
        current: pathname === '/dashboard/locations',
        enabled: true
      },
      {
        name: 'Menús',
        href: '/dashboard/menus',
        icon: BiRestaurant,
        // startsWith y no ===: el modulo tiene subrutas (crear, editar) y el
        // item debe quedarse marcado dentro de ellas.
        current: pathname?.startsWith('/dashboard/menus') ?? false,
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
    ...(esComensal ? [
      {
        name: 'Mis reservas',
        href: '/dashboard/mis-reservas',
        icon: AiOutlineCalendar,
        current: pathname === '/dashboard/mis-reservas',
        enabled: true
      }
    ] as NavItem[] : []),
    ...(!esAdminSinEmpresa && !esReseller && !esComensal ? [
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
        name: 'Mis ingresos',
        href: '/dashboard/ingresos',
        icon: HiOutlineCash,
        current: pathname === '/dashboard/ingresos',
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
    ...(operaComoEmpresa && !esReseller ? [
      {
        name: 'CRM',
        href: '/dashboard/crm',
        icon: HiOutlineDocumentText,
        current: pathname?.startsWith('/dashboard/crm') ?? false,
        enabled: true
      }
    ] as NavItem[] : []),
    ...(esReseller ? [
      {
        name: 'Mi catálogo',
        href: '/dashboard/mi-catalogo',
        icon: AiOutlineShareAlt,
        current: pathname === '/dashboard/mi-catalogo',
        enabled: true
      },
      {
        // TR-25. Lo vendido y quién apareció. Separado de "Mis ingresos"
        // porque eso es dinero cobrado y esto es operación.
        name: 'Ventas de mi canal',
        href: '/dashboard/ventas-de-mi-canal',
        icon: HiOutlineClipboardList,
        current: pathname === '/dashboard/ventas-de-mi-canal',
        enabled: true
      },
      {
        name: 'Mis ingresos',
        href: '/dashboard/ingresos',
        icon: HiOutlineCash,
        current: pathname === '/dashboard/ingresos',
        enabled: true
      }
    ] as NavItem[] : []),
    // Todo lo que conecta a FILO con algo de fuera, en un solo sitio: con
    // quien se cobra, por donde se vende y con que se integra. Antes estaban
    // repartidos —el cobro escondido dentro de Configuracion, los canales
    // entre las herramientas propias— y no habia forma de saber donde buscar.
    //
    // La cabecera solo aparece si debajo hay algo: cada entrada tiene su
    // propia condicion y un revendedor, por ejemplo, solo ve las claves.
    ...(integraciones.length > 0
      ? ([{ type: 'section', name: 'Integraciones' }, ...integraciones] as NavItem[])
      : []),
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
        name: 'Dispersiones',
        href: '/dashboard/admin/dispersiones',
        icon: AiOutlineDollar,
        current: pathname === '/dashboard/admin/dispersiones',
        enabled: true
      },
      {
        // TR-44. La bandeja de cobros que llegaron sin reserva. Va aquí y no
        // en Dispersiones porque no es dinero que haya que mover: es dinero
        // que no debería estar donde está.
        name: 'Cobros sin reserva',
        href: '/dashboard/admin/cobros-sin-reserva',
        icon: AiOutlineWarning,
        current: pathname === '/dashboard/admin/cobros-sin-reserva',
        enabled: true
      },
      {
        name: 'Actividad',
        href: '/dashboard/admin/actividad',
        icon: HiOutlineDocumentText,
        current: pathname === '/dashboard/admin/actividad',
        enabled: true
      },
      {
        name: 'Ajustes',
        href: '/dashboard/admin/ajustes',
        icon: AiOutlineSetting,
        current: pathname === '/dashboard/admin/ajustes',
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
    ...(operaComoEmpresa && !esReseller ? [
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
  sanityUser: { name?: string; role?: string; image?: string; email?: string } | null | undefined;
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
          <Avatar
            imagen={sanityUser?.image}
            nombre={sanityUser?.name}
            email={sanityUser?.email}
            tamaño="sm"
          />
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
