"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Label, TextInput } from 'flowbite-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  getFacturacion,
  guardarFacturacion,
  type DatosDeFacturacion as Datos,
  type OrigenDeFacturacion,
} from '@/lib/crm/venta';

interface Props {
  opportunityId: string;
  /** Solo aparece cuando la venta se está concretando. */
  hayReserva: boolean;
}

const ORIGEN: Record<OrigenDeFacturacion, string> = {
  venta: 'Guardados con esta venta.',
  empresa: 'Traídos de la empresa del contacto. Revísalos antes de facturar.',
  contacto: 'Solo tenemos lo del contacto. Faltan los datos fiscales.',
};

/**
 * CRM-31. Los datos con los que se factura.
 *
 * No se piden al abrir el lead: pedirle el NIT y la dirección a quien acaba
 * de escribir por WhatsApp es la forma más rápida de perderlo. Aparecen aquí,
 * cuando ya hay una reserva y la venta se está concretando.
 *
 * Vienen precargados con lo que el sistema ya sepa —la empresa del contacto,
 * o el contacto mismo— para no volver a teclear un NIT que ya está guardado.
 */
export default function DatosDeFacturacion({ opportunityId, hayReserva }: Props) {
  const { showError, showSuccess } = useSweetAlert();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [origen, setOrigen] = useState<OrigenDeFacturacion>('contacto');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await getFacturacion(opportunityId);
      setDatos(r.datos);
      setOrigen(r.origen);
    } catch {
      // Sin datos precargados el formulario sigue sirviendo vacío.
      setDatos({});
    } finally {
      setCargando(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    if (hayReserva) void cargar();
    else setCargando(false);
  }, [hayReserva, cargar]);

  if (!hayReserva || cargando) return null;

  const campo = (k: keyof Datos) => (typeof datos?.[k] === 'string' ? (datos[k] as string) : '');
  const dir = (k: keyof NonNullable<Datos['address']>) => datos?.address?.[k] ?? '';
  const set = (k: keyof Datos, v: string) => setDatos((d) => ({ ...d, [k]: v }));
  const setDir = (k: keyof NonNullable<Datos['address']>, v: string) =>
    setDatos((d) => ({ ...d, address: { ...(d?.address ?? {}), [k]: v } }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarFacturacion(opportunityId, datos ?? {});
      setOrigen('venta');
      setAbierto(false);
      showSuccess('Datos de facturación guardados', '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudieron guardar', msg || 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const completo = Boolean(datos?.documentNumber && datos?.businessName);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Datos de facturación</h3>
          <p className="mt-1 text-sm text-gray-500">{ORIGEN[origen]}</p>
        </div>
        <Button size="xs" color="secondary" onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Cerrar' : completo ? 'Editar' : 'Completar'}
        </Button>
      </div>

      {!abierto && completo && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          {datos?.businessName} · {datos?.documentType ?? 'NIT'} {datos?.documentNumber}
          {datos?.address?.city ? ` · ${datos.address.city}` : ''}
        </p>
      )}

      {!abierto && !completo && (
        <p className="mt-3 text-xs text-amber-700">
          Sin ellos la venta se puede cerrar igual, pero la factura queda a medias.
        </p>
      )}

      {abierto && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="fac-razon">Razón social o nombre</Label>
            <TextInput
              id="fac-razon"
              value={campo('businessName')}
              onChange={(e) => set('businessName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-tipo">Tipo de documento</Label>
            <TextInput
              id="fac-tipo"
              placeholder="NIT, CC…"
              value={campo('documentType')}
              onChange={(e) => set('documentType', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-doc">Número</Label>
            <TextInput
              id="fac-doc"
              value={campo('documentNumber')}
              onChange={(e) => set('documentNumber', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="fac-calle">Dirección</Label>
            <TextInput
              id="fac-calle"
              value={dir('street') ?? ''}
              onChange={(e) => setDir('street', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-ciudad">Ciudad</Label>
            <TextInput
              id="fac-ciudad"
              value={dir('city') ?? ''}
              onChange={(e) => setDir('city', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-depto">Departamento</Label>
            <TextInput
              id="fac-depto"
              value={dir('state') ?? ''}
              onChange={(e) => setDir('state', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-email">Correo de facturación</Label>
            <TextInput
              id="fac-email"
              type="email"
              value={campo('email')}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fac-tel">Teléfono</Label>
            <TextInput
              id="fac-tel"
              value={campo('phone')}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
