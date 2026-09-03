"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { HiCheckCircle, HiClock, HiXCircle } from 'react-icons/hi';
import { getEstadoReserva, type EstadoReserva } from '@/lib/api/catalog';

/**
 * A donde vuelve el cliente desde Wompi.
 *
 * Es la URL que el API firma como `redirect-url` del checkout. Hasta ahora
 * no existia: se pagaba y se aterrizaba en un 404, sin saber si el cobro
 * habia entrado.
 *
 * Quien llega aqui no tiene sesion —reservar no la pide— asi que el estado
 * se consulta por el numero de reserva contra el endpoint publico, que
 * devuelve solo eso: si esta pagada y si esta confirmada.
 */

/** Cuanto esperamos al webhook antes de dejar de preguntar. */
const INTENTOS = 10;
const ESPERA_MS = 2000;

type Resultado = 'pagado' | 'fallido' | 'esperando' | 'desconocido';

function resultadoDe(estado: EstadoReserva | null): Resultado {
  if (!estado) return 'desconocido';
  if (estado.paymentStatus === 'PAID') return 'pagado';
  if (estado.paymentStatus === 'FAILED') return 'fallido';
  return 'esperando';
}

export default function PaginaRetornoPago() {
  const params = useParams<{ reference: string }>();
  const referencia = decodeURIComponent(params?.reference ?? '');

  const [estado, setEstado] = useState<EstadoReserva | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [sondeando, setSondeando] = useState(true);

  // El pago lo confirma el webhook de Wompi, que llega por su cuenta y unos
  // segundos despues del redirect. Por eso se pregunta varias veces en vez
  // de una: si se resolviera de una sola lectura, casi siempre saldria
  // "pendiente" en un cobro que si entro.
  useEffect(() => {
    if (!referencia) return;
    let cancelado = false;
    let intentos = 0;

    const preguntar = async () => {
      try {
        const datos = await getEstadoReserva(referencia);
        if (cancelado) return;
        setEstado(datos);
        // Pagado o rechazado ya son definitivos: no hay que seguir mirando.
        if (datos.paymentStatus === 'PAID' || datos.paymentStatus === 'FAILED') {
          setSondeando(false);
          return;
        }
      } catch (err) {
        if (cancelado) return;
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setNoEncontrada(true);
          setSondeando(false);
          return;
        }
        // Un fallo de red no es una respuesta: se reintenta como el resto.
      }

      intentos += 1;
      if (intentos >= INTENTOS) {
        if (!cancelado) setSondeando(false);
        return;
      }
      setTimeout(preguntar, ESPERA_MS);
    };

    void preguntar();
    return () => {
      cancelado = true;
    };
  }, [referencia]);

  const resultado = noEncontrada ? 'desconocido' : resultadoDe(estado);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
        {resultado === 'pagado' && (
          <>
            <HiCheckCircle className="mx-auto h-14 w-14 text-green-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Pago confirmado</h1>
            <p className="mt-2 text-gray-600">
              Tu reserva quedó confirmada. Te enviamos el comprobante por correo.
            </p>
          </>
        )}

        {resultado === 'fallido' && (
          <>
            <HiXCircle className="mx-auto h-14 w-14 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">El pago no se completó</h1>
            {/* FAILED cubre el rechazo del banco y la anulacion de un cobro
                que si llego a hacerse. Prometer "no se te cobro nada" seria
                mentira en el segundo caso, asi que el texto vale para los dos. */}
            <p className="mt-2 text-gray-600">
              La transacción no quedó aprobada. Si te aparece un cargo, tu banco lo revierte en
              los próximos días. Puedes intentarlo de nuevo desde el enlace del anfitrión, o
              escribirle para que te ayude.
            </p>
          </>
        )}

        {resultado === 'esperando' && (
          <>
            <HiClock className={`mx-auto h-14 w-14 text-[#F26726] ${sondeando ? 'animate-pulse' : ''}`} />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {sondeando ? 'Confirmando tu pago...' : 'Tu pago está en proceso'}
            </h1>
            <p className="mt-2 text-gray-600">
              {sondeando
                ? 'Estamos esperando la confirmación de la pasarela. Tarda unos segundos.'
                : 'La pasarela todavía no nos ha confirmado el cobro. Si ya te lo descontaron, la reserva se confirma sola en cuanto llegue; te avisamos por correo.'}
            </p>
          </>
        )}

        {resultado === 'desconocido' && (
          <>
            <HiClock className="mx-auto h-14 w-14 text-gray-400" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">No encontramos esa reserva</h1>
            <p className="mt-2 text-gray-600">
              Revisa el enlace del correo de tu reserva. Si acabas de pagar y sigues viendo esto,
              escríbenos con tu número de reserva.
            </p>
          </>
        )}

        {referencia && (
          <p className="mt-6 text-sm text-gray-500">
            Número de reserva: <span className="font-mono font-medium text-gray-700">{referencia}</span>
          </p>
        )}

        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[#F26726] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#d9571f]"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
