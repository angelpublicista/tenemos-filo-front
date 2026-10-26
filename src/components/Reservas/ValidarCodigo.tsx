"use client";

import React, { useState } from 'react';
import { Button, TextInput } from 'flowbite-react';
import { HiOutlineTicket } from 'react-icons/hi';
import { validarCodigoDeReserva, type ReservaValidada } from '@/lib/sanity/reservationService';

type Resultado =
  | { tipo: 'ok'; reserva: ReservaValidada; yaHabiaLlegado: boolean }
  | { tipo: 'no'; mensaje: string };

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  });

/**
 * El código que el cliente enseña al llegar.
 *
 * Es lo que hace que una venta no pueda quedarse fuera de FILO: quien vendió
 * por su cuenta y no registró la reserva no tiene código que dar, y aquí se
 * ve en la puerta en vez de nunca. Por eso el «no existe» se enseña entero y
 * con qué hacer, en lugar de como un error que se cierra y se olvida.
 */
export default function ValidarCodigo() {
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const validar = async () => {
    const limpio = codigo.trim();
    if (limpio.length < 4) return;
    setValidando(true);
    setResultado(null);
    try {
      const r = await validarCodigoDeReserva(limpio);
      setResultado({
        tipo: 'ok',
        reserva: r.data,
        yaHabiaLlegado: r.meta?.yaHabiaLlegado === true,
      });
      setCodigo('');
    } catch (err) {
      setResultado({
        tipo: 'no',
        mensaje: err instanceof Error ? err.message : 'No se pudo comprobar el código.',
      });
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <HiOutlineTicket className="h-5 w-5 text-gray-400" />
        <h3 className="font-semibold text-gray-900">¿Llegó alguien?</h3>
      </div>
      <p className="mb-3 text-sm text-gray-500">
        Escribe el código que trae y queda registrada su llegada.
      </p>

      <div className="flex flex-wrap gap-2">
        <TextInput
          className="min-w-[12rem] flex-1"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void validar(); }}
          placeholder="ABCD-EFGH"
          autoComplete="off"
        />
        <Button color="primary" onClick={() => void validar()} disabled={validando}>
          {validando ? 'Comprobando…' : 'Validar'}
        </Button>
      </div>

      {resultado?.tipo === 'ok' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">
            {resultado.yaHabiaLlegado ? 'Esta reserva ya estaba validada' : 'Todo en orden'}
          </p>
          <p className="mt-1">
            {resultado.reserva.client?.name ?? 'Cliente'} ·{' '}
            {resultado.reserva.experience?.title ?? 'Experiencia'} ·{' '}
            {resultado.reserva.participants} personas
          </p>
          <p className="text-xs">
            {cuando(resultado.reserva.reservationDate)} · reserva{' '}
            {resultado.reserva.reservationNumber}
          </p>
          {/* De dónde vino importa: es la venta de un canal y por eso ese
              canal cobra comisión. */}
          {resultado.reserva.resellerCompany && (
            <p className="mt-1 text-xs">
              Vendida por <strong>{resultado.reserva.resellerCompany.companyName}</strong>
            </p>
          )}
          {resultado.yaHabiaLlegado && resultado.reserva.checkedInAt && (
            <p className="mt-1 text-xs">
              Se validó el {cuando(resultado.reserva.checkedInAt)}.
            </p>
          )}
        </div>
      )}

      {resultado?.tipo === 'no' && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Ese código no te cuadra</p>
          <p className="mt-1">{resultado.mensaje}</p>
        </div>
      )}
    </div>
  );
}
