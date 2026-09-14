"use client";

import React from 'react';
import Link from 'next/link';
import { Checkbox, Label } from 'flowbite-react';
import { Menu } from '@/types';
import { contarPlatos } from './MenuEditor';

interface MenuSelectorProps {
  menus: Menu[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Que cartas ofrece esta experiencia.
 *
 * Es el mismo patron que el selector de sedes, con una diferencia: cuando no
 * hay ninguna carta se enlaza al modulo en vez de abrir un modal. Crear una
 * carta es una pantalla entera, y abrirla encima perderia la experiencia a
 * medio rellenar.
 */
export default function MenuSelector({ menus, selected, onChange }: MenuSelectorProps) {
  const alternar = (id: string, marcado: boolean) =>
    onChange(marcado ? [...selected, id] : selected.filter((x) => x !== id));

  return (
    <div>
      <Label>Menús (opcional, selecciona uno o más)</Label>
      <p className="text-sm text-gray-500 mb-2">
        Lo que se come en esta experiencia. Puedes ofrecer varias cartas: por
        ejemplo la normal y la vegetariana.
      </p>
      <div className="mt-2 space-y-2 border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
        {menus.length > 0 ? (
          menus.map((menu) => (
            <div key={menu._id} className="flex items-center">
              <Checkbox
                id={`menu-${menu._id}`}
                checked={selected.includes(menu._id)}
                onChange={(e) => alternar(menu._id, e.target.checked)}
                className="text-[#F26726] focus:ring-[#F26726]"
              />
              <Label htmlFor={`menu-${menu._id}`} className="ml-2 cursor-pointer">
                {menu.name}
                <span className="text-gray-500 text-sm ml-2">
                  - {contarPlatos(menu.sections)} plato
                  {contarPlatos(menu.sections) === 1 ? '' : 's'}
                </span>
              </Label>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No tienes cartas registradas.{' '}
            <Link
              href="/dashboard/menus/crear"
              target="_blank"
              className="text-[#F26726] hover:underline font-medium"
            >
              Crear una carta
            </Link>
          </p>
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          {selected.length} carta{selected.length > 1 ? 's' : ''} seleccionada
          {selected.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
