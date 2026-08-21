"use client";

import React, { useRef, useState } from 'react';
import { HiLockClosed } from 'react-icons/hi';

export type DatosCheckout = {
  checkoutUrl: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
  environment: string;
};

/**
 * Envía al cliente al checkout de Wompi.
 *
 * Los campos van en un formulario, con los nombres exactos que documenta
 * Wompi (`public-key`, `amount-in-cents`, `signature:integrity`). La firma
 * viene calculada del servidor: aquí no hay ningún secreto.
 */
export default function WompiCheckoutButton({ datos }: { datos: DatosCheckout }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);

  const total = (datos.amountInCents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: datos.currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-3">
      <form ref={formRef} action={datos.checkoutUrl} method="GET">
        <input type="hidden" name="public-key" value={datos.publicKey} />
        <input type="hidden" name="currency" value={datos.currency} />
        <input type="hidden" name="amount-in-cents" value={datos.amountInCents} />
        <input type="hidden" name="reference" value={datos.reference} />
        <input type="hidden" name="signature:integrity" value={datos.signature} />
        <input type="hidden" name="redirect-url" value={datos.redirectUrl} />

        <button
          type="submit"
          onClick={() => setEnviando(true)}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 bg-[#F26726] hover:bg-[#d9571f] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <HiLockClosed className="w-5 h-5" />
          {enviando ? 'Abriendo pasarela...' : `Pagar ${total}`}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center">
        Pago seguro procesado por Wompi
        {datos.environment === 'SANDBOX' && (
          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
            modo pruebas
          </span>
        )}
      </p>
    </div>
  );
}
