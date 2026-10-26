"use client";

import React from 'react';
import { Label, TextInput } from 'flowbite-react';

/**
 * El pais de la empresa: Colombia, y no se elige.
 *
 * La plataforma solo opera en Colombia por ahora —el catalogo de
 * departamentos y ciudades, el NIT, el RUT y la pasarela de pago lo dan por
 * hecho—, asi que dejar elegir otro pais ofrecia una opcion que despues no
 * funcionaba: se elegia Mexico y los desplegables seguian mostrando
 * departamentos colombianos.
 *
 * Se enseña, no se esconde: el dato importa y verlo confirma que se guardo.
 * Cuando haya mas paises, esto vuelve a ser un desplegable y lo que cambia es
 * este archivo, no las cinco pantallas que lo usan.
 */

/** Como se guarda donde el pais es el nombre. */
export const PAIS_FIJO = 'Colombia';

/** Como se guarda donde el pais es el codigo ISO. */
export const PAIS_FIJO_CODIGO = 'CO';

interface Props {
  id?: string;
  label?: string;
  requerido?: boolean;
  className?: string;
}

export default function PaisFijo({
  id = 'address-country',
  label = 'País',
  requerido = false,
  className = '',
}: Props) {
  return (
    <div className={className}>
      <Label color="gray" className="mb-2 block">
        {label}
        {requerido && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <TextInput id={id} value={PAIS_FIJO} readOnly className="[&_input]:bg-gray-50" />
      <p className="mt-1 text-xs text-gray-500">Por ahora solo operamos en Colombia.</p>
    </div>
  );
}
