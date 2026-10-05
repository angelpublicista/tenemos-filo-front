"use client";

import React, { use, useCallback, useEffect, useState } from 'react';
import { HiStar, HiCheckCircle } from 'react-icons/hi';
import { mensajeDeError } from '@/lib/api/client';
import {
  enviarCalificacion,
  getQueSeCalifica,
  type Estrellas,
  type QueSeCalifica,
} from '@/lib/api/calificar';

/**
 * Calificar una experiencia desde el enlace del correo (TR-24).
 *
 * Sin sesión y sin escribir nada: cuatro filas de estrellas y listo. Quien
 * cenó no tiene por qué registrarse para decir si le gustó, y pedirle un
 * comentario es la forma de que no califique.
 *
 * Las cuatro dimensiones son cuatro decisiones distintas del anfitrión: un
 * sitio incómodo con comida excelente no se arregla igual que lo contrario.
 */

const DIMENSIONES: Array<{ clave: keyof Estrellas; etiqueta: string; ayuda: string }> = [
  { clave: 'general', etiqueta: 'La experiencia en general', ayuda: '¿Volverías?' },
  { clave: 'servicio', etiqueta: 'El servicio', ayuda: 'Cómo te atendieron' },
  { clave: 'ubicacion', etiqueta: 'El lugar', ayuda: 'El sitio y cómo estaba' },
  { clave: 'comida', etiqueta: 'La comida', ayuda: 'Lo que comiste y bebiste' },
];

function Fila({
  etiqueta,
  ayuda,
  valor,
  onChange,
}: {
  etiqueta: string;
  ayuda: string;
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="border-t border-gray-100 py-4 first:border-t-0">
      <p className="text-sm font-semibold text-gray-900">{etiqueta}</p>
      <p className="mb-2 text-xs text-gray-500">{ayuda}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} de 5`}
            onClick={() => onChange(n)}
            className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F26726]"
          >
            <HiStar
              className={`h-8 w-8 ${n <= valor ? 'text-[#F26726]' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CalificarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [datos, setDatos] = useState<QueSeCalifica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [estrellas, setEstrellas] = useState<Estrellas>({
    general: 0,
    servicio: 0,
    ubicacion: 0,
    comida: 0,
  });

  const cargar = useCallback(async () => {
    try {
      setDatos(await getQueSeCalifica(token));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const completas = DIMENSIONES.every((d) => estrellas[d.clave] >= 1);

  const enviar = async () => {
    setEnviando(true);
    try {
      await enviarCalificacion(token, estrellas);
      setListo(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Un momento…</p>
      </main>
    );
  }

  if (error && !datos) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Este enlace ya no sirve</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (listo || datos?.yaCalificada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <HiCheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">
            {listo ? '¡Gracias!' : 'Ya nos contaste'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {listo
              ? `${datos?.empresa ?? 'El anfitrión'} va a ver tu calificación.`
              : 'Esta experiencia ya fue calificada desde este enlace.'}
          </p>
        </div>
      </main>
    );
  }

  const cuando = datos
    ? new Date(datos.fecha).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F26726]">
            {datos?.empresa}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight text-gray-900">
            ¿Qué tal estuvo {datos?.experiencia}?
          </h1>
          <p className="mt-1 text-sm text-gray-500">{cuando}</p>

          <div className="mt-4">
            {DIMENSIONES.map((d) => (
              <Fila
                key={d.clave}
                etiqueta={d.etiqueta}
                ayuda={d.ayuda}
                valor={estrellas[d.clave]}
                onChange={(n) => setEstrellas((prev) => ({ ...prev, [d.clave]: n }))}
              />
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={enviar}
            disabled={!completas || enviando}
            className="mt-6 w-full rounded-xl bg-[#F26726] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#d9571f] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
          {!completas && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Marca las cuatro para enviar
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
