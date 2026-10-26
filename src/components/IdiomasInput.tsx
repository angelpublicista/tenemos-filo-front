"use client";

/**
 * En qué idiomas se da la experiencia.
 *
 * Lo declara el anfitrión y el comensal elige uno de esos al reservar. No
 * bloquea publicar: una experiencia sin idiomas declarados se vende igual,
 * solo que nadie puede pedir un idioma concreto.
 *
 * Casillas y no un desplegable múltiple: son seis opciones y se ven todas de
 * un golpe, igual que las categorías justo arriba.
 */

import React from 'react';
import { Checkbox, Label } from 'flowbite-react';
import { CODIGOS_DE_IDIOMA, nombreDeIdioma } from '@/lib/idiomas';

interface Props {
  valor: string[];
  onChange: (idiomas: string[]) => void;
}

export default function IdiomasInput({ valor, onChange }: Props) {
  const alternar = (codigo: string) => {
    onChange(
      valor.includes(codigo) ? valor.filter((c) => c !== codigo) : [...valor, codigo],
    );
  };

  return (
    <div>
      <Label>Idiomas</Label>
      <p className="text-sm text-gray-500 mb-3">
        En los que puedes dar la experiencia. Quien reserve podrá elegir uno de
        estos; si no marcas ninguno, no se le preguntará.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {CODIGOS_DE_IDIOMA.map((codigo) => (
          <div key={codigo} className="flex items-center">
            <Checkbox
              id={`idioma-${codigo}`}
              checked={valor.includes(codigo)}
              onChange={() => alternar(codigo)}
              className="mr-2"
            />
            <Label htmlFor={`idioma-${codigo}`} className="cursor-pointer">
              {nombreDeIdioma(codigo)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
