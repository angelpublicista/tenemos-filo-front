"use client";

import React, { useRef, useState } from 'react';
import { HiLockClosed } from 'react-icons/hi';
import LogoDePasarela from '@/components/LogoDePasarela';

/**
 * Lo que hace falta para llevar al cliente a pagar.
 *
 * Son dos formas distintas y no una con campos opcionales: en Wompi el
 * navegador arma un formulario firmado en el servidor, y en Mercado Pago solo
 * va a una URL que el servidor ya creó. Con un tipo de campos opcionales, cada
 * pantalla tendría que adivinar cuál de los dos casos tiene delante.
 */
export type CheckoutWompi = {
  proveedor: 'WOMPI';
  checkoutUrl: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
  environment: string;
};

export type CheckoutMercadoPago = {
  proveedor: 'MERCADO_PAGO';
  checkoutUrl: string;
  reference: string;
  currency: string;
  amount: number;
  environment: string;
};

export type DatosCheckout = CheckoutWompi | CheckoutMercadoPago;

const pesos = (monto: number, moneda: string) =>
  monto.toLocaleString('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 });

/**
 * Quién procesa el cobro, con su logo.
 *
 * Al comensal le importa: está a punto de meter su tarjeta y reconocer la
 * marca es lo que le dice que está en un sitio conocido. El logo va sobre
 * blanco siempre —los dos son oscuros y el fondo de la página podría no
 * serlo— y a un tamaño discreto: acompaña al botón, no compite con él.
 */
function Pie({ datos }: { datos: DatosCheckout }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-400">
      <span>Pago seguro procesado por</span>
      <span className="inline-flex items-center rounded bg-white px-1.5 py-1">
        <LogoDePasarela pasarela={datos.proveedor} alto={10} />
      </span>
      {datos.environment === 'SANDBOX' && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">modo pruebas</span>
      )}
    </div>
  );
}

const CLASES =
  'w-full flex items-center justify-center gap-2 bg-marca hover:bg-marca-fuerte disabled:opacity-60 text-marca-contraste font-semibold px-6 py-3 rounded-xl transition-colors';

/**
 * Envía al cliente a pagar, con la pasarela que corresponda.
 *
 * En Wompi los campos van en un formulario con los nombres exactos que
 * documenta (`public-key`, `amount-in-cents`, `signature:integrity`), y la
 * firma viene calculada del servidor: aquí no hay ningún secreto. En Mercado
 * Pago la preferencia ya está creada y esto es un enlace.
 */
export default function BotonDePago({ datos }: { datos: DatosCheckout }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);

  if (datos.proveedor === 'MERCADO_PAGO') {
    return (
      <div className="space-y-3">
        <a
          href={datos.checkoutUrl}
          onClick={() => setEnviando(true)}
          className={CLASES}
        >
          <HiLockClosed className="w-5 h-5" />
          {enviando ? 'Abriendo pasarela...' : `Pagar ${pesos(datos.amount, datos.currency)}`}
        </a>
        <Pie datos={datos} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={datos.checkoutUrl} method="GET">
        <input type="hidden" name="public-key" value={datos.publicKey} />
        <input type="hidden" name="currency" value={datos.currency} />
        <input type="hidden" name="amount-in-cents" value={datos.amountInCents} />
        <input type="hidden" name="reference" value={datos.reference} />
        <input type="hidden" name="signature:integrity" value={datos.signature} />
        <input type="hidden" name="redirect-url" value={datos.redirectUrl} />

        <button type="submit" onClick={() => setEnviando(true)} disabled={enviando} className={CLASES}>
          <HiLockClosed className="w-5 h-5" />
          {enviando
            ? 'Abriendo pasarela...'
            : `Pagar ${pesos(datos.amountInCents / 100, datos.currency)}`}
        </button>
      </form>
      <Pie datos={datos} />
    </div>
  );
}
