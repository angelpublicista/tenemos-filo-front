import React from 'react';

export type Pasarela = 'WOMPI' | 'MERCADO_PAGO' | 'BOLD';

/**
 * Los logos oficiales de cada pasarela, tal cual los entregan.
 *
 * Los archivos no se tocan: Mercado Pago lo pide explícitamente en su guía de
 * marca, y con Wompi vale lo mismo. Eso trae dos consecuencias que hay que
 * resolver desde fuera:
 *
 * 1. Puestos a la misma altura, uno se ve mucho más pequeño que el otro. No es
 *    solo el aire que cada archivo deja alrededor: el logotipo de Mercado Pago
 *    son dos líneas apiladas y el de Wompi una sola, así que a igual alto total
 *    sus letras miden la mitad. Por eso `lineaDeTexto` —medida sobre el archivo
 *    de cada marca— dice qué fracción del lienzo ocupa UNA línea de texto, y es
 *    contra eso que se igualan: así los dos se leen del mismo tamaño.
 *
 * 2. Van como `<img>` y no incrustados. Los dos SVG traen sus estilos en
 *    clases genéricas (`.cls-1`, `.st0`), y dos logos incrustados en la misma
 *    página se pisarían los colores entre ellos.
 */
const MARCAS: Record<
  Pasarela,
  { archivo: string | null; nombre: string; lineaDeTexto: number; proporcion: number }
> = {
  WOMPI: {
    archivo: '/pasarelas/wompi.svg',
    nombre: 'Wompi',
    lineaDeTexto: 0.302,
    proporcion: 1982 / 997,
  },
  MERCADO_PAGO: {
    archivo: '/pasarelas/mercado-pago.svg',
    nombre: 'Mercado Pago',
    lineaDeTexto: 0.214,
    proporcion: 1048.82 / 425.2,
  },
  // Todavía sin archivo: el logo oficial de Bold hay que bajarlo de sus
  // recursos gráficos y dejarlo en /pasarelas/bold.svg. Mientras tanto va el
  // nombre escrito, que es preferible a un logo redibujado a ojo.
  BOLD: {
    archivo: null,
    nombre: 'Bold',
    lineaDeTexto: 1,
    proporcion: 1,
  },
};

export const nombreDePasarela = (p: Pasarela) => MARCAS[p].nombre;

interface Props {
  pasarela: Pasarela;
  /** A qué tamaño se quieren ver las letras del logotipo, en píxeles. */
  alto?: number;
  className?: string;
}

/**
 * El logo de una pasarela, al tamaño al que se quiere leer.
 *
 * `alto` no es el alto de la imagen sino el de una línea de su logotipo, que
 * es lo que el ojo compara. La caja sale de ahí. Así dos logos con el mismo
 * `alto` se leen igual de grandes aunque sus archivos estén maquetados
 * distinto.
 */
export default function LogoDePasarela({ pasarela, alto = 14, className = '' }: Props) {
  const marca = MARCAS[pasarela];
  const altoDeCaja = Math.round(alto / marca.lineaDeTexto);

  if (!marca.archivo) {
    return (
      <span
        className={`inline-block font-extrabold leading-none tracking-tight text-[#121E6C] ${className}`}
        style={{ fontSize: Math.round(alto * 1.4) }}
      >
        {marca.nombre}
      </span>
    );
  }

  return (
    // SVG estático de marca: no hay nada que optimizar y next/image no procesa
    // SVG sin abrir la puerta a servir SVG de terceros.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={marca.archivo}
      alt={marca.nombre}
      height={altoDeCaja}
      width={Math.round(altoDeCaja * marca.proporcion)}
      className={`inline-block w-auto ${className}`}
      style={{ height: altoDeCaja }}
    />
  );
}
