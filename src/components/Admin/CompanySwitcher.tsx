"use client";

import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-react';
import { BiStore } from 'react-icons/bi';
import { useAuth } from '@/lib/auth/AuthContext';
import { listCompanies, listMyCompanies } from '@/lib/api/admin';

type Opcion = { id: string; nombre: string; detalle?: string };

/**
 * Selector de empresa activa. Sirve a dos casos distintos:
 *
 * - ADMIN: elige sobre que empresa de la plataforma opera ("actuando como").
 *   Sin empresa elegida ve el agregado global.
 * - HOST con varias empresas: elige en cual esta trabajando.
 *
 * En ambos, al elegir una el cliente HTTP manda X-Acting-Company y el API
 * la usa como companyId, asi que todas las pantallas operan sobre ella.
 * El API valida el alcance: un host solo puede elegir las suyas.
 */
export default function CompanySwitcher() {
  const { sanityUser, activeCompanyId, setActiveCompany } = useAuth();
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [cargando, setCargando] = useState(false);

  const esAdmin = sanityUser?.role === 'admin';
  const esHost = sanityUser?.role === 'host';

  useEffect(() => {
    if (!esAdmin && !esHost) return;
    let cancelado = false;
    setCargando(true);

    const pedir = esAdmin
      ? listCompanies({ pageSize: 100 }).then(({ items }) =>
          items
            .filter((e) => !e.deletedAt)
            .map((e) => ({
              id: e.id,
              nombre: e.companyName,
              detalle: `${e._count.experiences} experiencias · ${e._count.users} usuarios`,
            })),
        )
      : listMyCompanies().then((items) =>
          items.map((e) => ({ id: e.id, nombre: e.companyName })),
        );

    pedir
      .then((items) => {
        if (!cancelado) setOpciones(items);
      })
      .catch(() => {
        // Si falla, el selector no se pinta; no bloqueamos la navegacion.
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [esAdmin, esHost]);

  if (!esAdmin && !esHost) return null;
  // A un anfitrion con una sola empresa el selector no le aporta nada.
  if (esHost && opciones.length < 2) return null;

  const activa = opciones.find((e) => e.id === activeCompanyId);
  // El host siempre trabaja dentro de una empresa: si no ha elegido, la
  // activa es la que ya trae su perfil.
  const efectiva = activa ?? (esHost ? opciones.find((e) => e.id === sanityUser?.companyId) : undefined);
  const etiqueta = efectiva ? efectiva.nombre : 'Toda la plataforma';
  const resaltada = !!efectiva;

  const elegir = (id: string | null) => {
    if (id === activeCompanyId) return;
    setActiveCompany(id);
    // Cambiar de empresa cambia el alcance de lo ya cargado en pantalla.
    window.location.reload();
  };

  return (
    <Dropdown
      arrowIcon
      inline
      label={
        <span
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm max-w-[15rem] ${
            resaltada
              ? 'border-[#F26726] bg-[#F26726]/10 text-[#F26726]'
              : 'border-gray-200 text-gray-600'
          }`}
        >
          <BiStore className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline text-xs opacity-70 mr-1">
              {esAdmin ? (efectiva ? 'Actuando como:' : 'Viendo:') : 'Empresa:'}
            </span>
            {etiqueta}
          </span>
        </span>
      }
    >
      {/* Solo el admin tiene vista global; un host siempre esta en una empresa. */}
      {esAdmin && (
        <>
          <DropdownItem onClick={() => elegir(null)}>
            <span className="flex flex-col items-start text-left">
              <span className={!activeCompanyId ? 'font-semibold text-[#F26726]' : ''}>
                Toda la plataforma
              </span>
              <span className="text-xs text-gray-500">Vista global de administración</span>
            </span>
          </DropdownItem>
          <DropdownDivider />
        </>
      )}

      {cargando && <DropdownItem disabled>Cargando empresas...</DropdownItem>}
      {!cargando && opciones.length === 0 && <DropdownItem disabled>No hay empresas</DropdownItem>}
      {opciones.map((e) => (
        <DropdownItem key={e.id} onClick={() => elegir(e.id)}>
          <span className="flex flex-col items-start text-left">
            <span className={e.id === efectiva?.id ? 'font-semibold text-[#F26726]' : ''}>
              {e.nombre}
            </span>
            {e.detalle && <span className="text-xs text-gray-500">{e.detalle}</span>}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
