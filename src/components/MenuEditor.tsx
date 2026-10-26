"use client";

import React, { useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineUp, AiOutlineDown } from 'react-icons/ai';
import { MenuSection, MenuItem } from '@/types';
import { ImageUpload } from './ImageUpload';

interface MenuEditorProps {
  sections: MenuSection[];
  onChange: (sections: MenuSection[]) => void;
}

let contador = 0;
const nuevaClave = () => `k${Date.now().toString(36)}${(contador++).toString(36)}`;

const seccionVacia = (): MenuSection => ({ _key: nuevaClave(), name: '', items: [] });
const platoVacio = (): MenuItem => ({ _key: nuevaClave(), name: '' });

/**
 * Las secciones de un menu y sus platos.
 *
 * Se edita todo junto y se guarda de una vez: es lo que hace de una carta una
 * carta y no una lista de platos sueltos. Por eso el componente no sabe nada
 * de guardar — recibe las secciones y devuelve las secciones; quien lo usa
 * decide cuando mandarlas al API.
 */
export default function MenuEditor({ sections, onChange }: MenuEditorProps) {
  // Que secciones estan desplegadas. Al abrir una carta larga, verla entera
  // desplegada no deja encontrar nada; plegada se ve la estructura de un vistazo.
  const [abiertas, setAbiertas] = useState<Set<string>>(
    () => new Set(sections.map((s) => s._key ?? '')),
  );

  const alternar = (clave: string) =>
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });

  const cambiarSeccion = (i: number, cambios: Partial<MenuSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...cambios } : s)));

  const moverSeccion = (i: number, delta: number) => {
    const destino = i + delta;
    if (destino < 0 || destino >= sections.length) return;
    const copia = [...sections];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onChange(copia);
  };

  const agregarSeccion = () => {
    const nueva = seccionVacia();
    setAbiertas((prev) => new Set(prev).add(nueva._key!));
    onChange([...sections, nueva]);
  };

  const cambiarPlato = (iSeccion: number, iPlato: number, cambios: Partial<MenuItem>) =>
    cambiarSeccion(iSeccion, {
      items: sections[iSeccion].items.map((it, idx) =>
        idx === iPlato ? { ...it, ...cambios } : it,
      ),
    });

  const moverPlato = (iSeccion: number, iPlato: number, delta: number) => {
    const items = sections[iSeccion].items;
    const destino = iPlato + delta;
    if (destino < 0 || destino >= items.length) return;
    const copia = [...items];
    [copia[iPlato], copia[destino]] = [copia[destino], copia[iPlato]];
    cambiarSeccion(iSeccion, { items: copia });
  };

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <div className="text-center border border-dashed border-gray-300 rounded-lg p-8">
          <p className="text-gray-500 mb-4">
            Tu carta todavía no tiene secciones. Una sección agrupa platos:
            entradas, fuertes, postres…
          </p>
          <Button type="button" color="primary" onClick={agregarSeccion}>
            <AiOutlinePlus className="mr-2" /> Añadir la primera sección
          </Button>
        </div>
      )}

      {sections.map((seccion, i) => {
        const clave = seccion._key ?? String(i);
        const abierta = abiertas.has(clave);
        return (
          <div key={clave} className="border border-gray-200 rounded-lg bg-white">
            {/* Cabecera de la sección */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => alternar(clave)}
                className="text-gray-400 hover:text-[#334C5D] cursor-pointer shrink-0"
                aria-label={abierta ? 'Plegar sección' : 'Desplegar sección'}
              >
                {abierta ? <AiOutlineUp /> : <AiOutlineDown />}
              </button>

              <TextInput
                className="flex-1"
                color="white"
                placeholder="Nombre de la sección (ej: Entradas)"
                value={seccion.name}
                onChange={(e) => cambiarSeccion(i, { name: e.target.value })}
              />

              <span className="text-sm text-gray-500 shrink-0 hidden sm:inline">
                {seccion.items.length} plato{seccion.items.length === 1 ? '' : 's'}
              </span>

              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => moverSeccion(i, -1)}
                  disabled={i === 0}
                  className="p-2 text-gray-400 hover:text-[#334C5D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Subir sección"
                >
                  <AiOutlineUp />
                </button>
                <button
                  type="button"
                  onClick={() => moverSeccion(i, 1)}
                  disabled={i === sections.length - 1}
                  className="p-2 text-gray-400 hover:text-[#334C5D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Bajar sección"
                >
                  <AiOutlineDown />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(sections.filter((_, idx) => idx !== i))}
                  className="p-2 text-gray-400 hover:text-red-600 cursor-pointer"
                  aria-label="Eliminar sección"
                >
                  <AiOutlineDelete />
                </button>
              </div>
            </div>

            {abierta && (
              <div className="p-4 space-y-4">
                {seccion.items.map((plato, j) => (
                  <div
                    key={plato._key ?? j}
                    className="flex gap-4 items-start bg-gray-50 rounded-lg p-3"
                  >
                    <div className="shrink-0">
                      <ImageUpload
                        label=""
                        compact
                        placeholder="Subir foto"
                        scope="menus"
                        value={plato.image || undefined}
                        onChange={(url) => cambiarPlato(i, j, { image: url || undefined })}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <TextInput
                          className="sm:col-span-2"
                          color="white"
                          placeholder="Nombre del plato"
                          value={plato.name}
                          onChange={(e) => cambiarPlato(i, j, { name: e.target.value })}
                        />
                        <TextInput
                          type="number"
                          min={0}
                          color="white"
                          placeholder="Precio (opcional)"
                          value={plato.price ?? ''}
                          onChange={(e) =>
                            cambiarPlato(i, j, {
                              price: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <TextInput
                        color="white"
                        placeholder="Descripción (opcional)"
                        value={plato.description ?? ''}
                        onChange={(e) =>
                          cambiarPlato(i, j, { description: e.target.value || undefined })
                        }
                      />
                    </div>

                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moverPlato(i, j, -1)}
                        disabled={j === 0}
                        className="p-1 text-gray-400 hover:text-[#334C5D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Subir plato"
                      >
                        <AiOutlineUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverPlato(i, j, 1)}
                        disabled={j === seccion.items.length - 1}
                        className="p-1 text-gray-400 hover:text-[#334C5D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Bajar plato"
                      >
                        <AiOutlineDown />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          cambiarSeccion(i, { items: seccion.items.filter((_, idx) => idx !== j) })
                        }
                        className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                        aria-label="Eliminar plato"
                      >
                        <AiOutlineDelete />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    cambiarSeccion(i, { items: [...seccion.items, platoVacio()] })
                  }
                  className="text-sm text-[#F26726] hover:underline font-medium cursor-pointer"
                >
                  + Añadir plato
                </button>
              </div>
            )}
          </div>
        );
      })}

      {sections.length > 0 && (
        <Button type="button" color="gray" onClick={agregarSeccion}>
          <AiOutlinePlus className="mr-2" /> Añadir sección
        </Button>
      )}
    </div>
  );
}

/**
 * Quita las secciones y platos que quedaron sin nombre.
 *
 * El editor deja añadir filas vacias mientras se escribe —es lo natural— pero
 * el API las rechaza, asi que se limpian al guardar en vez de dar un error por
 * algo que la persona ya iba a borrar.
 */
export function limpiarVacios(sections: MenuSection[]): MenuSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.name.trim() !== '') }))
    .filter((s) => s.name.trim() !== '');
}

export { seccionVacia };

/** Cuenta los platos de una carta. Se usa en el listado y en el editor. */
export function contarPlatos(sections: MenuSection[]): number {
  return sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
}
