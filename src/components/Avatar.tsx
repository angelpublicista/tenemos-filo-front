"use client";

import React from 'react';
import Image from 'next/image';
import { urlDeImagen } from '@/lib/images';

interface AvatarProps {
  /** URL de la foto. Sin ella se pintan las iniciales. */
  imagen?: string | null;
  nombre?: string | null;
  /** Respaldo cuando no hay nombre: de un correo sale al menos una letra. */
  email?: string | null;
  tamaño?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const TAMAÑOS = {
  sm: { caja: 'w-8 h-8', texto: 'text-xs', px: 32 },
  md: { caja: 'w-10 h-10', texto: 'text-sm', px: 40 },
  lg: { caja: 'w-16 h-16', texto: 'text-xl', px: 64 },
  xl: { caja: 'w-24 h-24', texto: 'text-3xl', px: 96 },
} as const;

/**
 * Las iniciales de una persona.
 *
 * Dos letras si hay nombre y apellido, una si solo hay nombre. De un correo se
 * toma la primera letra, que es mejor que un hueco. Nunca devuelve vacio: un
 * circulo en blanco parece que algo fallo.
 */
export function iniciales(nombre?: string | null, email?: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const correo = (email ?? '').trim();
  if (correo) return correo[0].toUpperCase();
  return '?';
}

/**
 * Foto de perfil, o las iniciales si no hay.
 *
 * Existe porque cada sitio lo resolvia por su cuenta: la barra superior y el
 * menu lateral pintaban `name.charAt(0)` cada uno con sus estilos, y ninguno
 * miraba si la persona tenia foto —aunque el campo existia en el API desde
 * siempre—.
 */
export default function Avatar({
  imagen,
  nombre,
  email,
  tamaño = 'md',
  className = '',
}: AvatarProps) {
  const t = TAMAÑOS[tamaño];
  const url = imagen ? urlDeImagen(imagen) : null;

  if (url) {
    return (
      <div
        className={`${t.caja} rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative ${className}`}
      >
        <Image
          src={url}
          alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'}
          fill
          className="object-cover"
          unoptimized
          sizes={`${t.px}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${t.caja} ${t.texto} rounded-full bg-[#F26726] text-white font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
      // Que un lector de pantalla no lea "JD" suelto sin decir de quien es.
      aria-label={nombre ? `Foto de perfil de ${nombre}` : 'Foto de perfil'}
      role="img"
    >
      {iniciales(nombre, email)}
    </div>
  );
}
