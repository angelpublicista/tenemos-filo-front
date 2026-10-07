"use client";

/**
 * Publicar una experiencia en un escenario.
 *
 * La experiencia es la pieza —qué se hace, cuánto dura, qué incluye— y se crea
 * en su propio panel. Aquí se decide usarla: en qué sede, con qué modalidad y
 * con qué condiciones. La misma pieza puede ir al local del centro como
 * abierta, con cupos sueltos, y a la finca como privada y a otro precio.
 *
 * Lo que se deja en blanco se hereda de la pieza, que es la respuesta más
 * común: se publica igual y se cambia una cosa.
 */

import React, { useState } from 'react';
import { Button, Checkbox, Label, Select, TextInput, Textarea } from 'flowbite-react';
import type { CondicionesDePublicacion, Publicacion } from '@/lib/api/catalogo';

export interface PiezaPublicable {
  id: string;
  title: string;
  minCapacity: number | null;
  basePrice: number | null;
  minimumNotice: number | null;
}

export interface SedeDisponible {
  id: string;
  name: string;
  isMain?: boolean;
}

interface Props {
  /** Las piezas entre las que elegir. Vacío cuando ya viene elegida. */
  piezas: PiezaPublicable[];
  sedes: SedeDisponible[];
  /** Cuando se edita una publicación que ya existe. */
  publicacion?: Publicacion | null;
  guardando: boolean;
  onGuardar: (
    experienceId: string,
    locationId: string | null,
    condiciones: CondicionesDePublicacion,
  ) => void;
  onCerrar: () => void;
}

const numero = (v: string): number | null => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const texto = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? '' : String(v);

export default function PublicarModal({
  piezas,
  sedes,
  publicacion,
  guardando,
  onGuardar,
  onCerrar,
}: Props) {
  const editando = !!publicacion;
  const [experienceId, setExperienceId] = useState(
    publicacion?.experienceId ?? piezas[0]?.id ?? '',
  );
  // Al editar se respeta la sede de esa publicación, y la falta de sede
  // también: una experiencia a domicilio tiene publicación sin sede, y
  // caer al primer local la mandaría a un sitio que nadie eligió.
  const [locationId, setLocationId] = useState(
    editando ? (publicacion?.locationId ?? '') : (sedes[0]?.id ?? ''),
  );

  // Al editar se cargan SOLO las condiciones propias; lo heredado queda en
  // blanco para que se vea de un golpe qué cambia en este escenario y qué no.
  // Rellenarlo con las resueltas convertiría en propio lo que solo se hereda,
  // y la sede dejaría de seguir a la pieza cuando la pieza cambie.
  const propias = publicacion?.propias;
  const [kind, setKind] = useState<'' | 'ABIERTA' | 'PRIVADA'>(propias?.kind ?? '');
  const [minCapacity, setMinCapacity] = useState(texto(propias?.minCapacity));
  const [basePrice, setBasePrice] = useState(texto(propias?.basePrice));
  const [minimumNotice, setMinimumNotice] = useState(texto(propias?.minimumNotice));
  const [prepTime, setPrepTime] = useState(texto(propias?.prepTime));
  const [cleanupTime, setCleanupTime] = useState(texto(propias?.cleanupTime));
  const [notes, setNotes] = useState('');
  const [isPublished, setIsPublished] = useState(propias?.isPublished ?? true);

  const pieza = piezas.find((p) => p.id === experienceId);

  const guardar = () => {
    // Sin sede solo vale al editar una publicación que ya no la tenía: la de
    // una experiencia a domicilio.
    if (!experienceId || (!locationId && !editando)) return;
    onGuardar(experienceId, locationId || null, {
      kind: kind === '' ? null : kind,
      minCapacity: numero(minCapacity),
      basePrice: numero(basePrice),
      prepTime: numero(prepTime),
      cleanupTime: numero(cleanupTime),
      minimumNotice: numero(minimumNotice),
      notes: notes.trim() === '' ? null : notes.trim(),
      isPublished,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-[#334C5D] dark:text-gray-100">
            {editando
              ? `Condiciones ${publicacion?.locationName ? `en ${publicacion.locationName}` : 'a domicilio'}`
              : 'Publicar una experiencia'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {editando
              ? 'Lo que dejes en blanco se hereda de la experiencia.'
              : 'Elige la pieza y el escenario. Las condiciones que no declares se heredan de la experiencia.'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!editando && (
            <>
              <div>
                <Label htmlFor="pieza">Experiencia</Label>
                <Select
                  id="pieza"
                  value={experienceId}
                  onChange={(e) => setExperienceId(e.target.value)}
                  className="mt-1"
                >
                  {piezas.length === 0 && <option value="">No tienes experiencias creadas</option>}
                  {piezas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="sede">Escenario</Label>
                <Select
                  id="sede"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="mt-1"
                >
                  {sedes.length === 0 && <option value="">No tienes sedes registradas</option>}
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.isMain ? ' (Principal)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="modalidad">Modalidad aquí</Label>
            <Select
              id="modalidad"
              value={kind}
              onChange={(e) => setKind(e.target.value as '' | 'ABIERTA' | 'PRIVADA')}
              className="mt-1"
            >
              <option value="">Sin definir (se cuentan cupos)</option>
              <option value="ABIERTA">Abierta: cupos que se compran sueltos</option>
              <option value="PRIVADA">Privada: un grupo se queda el sitio</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {kind === 'PRIVADA'
                ? 'La primera reserva se queda la franja entera, aunque sobre aforo.'
                : kind === 'ABIERTA'
                  ? 'Varias reservas comparten la franja hasta llenar los cupos.'
                  : 'La misma pieza puede ser abierta en una sede y privada en otra.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minCap">Cupos mínimos</Label>
              <TextInput
                id="minCap"
                type="number"
                min={0}
                value={minCapacity}
                placeholder={pieza?.minCapacity ? `${pieza.minCapacity} (de la experiencia)` : 'Los de la experiencia'}
                onChange={(e) => setMinCapacity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="precio">Precio por persona</Label>
              <TextInput
                id="precio"
                type="number"
                min={0}
                value={basePrice}
                placeholder={pieza?.basePrice ? `${pieza.basePrice} (de la experiencia)` : 'El de la experiencia'}
                onChange={(e) => setBasePrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="aviso">Anticipación mínima (horas)</Label>
              <TextInput
                id="aviso"
                type="number"
                min={0}
                value={minimumNotice}
                placeholder={
                  pieza?.minimumNotice ? `${pieza.minimumNotice} (de la experiencia)` : 'La de la experiencia'
                }
                onChange={(e) => setMinimumNotice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="prep">Preparación (minutos)</Label>
              <TextInput
                id="prep"
                type="number"
                min={0}
                value={prepTime}
                placeholder="La de la experiencia"
                onChange={(e) => setPrepTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="limp">Limpieza después (minutos)</Label>
              <TextInput
                id="limp"
                type="number"
                min={0}
                value={cleanupTime}
                placeholder="La de la experiencia"
                onChange={(e) => setCleanupTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notas">Notas de este escenario</Label>
            <Textarea
              id="notas"
              rows={2}
              value={notes}
              placeholder="Lo que solo pasa aquí. No se muestra en el catálogo."
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="publicada"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="text-[#F26726] focus:ring-[#F26726]"
            />
            <Label htmlFor="publicada" className="cursor-pointer">
              Visible en el catálogo público
            </Label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <Button color="light" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={guardando || !experienceId || (!locationId && !editando)}
            onClick={guardar}
            className="bg-[#F26726] hover:bg-[#d9551c]"
          >
            {guardando ? 'Guardando…' : editando ? 'Guardar condiciones' : 'Publicar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
