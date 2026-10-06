"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal, ModalBody, ModalHeader } from 'flowbite-react';
import type { OportunidadEnAgenda } from '@/lib/crm/agenda';

interface Props {
  dia: Date;
  oportunidades: OportunidadEnAgenda[];
  /** En el mes las celdas son diminutas; en semana y día cabe más. */
  compacto?: boolean;
}

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Con la hora, no solo el dia: varias solicitudes del mismo dia son justo el
// caso en que hace falta saber cual llego antes.
const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

/**
 * CRM-12/13. Las oportunidades que miran a este día, sobre el calendario.
 *
 * Van en trazo discontinuo y en gris a propósito: lo que bloquea el espacio se
 * pinta lleno, y esto no bloquea nada. Si se parecieran, el anfitrión acabaría
 * dejando un sábado libre creyendo que ya está vendido.
 *
 * Al abrirlas salen en orden de solicitud. Mientras no haya una regla acordada
 * para priorizar varias sobre la misma fecha, quién pidió primero es lo único
 * objetivo que hay.
 */
export default function OportunidadesDelDia({ dia, oportunidades, compacto = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  if (oportunidades.length === 0) return null;

  const n = oportunidades.length;
  const etiqueta = n === 1 ? '1 oportunidad' : `${n} oportunidades`;

  return (
    <>
      <button
        onClick={(e) => {
          // El día entero abre el detalle de reservas; esto es otra cosa.
          e.stopPropagation();
          setAbierto(true);
        }}
        className={
          compacto
            ? 'w-full truncate rounded border border-dashed border-amber-400 bg-amber-50/60 px-1 py-0.5 text-left text-[10px] leading-tight text-amber-800 hover:bg-amber-100'
            : 'rounded-lg border border-dashed border-amber-400 bg-amber-50/60 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100'
        }
        title={`${etiqueta} con fecha tentativa. No bloquean el espacio.`}
      >
        ◇ {etiqueta}
      </button>

      <Modal show={abierto} onClose={() => setAbierto(false)} size="3xl" dismissible>
        <ModalHeader>
          Oportunidades del{' '}
          {dia.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </ModalHeader>
        <ModalBody>
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ninguna de estas aparta el espacio: son propuestas con fecha tentativa.
            El día sigue disponible hasta que una se convierta en reserva.
          </p>
          <ol className="space-y-3">
            {oportunidades.map((o, i) => (
              <li
                key={o.id}
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {i + 1}. {o.contacto ?? o.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Solicitada el {cuando(o.solicitadaEl)}
                      {o.hora ? ` · ${o.hora}` : ''}
                      {o.personas ? ` · ${o.personas} personas` : ''}
                      {o.tipoDeExperiencia ? ` · ${o.tipoDeExperiencia.toLowerCase()}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Cotización v{o.versionDeCotizacion}
                      {/* TR-14. De qué opción es esta fila: la misma propuesta
                          puede aparecer en tres días distintos, y sin decirlo
                          parecerían tres ventas. */}
                      {o.opcion
                        ? ` · ${o.opcion.etiqueta || `opción ${o.opcion.posicion}`}`
                        : ''}
                      {o.cotizacionEnviada ? ' · enviada' : ' · sin enviar'}
                      {o.valor > 0 ? ` · ${pesos(o.valor)}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/crm/oportunidades/${o.id}`}
                    className="shrink-0 text-sm font-medium text-marca hover:underline"
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </ModalBody>
      </Modal>
    </>
  );
}
