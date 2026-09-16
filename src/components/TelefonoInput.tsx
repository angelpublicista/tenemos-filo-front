"use client";

import React from 'react';
import { Label } from 'flowbite-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

interface TelefonoInputProps {
  value: string;
  onChange: (valor: string) => void;
  label?: string;
  requerido?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Se conserva por si el formulario lee el valor del DOM. */
  id?: string;
  error?: string;
  ayuda?: string;
  className?: string;
}

/**
 * Telefono en formato internacional.
 *
 * Existe por dos motivos. El primero es que hasta ahora solo cuatro pantallas
 * usaban prefijo de pais y el resto pedia texto libre, asi que el mismo numero
 * quedaba guardado como "3001234567", "300 123 4567" o "+57 300 1234567" y no
 * habia forma fiable de llamar ni de comparar.
 *
 * El segundo es que esas cuatro repetian dos cadenas de estilos distintas,
 * copiadas por pares. Una de ellas llevaba `h-3`, que dejaba el campo
 * aplastado contra el resto del formulario.
 *
 * El valor que entrega es E.164 ("+573001234567"), que es lo que esperan tanto
 * el API como cualquier servicio de mensajeria.
 */
export default function TelefonoInput({
  value,
  onChange,
  label,
  requerido = false,
  disabled = false,
  placeholder = 'Teléfono',
  id,
  error,
  ayuda,
  className = '',
}: TelefonoInputProps) {
  return (
    <div className={className}>
      {label && (
        <Label color="gray" className="mb-2 block">
          {label}
          {requerido && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <PhoneInput
        // Colombia por defecto: es donde esta casi todo el mundo que usa esto,
        // y quien no, cambia el prefijo en un clic.
        defaultCountry="co"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={id ? { id } : undefined}
        className={`w-full [&>input]:w-full [&>input]:px-4 [&>input]:py-2 [&>input]:border [&>input]:border-gray-300 [&>input]:rounded-lg [&>input]:text-sm [&>input]:focus:ring-2 [&>input]:focus:ring-[#F26726] [&>input]:focus:border-transparent [&>button]:border [&>button]:border-gray-300 [&>button]:rounded-l-lg [&>button]:bg-white [&>button]:hover:bg-gray-50 ${
          disabled ? 'opacity-60' : ''
        }`}
      />
      {ayuda && !error && <p className="mt-1 text-sm text-gray-500">{ayuda}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
