"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Label, TextInput, Textarea } from 'flowbite-react';
import { Menu, MenuSection } from '@/types';
import { createMenuInSanity, updateMenuInSanity } from '@/lib/sanity/menuService';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import MenuEditor, { limpiarVacios, seccionVacia } from './MenuEditor';

interface MenuFormProps {
  /** null = carta nueva. */
  menu: Menu | null;
}

/**
 * Alta y edicion comparten formulario a proposito: son la misma pantalla con
 * distinto punto de partida, y tenerlas duplicadas garantiza que tarde o
 * temprano una se quede atras de la otra.
 */
export default function MenuForm({ menu }: MenuFormProps) {
  const router = useRouter();
  const { showSuccess, showError } = useSweetAlert();

  const [nombre, setNombre] = useState(menu?.name ?? '');
  const [descripcion, setDescripcion] = useState(menu?.description ?? '');
  const [secciones, setSecciones] = useState<MenuSection[]>(
    // Una carta nueva arranca con una seccion: es lo que se va a hacer igual,
    // y el lienzo del todo vacio no ayuda a empezar.
    menu?.sections?.length ? menu.sections : [seccionVacia()],
  );
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) {
      showError('Falta el nombre', 'Ponle un nombre a la carta para poder identificarla.');
      return;
    }

    const limpias = limpiarVacios(secciones);
    if (limpias.length === 0) {
      showError(
        'La carta está vacía',
        'Añade al menos una sección con nombre para poder guardarla.',
      );
      return;
    }

    try {
      setGuardando(true);
      const datos = {
        name: nombre.trim(),
        description: descripcion.trim() || undefined,
        sections: limpias,
      };

      if (menu) {
        await updateMenuInSanity(menu._id, datos);
        await showSuccess('Carta actualizada');
      } else {
        await createMenuInSanity(datos);
        await showSuccess('Carta creada');
      }
      router.push('/dashboard/menus');
    } catch (error) {
      console.error('Error guardando la carta:', error);
      showError('No se pudo guardar la carta', 'Inténtalo de nuevo en un momento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#334C5D] mb-1">
          {menu ? 'Editar carta' : 'Nueva carta'}
        </h1>
        <p className="text-gray-600">
          Agrupa los platos en secciones. Luego podrás ofrecerla en las experiencias que quieras.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <Label color="gray" className="mb-2 block">
            Nombre de la carta <span className="text-red-500">*</span>
          </Label>
          <TextInput
            color="white"
            placeholder="Ej: Menú Degustación"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <Label color="gray" className="mb-2 block">
            Descripción
          </Label>
          <Textarea
            rows={2}
            placeholder="Ej: Cinco tiempos con maridaje."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-[#334C5D] mb-3">Secciones</h2>
      <MenuEditor sections={secciones} onChange={setSecciones} />

      {menu && menu.experiences && menu.experiences.length > 0 && (
        <p className="mt-6 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-4">
          Esta carta se usa en{' '}
          <span className="font-medium">{menu.experiences.map((e) => e.title).join(', ')}</span>.
          Lo que cambies aquí cambia en todas.
        </p>
      )}

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push('/dashboard/menus')}
          className="text-sm text-gray-500 hover:text-[#F26726] transition-colors underline cursor-pointer"
        >
          Cancelar
        </button>
        <Button type="button" color="primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : menu ? 'Guardar cambios' : 'Crear carta'}
        </Button>
      </div>
    </div>
  );
}
