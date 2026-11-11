"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from 'flowbite-react';
import { HiCheckCircle, HiOutlinePlay, HiX } from 'react-icons/hi';
import type { Company } from '@/types';
import { calcularCompletitud } from '@/lib/company/completitud';
import {
  getOnboarding,
  guardarOnboarding,
  type OnboardingDelUsuario,
} from '@/lib/api/onboarding';
import { PASOS_DE_INICIO, pasoHecho } from '@/lib/onboarding/pasos';
import { iniciarTour } from '@/lib/onboarding/tour';
import { evento } from '@/lib/analytics';

interface Props {
  /** La empresa del anfitrión, para saber si su ficha está completa. */
  empresa: Company | null;
  className?: string;
}

/**
 * «Primeros pasos» del anfitrión, y el tour por la plataforma.
 *
 * El avance sale de lo que existe en su empresa, no de marcas: un paso solo
 * aparece hecho si de verdad lo está. Lo único que el anfitrión decide es saltar
 * un paso, ocultar la lista o volver a ver el tour; eso se guarda en el API,
 * por usuario, para que lo recuerde en cualquier dispositivo.
 *
 * La primera vez que entra se le ofrece el tour solo. Si falla la carga no se
 * dice nada: es una ayuda, no vale ensuciar el dashboard por ella.
 */
export default function PrimerosPasos({ empresa, className = '' }: Props) {
  const [datos, setDatos] = useState<OnboardingDelUsuario | null>(null);
  const tourOfrecido = useRef(false);

  const guardar = useCallback(async (cambio: Parameters<typeof guardarOnboarding>[0]) => {
    try {
      const nuevo = await guardarOnboarding(cambio);
      if (nuevo) setDatos(nuevo);
    } catch {
      /* Una ayuda no puede dar un error en pantalla. */
    }
  }, []);

  const verTour = useCallback(() => {
    iniciarTour((completo) => {
      // Cerrarlo a medias también cuenta como visto, pero no como completado.
      evento(completo ? 'tour_completado' : 'tour_cerrado');
      void guardar({ tourVisto: true });
    });
  }, [guardar]);

  useEffect(() => {
    let vigente = true;
    getOnboarding()
      .then((d) => { if (vigente && d) setDatos(d); })
      .catch(() => undefined);
    return () => { vigente = false; };
  }, []);

  // La primera vez, el tour se ofrece solo. Se espera un momento a que el menú
  // termine de pintarse, o el primer globo mediría una pantalla a medias.
  useEffect(() => {
    if (!datos || datos.estado.tourVisto || tourOfrecido.current) return;
    tourOfrecido.current = true;
    const t = window.setTimeout(verTour, 800);
    return () => window.clearTimeout(t);
  }, [datos, verTour]);

  if (!datos || datos.estado.oculto) return null;

  const empresaCompleta = calcularCompletitud(empresa).completa;
  const pasos = PASOS_DE_INICIO.map((p) => {
    const saltado = datos.estado.descartados.includes(p.id);
    const hecho = pasoHecho(p.id, datos.avance, empresaCompleta);
    return { ...p, saltado, hecho, resuelto: hecho || saltado };
  });
  const resueltos = pasos.filter((p) => p.resuelto).length;
  const porcentaje = Math.round((resueltos / pasos.length) * 100);
  const siguiente = pasos.find((p) => !p.resuelto);

  const saltar = (id: string) => {
    evento('primer_paso_omitido', { paso: id });
    return guardar({ descartados: [...new Set([...datos.estado.descartados, id])] });
  };

  return (
    <section
      className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-5 ${className}`}
      aria-label="Primeros pasos"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-[#334C5D]">
            {siguiente ? 'Primeros pasos' : '¡Todo listo para vender!'}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {siguiente
              ? `${resueltos} de ${pasos.length} listos. Sigue estos pasos para recibir tu primera reserva.`
              : 'Ya tienes lo necesario para recibir reservas. Puedes cerrar esta lista.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="xs" color="light" onClick={verTour}>
            <HiOutlinePlay className="mr-1 h-4 w-4" /> Ver recorrido
          </Button>
          <button
            type="button"
            onClick={() => void guardar({ oculto: true })}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar primeros pasos"
            title="Cerrar"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-[#F26726] transition-all" style={{ width: `${porcentaje}%` }} />
      </div>

      <ol className="mt-4 divide-y divide-gray-100">
        {pasos.map((p) => {
          const esElSiguiente = p.id === siguiente?.id;
          return (
            <li key={p.id} className="flex items-start gap-3 py-3">
              {p.resuelto ? (
                <HiCheckCircle
                  className={`h-6 w-6 shrink-0 mt-0.5 ${p.hecho ? 'text-green-600' : 'text-gray-300'}`}
                  aria-label={p.hecho ? 'Hecho' : 'Omitido'}
                />
              ) : (
                <span
                  className={`h-6 w-6 shrink-0 mt-0.5 rounded-full border-2 ${
                    esElSiguiente ? 'border-[#F26726]' : 'border-gray-300'
                  }`}
                  aria-label="Pendiente"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${p.resuelto ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {p.titulo}
                  {p.saltado && !p.hecho && <span className="ml-2 text-xs font-normal no-underline text-gray-400">Omitido</span>}
                </p>
                {!p.resuelto && <p className="text-xs text-gray-500 mt-0.5">{p.descripcion}</p>}
              </div>
              {!p.resuelto && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void saltar(p.id)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Omitir
                  </button>
                  <Link href={p.href}>
                    <Button size="xs" color={esElSiguiente ? 'primary' : 'light'}>
                      {p.accion}
                    </Button>
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
