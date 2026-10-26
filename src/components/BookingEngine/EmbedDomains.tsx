"use client";

import React, { useState } from 'react';
import { Badge, Button, Card, TextInput } from 'flowbite-react';
import { HiPlus, HiX, HiGlobeAlt } from 'react-icons/hi';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { setEmbedDomains } from '@/lib/sanity/companyService';

type Props = {
  companyId: string;
  /** Dominios ya guardados, ya normalizados por el API. */
  iniciales: string[];
};

/**
 * Dominios autorizados a insertar el catálogo en un iframe.
 *
 * Lista vacía = cualquiera puede. Es el comportamiento de siempre y el que
 * hay que conservar por defecto: restringir de golpe rompería los embeds ya
 * publicados de todos los anfitriones.
 */
export default function EmbedDomains({ companyId, iniciales }: Props) {
  const { showSuccess, showError } = useSweetAlert();
  const [dominios, setDominios] = useState<string[]>(iniciales);
  const [nuevo, setNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (lista: string[]) => {
    setGuardando(true);
    try {
      const guardados = await setEmbedDomains(companyId, lista);
      // Usamos lo que devuelve el API: normaliza "misitio.com/precios" a
      // "https://misitio.com", y conviene que se vea tal cual quedó.
      setDominios(guardados);
      showSuccess(
        'Dominios actualizados',
        guardados.length === 0
          ? 'Cualquier sitio puede insertar tu catálogo.'
          : `Solo ${guardados.length} ${guardados.length === 1 ? 'sitio podrá' : 'sitios podrán'} insertarlo.`,
      );
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const agregar = () => {
    const texto = nuevo.trim();
    if (!texto) return;
    setNuevo('');
    void guardar([...dominios, texto]);
  };

  const quitar = (dominio: string) => {
    void guardar(dominios.filter((d) => d !== dominio));
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <HiGlobeAlt className="w-6 h-6 text-[#334C5D] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">Dónde se puede insertar</h3>
          <p className="text-sm text-gray-600">
            Restringe en qué sitios web puede incrustarse tu catálogo. Si no añades ninguno,
            cualquiera podrá hacerlo.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <TextInput
          className="flex-1"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="misitio.com"
        />
        <Button color="primary" onClick={agregar} disabled={guardando || !nuevo.trim()}>
          <HiPlus className="w-4 h-4 mr-1" />
          Añadir
        </Button>
      </div>

      {dominios.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Sin restricción: tu catálogo puede insertarse en cualquier sitio web.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {dominios.map((d) => (
            <Badge key={d} color="info" className="flex items-center gap-1 py-1.5 pl-3 pr-2">
              <span className="font-normal">{d}</span>
              <button
                type="button"
                onClick={() => quitar(d)}
                disabled={guardando}
                className="ml-1 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-50"
                aria-label={`Quitar ${d}`}
              >
                <HiX className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Puedes escribirlo como quieras (<code>misitio.com</code>,{' '}
        <code>https://misitio.com/precios</code>): se guarda solo el dominio.
      </p>
    </Card>
  );
}
