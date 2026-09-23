"use client";

import React from 'react';
import { Button, Label, TextInput } from 'flowbite-react';
import { HiPlus, HiTrash, HiUser } from 'react-icons/hi';
import TelefonoInput from '@/components/TelefonoInput';
import {
  CONTACTOS_OBLIGATORIOS,
  MAXIMO_LIBRES,
  contactoVacio,
  errorDeContacto,
  type ContactoDeEmpresa,
} from '@/lib/company/contactos';

interface Props {
  valor: ContactoDeEmpresa[];
  onChange: (lista: ContactoDeEmpresa[]) => void;
  /** Datos de quien esta rellenando, para el boton de copiarlos. */
  misDatos?: { name?: string | null; email?: string | null; phone?: string | null };
  /** Marca en rojo lo que falta. Se activa al intentar continuar. */
  mostrarErrores?: boolean;
  disabled?: boolean;
}

/**
 * Los contactos de la empresa.
 *
 * Reservas y contabilidad salen siempre, en ese orden y sin poder borrarse:
 * son obligatorios. Debajo caben hasta tres libres, cada uno con su etiqueta.
 *
 * El boton de "usar mis datos" existe por el caso mas comun de esta
 * plataforma: un chef independiente es el las dos cosas, y obligarle a
 * teclear su propio nombre y correo dos veces es pedirle que copie algo que
 * la aplicacion ya sabe.
 */
export default function ContactosDeEmpresa({
  valor,
  onChange,
  misDatos,
  mostrarErrores = false,
  disabled = false,
}: Props) {
  const libres = valor.filter((c) => c.type === 'otro');
  const puedeAñadir = libres.length < MAXIMO_LIBRES;
  const hayMisDatos = Boolean(misDatos?.name || misDatos?.email);

  const cambiar = (indice: number, parche: Partial<ContactoDeEmpresa>) => {
    onChange(valor.map((c, i) => (i === indice ? { ...c, ...parche } : c)));
  };

  const copiarMisDatos = (indice: number) => {
    cambiar(indice, {
      name: misDatos?.name ?? '',
      email: misDatos?.email ?? '',
      phone: misDatos?.phone ?? '',
    });
  };

  const campos = (c: ContactoDeEmpresa, i: number) => {
    const error = mostrarErrores ? errorDeContacto(c) : null;
    return (
      <div className="space-y-3">
        {c.type === 'otro' && (
          <div>
            <Label color="gray" className="mb-2 block">
              ¿Para qué es este contacto? <span className="text-red-500">*</span>
            </Label>
            <TextInput
              value={c.label ?? ''}
              placeholder="Ej: Operaciones, Prensa, Proveedores"
              onChange={(e) => cambiar(i, { label: e.target.value })}
              disabled={disabled}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label color="gray" className="mb-2 block">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <TextInput
              value={c.name}
              icon={HiUser}
              placeholder="Nombre y apellido"
              onChange={(e) => cambiar(i, { name: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div>
            <Label color="gray" className="mb-2 block">
              Cargo
            </Label>
            <TextInput
              value={c.position ?? ''}
              placeholder="Ej: Jefe de sala"
              onChange={(e) => cambiar(i, { position: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label color="gray" className="mb-2 block">
              Correo <span className="text-red-500">*</span>
            </Label>
            <TextInput
              type="email"
              value={c.email}
              placeholder="correo@ejemplo.com"
              onChange={(e) => cambiar(i, { email: e.target.value })}
              disabled={disabled}
            />
          </div>
          <TelefonoInput
            label="Teléfono"
            value={c.phone ?? ''}
            onChange={(v) => cambiar(i, { phone: v })}
            disabled={disabled}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {CONTACTOS_OBLIGATORIOS.map((obl) => {
        const i = valor.findIndex((c) => c.type === obl.type);
        if (i === -1) return null;
        return (
          <div key={obl.type} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-[#334C5D]">
                  {obl.titulo} <span className="text-red-500">*</span>
                </h4>
                <p className="text-xs text-gray-500">{obl.ayuda}</p>
              </div>
              {hayMisDatos && (
                <Button size="xs" color="secondary" onClick={() => copiarMisDatos(i)} disabled={disabled}>
                  Usar mis datos
                </Button>
              )}
            </div>
            {campos(valor[i], i)}
          </div>
        );
      })}

      <div className="rounded-xl border border-dashed border-gray-300 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-[#334C5D]">Otros contactos</h4>
            <p className="text-xs text-gray-500">
              Opcional. Hasta {MAXIMO_LIBRES} ({libres.length} de {MAXIMO_LIBRES}).
            </p>
          </div>
          <Button
            size="xs"
            color="secondary"
            disabled={disabled || !puedeAñadir}
            onClick={() => onChange([...valor, contactoVacio('otro')])}
          >
            <HiPlus className="mr-1 h-4 w-4" />
            Añadir contacto
          </Button>
        </div>

        {libres.length === 0 ? (
          <p className="py-2 text-sm text-gray-500">
            No has añadido ninguno. No hace falta para continuar.
          </p>
        ) : (
          <div className="space-y-4">
            {valor.map((c, i) =>
              c.type !== 'otro' ? null : (
                <div key={i} className="rounded-lg bg-gray-50 p-3">
                  <div className="mb-2 flex justify-end">
                    <Button
                      size="xs"
                      color="danger"
                      disabled={disabled}
                      onClick={() => onChange(valor.filter((_, j) => j !== i))}
                    >
                      <HiTrash className="mr-1 h-3.5 w-3.5" />
                      Quitar
                    </Button>
                  </div>
                  {campos(c, i)}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
