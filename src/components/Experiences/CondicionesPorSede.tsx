"use client";

/**
 * Las condiciones de una experiencia en cada una de sus sedes.
 *
 * Una experiencia es una pieza con la que se arma el catálogo: el mismo taller
 * puede estar en el local del centro como abierta —cupos que cualquiera compra
 * sueltos— y en la finca como privada, con otro aforo, otro precio y otra
 * anticipación. Hasta ahora todas esas condiciones eran de la experiencia y la
 * segunda sede heredaba a la fuerza las de la primera.
 *
 * Cada sede arranca en «igual que la experiencia», que es la respuesta más
 * común: solo se declara lo que de verdad cambia.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Label, Select, TextInput, Textarea } from 'flowbite-react';
import { AiOutlineUndo } from 'react-icons/ai';
import { BiMap } from 'react-icons/bi';
import type { SedeDeExperiencia } from '@/types';
import {
  fijarCondicionesDeSede,
  getSedesDeExperiencia,
  soltarCondicionesDeSede,
  type CondicionesDeSede,
} from '@/lib/api/sedesDeExperiencia';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import Loader from '@/components/Loader';

interface Props {
  experienceId: string;
  /** Se vuelve a leer cuando cambian las sedes elegidas arriba. */
  sedesElegidas: string[];
}

/** Los campos del formulario, como texto: un input vacío es «hereda». */
interface Borrador {
  kind: '' | 'ABIERTA' | 'PRIVADA';
  capacity: string;
  minCapacity: string;
  basePrice: string;
  prepTime: string;
  cleanupTime: string;
  minimumNotice: string;
  notes: string;
  isPublished: boolean;
}

const vacio: Borrador = {
  kind: '',
  capacity: '',
  minCapacity: '',
  basePrice: '',
  prepTime: '',
  cleanupTime: '',
  minimumNotice: '',
  notes: '',
  isPublished: true,
};

const numero = (v: string): number | null => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const pesos = (v: number) =>
  v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function CondicionesPorSede({ experienceId, sedesElegidas }: Props) {
  const { showSuccess, showError, showConfirmation } = useSweetAlert();
  const [sedes, setSedes] = useState<SedeDeExperiencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(vacio);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setSedes(await getSedesDeExperiencia(experienceId));
    } catch {
      setSedes([]);
    } finally {
      setCargando(false);
    }
  }, [experienceId]);

  // `sedesElegidas.length` en las dependencias: marcar o desmarcar una sede
  // arriba cambia qué filas tienen sentido, aunque el vínculo no exista hasta
  // que se guarde la experiencia.
  useEffect(() => {
    void cargar();
  }, [cargar, sedesElegidas.length]);

  const editar = (sede: SedeDeExperiencia) => {
    const propio = sede.condiciones;
    setAbierta(sede.id);
    setBorrador({
      kind: propio.kind ?? '',
      capacity: propio.capacity === null ? '' : String(propio.capacity),
      minCapacity: propio.minCapacity === null ? '' : String(propio.minCapacity),
      basePrice: propio.basePrice === null ? '' : String(propio.basePrice),
      prepTime: propio.prepTime === null ? '' : String(propio.prepTime),
      cleanupTime: propio.cleanupTime === null ? '' : String(propio.cleanupTime),
      minimumNotice: propio.minimumNotice === null ? '' : String(propio.minimumNotice),
      notes: '',
      isPublished: propio.isPublished,
    });
  };

  const guardar = async (locationId: string) => {
    const datos: CondicionesDeSede = {
      kind: borrador.kind === '' ? null : borrador.kind,
      capacity: numero(borrador.capacity),
      minCapacity: numero(borrador.minCapacity),
      basePrice: numero(borrador.basePrice),
      prepTime: numero(borrador.prepTime),
      cleanupTime: numero(borrador.cleanupTime),
      minimumNotice: numero(borrador.minimumNotice),
      notes: borrador.notes.trim() === '' ? null : borrador.notes.trim(),
      isPublished: borrador.isPublished,
    };
    setGuardando(true);
    try {
      setSedes(await fijarCondicionesDeSede(experienceId, locationId, datos));
      setAbierta(null);
      showSuccess('Condiciones de la sede guardadas');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'No se pudieron guardar las condiciones');
    } finally {
      setGuardando(false);
    }
  };

  const soltar = async (sede: SedeDeExperiencia) => {
    const confirmado = await showConfirmation(
      `¿Dejar ${sede.name} igual que la experiencia?`,
      'Se borran las condiciones propias de esta sede. La sede sigue ofreciendo la experiencia.',
      'Sí, igualar',
    );
    if (!confirmado) return;
    try {
      setSedes(await soltarCondicionesDeSede(experienceId, sede.id));
      setAbierta(null);
      showSuccess(`${sede.name} vuelve a las condiciones de la experiencia`);
    } catch {
      showError('No se pudo igualar la sede');
    }
  };

  if (cargando) return <Loader />;

  if (sedes.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Elige al menos una sede arriba y guarda la experiencia. Después podrás darle a cada sede
        sus propias condiciones.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        La misma experiencia puede ofrecerse distinto en cada sede. Lo que dejes en blanco se
        hereda de la experiencia.
      </p>

      {sedes.map((sede) => {
        const c = sede.condiciones;
        const resumen = !c.isPublished
          ? 'Retirada de esta sede'
          : [
              c.kind === 'PRIVADA' ? 'Privada: el sitio completo' : '',
              c.kind === 'ABIERTA' ? 'Abierta: cupos sueltos' : '',
              c.capacity !== null ? `Hasta ${c.capacity} personas` : '',
              c.basePrice !== null ? `${pesos(Number(c.basePrice))} por persona` : '',
              c.minimumNotice ? `${c.minimumNotice} h de anticipación` : '',
            ]
              .filter(Boolean)
              .join(' · ');

        return (
          <div key={sede.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <BiMap className="text-[#F26726]" /> {sede.name}
                  {sede.isMain && (
                    <span className="text-xs text-gray-400 font-normal">(Principal)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{resumen}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="xs" color="light" onClick={() => void soltar(sede)}>
                  <AiOutlineUndo className="mr-1" /> Igualar
                </Button>
                <Button
                  size="xs"
                  color="light"
                  onClick={() => (abierta === sede.id ? setAbierta(null) : editar(sede))}
                >
                  {abierta === sede.id ? 'Cerrar' : 'Condiciones'}
                </Button>
              </div>
            </div>

            {abierta === sede.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`pub-${sede.id}`}
                    checked={borrador.isPublished}
                    onChange={(e) => setBorrador({ ...borrador, isPublished: e.target.checked })}
                    className="text-[#F26726] focus:ring-[#F26726]"
                  />
                  <Label htmlFor={`pub-${sede.id}`} className="cursor-pointer">
                    Se ofrece en esta sede
                  </Label>
                </div>

                <div>
                  <Label htmlFor={`kind-${sede.id}`}>Cómo se vende aquí</Label>
                  <Select
                    id={`kind-${sede.id}`}
                    value={borrador.kind}
                    onChange={(e) =>
                      setBorrador({ ...borrador, kind: e.target.value as Borrador['kind'] })
                    }
                    className="mt-1"
                  >
                    <option value="">Como venga (se cuentan cupos)</option>
                    <option value="ABIERTA">Abierta: cupos sueltos</option>
                    <option value="PRIVADA">Privada: un grupo se queda el sitio</option>
                  </Select>
                  {borrador.kind === 'PRIVADA' && (
                    <p className="text-xs text-gray-500 mt-1">
                      La primera reserva se queda la franja entera, aunque sobre aforo.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`cap-${sede.id}`}>Cupos por sesión</Label>
                    <TextInput
                      id={`cap-${sede.id}`}
                      type="number"
                      min={1}
                      value={borrador.capacity}
                      placeholder="Los de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, capacity: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`min-${sede.id}`}>Cupos mínimos</Label>
                    <TextInput
                      id={`min-${sede.id}`}
                      type="number"
                      min={0}
                      value={borrador.minCapacity}
                      placeholder="Los de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, minCapacity: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`precio-${sede.id}`}>Precio por persona</Label>
                    <TextInput
                      id={`precio-${sede.id}`}
                      type="number"
                      min={0}
                      value={borrador.basePrice}
                      placeholder="El de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, basePrice: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`aviso-${sede.id}`}>Anticipación mínima (horas)</Label>
                    <TextInput
                      id={`aviso-${sede.id}`}
                      type="number"
                      min={0}
                      value={borrador.minimumNotice}
                      placeholder="La de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, minimumNotice: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`prep-${sede.id}`}>Preparación (minutos)</Label>
                    <TextInput
                      id={`prep-${sede.id}`}
                      type="number"
                      min={0}
                      value={borrador.prepTime}
                      placeholder="La de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, prepTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`limp-${sede.id}`}>Limpieza después (minutos)</Label>
                    <TextInput
                      id={`limp-${sede.id}`}
                      type="number"
                      min={0}
                      value={borrador.cleanupTime}
                      placeholder="La de la experiencia"
                      onChange={(e) => setBorrador({ ...borrador, cleanupTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`notas-${sede.id}`}>Notas de esta sede</Label>
                  <Textarea
                    id={`notas-${sede.id}`}
                    rows={2}
                    value={borrador.notes}
                    placeholder="Lo que solo pasa aquí. No se muestra en el catálogo."
                    onChange={(e) => setBorrador({ ...borrador, notes: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button size="sm" color="light" onClick={() => setAbierta(null)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={guardando}
                    onClick={() => void guardar(sede.id)}
                    className="bg-[#F26726] hover:bg-[#d9551c]"
                  >
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
