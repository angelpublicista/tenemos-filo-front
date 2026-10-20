"use client";

import React, { useState } from 'react';
import { Button } from 'flowbite-react';
import { HiCheck, HiLink } from 'react-icons/hi';

interface Props {
  /** La ruta, sin dominio: /book/mi-empresa/cena-centro o /r/mi-canal/cena-centro. */
  ruta: string;
}

/**
 * Copiar la URL propia de una publicación.
 *
 * Recibe la ruta y no la URL entera: el dominio sale de donde está abierto el
 * panel, así que el mismo componente vale en local, en pruebas y en producción.
 */
export default function CopiarEnlaceDePublicacion({ ruta }: Props) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const url = `${window.location.origin}${ruta}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      // Un aviso que se apaga solo; no es un estado que haya que gestionar.
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso para el portapapeles (iframe, http): se enseña para
      // copiarla a mano en vez de fallar callando.
      window.prompt('Copia el enlace:', url);
    }
  };

  return (
    <Button size="xs" color="light" onClick={() => void copiar()} title={ruta}>
      {copiado ? (
        <>
          <HiCheck className="mr-1" /> Copiado
        </>
      ) : (
        <>
          <HiLink className="mr-1" /> Copiar enlace
        </>
      )}
    </Button>
  );
}
