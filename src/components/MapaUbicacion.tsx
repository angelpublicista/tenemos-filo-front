"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CENTRO_POR_DEFECTO, cargarMapas, direccionParaBuscar, hayMapas } from '@/lib/mapas';

export interface Coordenadas {
  lat: number;
  lng: number;
}

interface Props {
  valor: Coordenadas | null;
  /** Solo en modo editable. */
  onChange?: (c: Coordenadas) => void;
  /** La direccion escrita, para el pin automatico. */
  direccion?: { street?: string; city?: string; state?: string };
  /** Sin esto el mapa solo se mira: es el del catalogo publico. */
  editable?: boolean;
  altura?: string;
}

/**
 * La sede en el mapa.
 *
 * El pin se pone solo a partir de la direccion escrita, pero se puede
 * arrastrar. Eso no es un adorno: en Colombia la nomenclatura "Cra 13 #85-32"
 * se geocodifica a la cuadra mas veces de las que uno querria, y quien sabe
 * donde esta la puerta es el anfitrion.
 *
 * Lo que se guarda es lo que quede en el pin. Una vez movido a mano no se
 * recalcula solo al cambiar la direccion: se ofrece el boton y decide quien
 * edita, porque perder una correccion hecha a mano es peor que tener que
 * pulsar.
 */
export default function MapaUbicacion({
  valor,
  onChange,
  direccion,
  editable = false,
  altura = 'h-64',
}: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const pin = useRef<google.maps.Marker | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  // El callback cambia en cada render del padre; guardarlo en una ref evita
  // rehacer el mapa entero por eso.
  const alMover = useRef(onChange);
  alMover.current = onChange;

  useEffect(() => {
    if (!hayMapas()) {
      setError('El mapa no está configurado.');
      return;
    }
    let vigente = true;

    cargarMapas()
      .then(() => {
        if (!vigente || !caja.current || !window.google) return;
        const centro = valor ?? CENTRO_POR_DEFECTO;
        const m = new window.google.maps.Map(caja.current, {
          center: centro,
          zoom: valor ? 17 : 12,
          disableDefaultUI: !editable,
          streetViewControl: false,
          mapTypeControl: false,
        });
        const p = new window.google.maps.Marker({
          map: m,
          position: centro,
          draggable: editable,
        });
        if (editable) {
          p.addListener('dragend', (e) => {
            alMover.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
          // Pulsar el mapa tambien mueve el pin: arrastrar en movil es
          // incomodo y no todo el mundo descubre que se puede.
          m.addListener('click', (e) => {
            const c = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            p.setPosition(c);
            alMover.current?.(c);
          });
        }
        mapa.current = m;
        pin.current = p;
        setListo(true);
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar el mapa. Revisa tu conexión.');
      });

    return () => {
      vigente = false;
    };
    // Se monta una vez: mover el pin despues es cosa del efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El pin sigue al valor cuando cambia desde fuera (al buscar la direccion,
  // o al cargar una sede que ya tenia ubicacion).
  useEffect(() => {
    if (!listo || !valor || !pin.current || !mapa.current) return;
    pin.current.setPosition(valor);
    mapa.current.setCenter(valor);
    mapa.current.setZoom(17);
  }, [valor, listo]);

  const ubicarPorDireccion = useCallback(async () => {
    if (!direccion || !window.google) return;
    const texto = direccionParaBuscar(direccion);
    if (!texto.replace(/,|\s|Colombia/g, '')) {
      setError('Escribe primero la dirección y la ciudad.');
      return;
    }
    setBuscando(true);
    setError(null);
    try {
      const { results } = await new window.google.maps.Geocoder().geocode({
        address: texto,
        region: 'co',
      });
      const sitio = results[0]?.geometry.location;
      if (!sitio) {
        setError('No encontramos esa dirección. Mueve el pin a mano.');
        return;
      }
      alMover.current?.({ lat: sitio.lat(), lng: sitio.lng() });
    } catch {
      // Geocodificar falla por cuota, por red o porque la direccion no existe.
      // En los tres casos la salida es la misma: ponerlo a mano.
      setError('No pudimos buscar la dirección. Mueve el pin a mano.');
    } finally {
      setBuscando(false);
    }
  }, [direccion]);

  if (!hayMapas()) {
    return (
      <div className={`${altura} flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center`}>
        <p className="text-sm text-gray-500">
          El mapa no está configurado todavía.
          {editable && ' Puedes guardar la sede igualmente.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ubicarPorDireccion}
            disabled={buscando || !listo}
            className="rounded-lg border border-[#F26726] px-3 py-1.5 text-sm text-[#F26726] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buscando ? 'Buscando…' : 'Ubicar por la dirección'}
          </button>
          <span className="text-xs text-gray-500">
            Arrastra el pin o pulsa el mapa para ajustarlo.
          </span>
        </div>
      )}

      <div ref={caja} className={`${altura} w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100`} />

      {valor && (
        <p className="text-xs text-gray-400">
          {valor.lat.toFixed(6)}, {valor.lng.toFixed(6)}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
