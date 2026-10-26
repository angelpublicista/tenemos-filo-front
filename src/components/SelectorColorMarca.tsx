"use client";

import React from 'react';
import { Label } from 'flowbite-react';
import { colorValido } from '@/lib/marca';

interface Props {
  etiqueta: string;
  ayuda: string;
  /** Color guardado, o null si la empresa no ha elegido ninguno. */
  valor: string | null;
  /** El de la plataforma: lo que se ve mientras no se elija otro. */
  porDefecto: string;
  onChange: (valor: string | null) => void;
  soloLectura?: boolean;
  id: string;
}

/**
 * Elegir un color de marca.
 *
 * Se apoya en el selector nativo del navegador en vez de traer una libreria:
 * ya entrega exactamente el formato que se guarda (#RRGGBB), y en movil abre
 * el selector del sistema, que la gente ya sabe usar.
 *
 * Al lado va el hexadecimal escribible, porque una marca suele venir con su
 * color ya decidido y apuntado en algun sitio: obligar a acertarlo con el
 * raton seria absurdo.
 *
 * "Sin elegir" es un estado de verdad, distinto de "elegi el naranja de
 * Filo": si mañana cambia el color de la plataforma, quien no eligio se
 * mueve con ella y quien eligio se queda con el suyo.
 */
export default function SelectorColorMarca({
  etiqueta,
  ayuda,
  valor,
  porDefecto,
  onChange,
  soloLectura = false,
  id,
}: Props) {
  const efectivo = valor ?? porDefecto;
  // Mientras se escribe a mano, el texto puede no ser un color todavia
  // ("#F2"): se deja escribir y solo se guarda cuando esta completo.
  const [texto, setTexto] = React.useState(efectivo);

  React.useEffect(() => {
    setTexto(valor ?? porDefecto);
  }, [valor, porDefecto]);

  const escribir = (t: string) => {
    const conNumeral = t.startsWith('#') ? t : `#${t}`;
    setTexto(conNumeral);
    const limpio = colorValido(conNumeral);
    if (limpio) onChange(limpio);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={efectivo}
          disabled={soloLectura}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={etiqueta}
        />
        <input
          type="text"
          value={texto}
          readOnly={soloLectura}
          onChange={(e) => escribir(e.target.value)}
          placeholder={porDefecto}
          spellCheck={false}
          maxLength={7}
          className="w-28 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase read-only:bg-gray-50"
        />
        {!soloLectura && valor && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            Usar el de Filo
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">{ayuda}</p>
    </div>
  );
}
