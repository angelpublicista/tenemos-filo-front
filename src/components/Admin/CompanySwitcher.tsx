"use client";

import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { BiStore } from 'react-icons/bi';
import { useAuth } from '@/lib/auth/AuthContext';
import { listMyCompanies } from '@/lib/api/admin';

type Opcion = { id: string; nombre: string };

/**
 * Selector de empresa para un HOST con varias: elige en cual esta trabajando.
 *
 * Al elegir una el cliente HTTP manda X-Acting-Company y el API la usa como
 * companyId, asi que todas las pantallas operan sobre ella. El API valida el
 * alcance: un host solo puede elegir las suyas. El admin no usa este
 * selector: no opera como otra empresa.
 */
export default function CompanySwitcher() {
  const { sanityUser, activeCompanyId, setActiveCompany } = useAuth();
  const [opciones, setOpciones] = useState<Opcion[]>([]);

  const esHost = sanityUser?.role === 'host';

  useEffect(() => {
    if (!esHost) return;
    let cancelado = false;

    listMyCompanies()
      .then((items) => {
        if (!cancelado) setOpciones(items.map((e) => ({ id: e.id, nombre: e.companyName })));
      })
      .catch(() => {
        // Si falla, el selector no se pinta; no bloqueamos la navegacion.
      });

    return () => {
      cancelado = true;
    };
  }, [esHost]);

  // A un anfitrion con una sola empresa el selector no le aporta nada.
  if (!esHost || opciones.length < 2) return null;

  // El host siempre trabaja dentro de una empresa: si no ha elegido, la
  // activa es la que ya trae su perfil.
  const efectiva =
    opciones.find((e) => e.id === activeCompanyId) ??
    opciones.find((e) => e.id === sanityUser?.companyId);

  const elegir = (id: string) => {
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
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm max-w-[15rem] border-[#F26726] bg-[#F26726]/10 text-[#F26726]">
          <BiStore className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline text-xs opacity-70 mr-1">Empresa:</span>
            {efectiva?.nombre}
          </span>
        </span>
      }
    >
      {opciones.map((e) => (
        <DropdownItem key={e.id} onClick={() => elegir(e.id)}>
          <span className={e.id === efectiva?.id ? 'font-semibold text-[#F26726]' : ''}>
            {e.nombre}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
