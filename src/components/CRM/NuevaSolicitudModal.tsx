"use client";

import React, { useEffect, useState } from 'react';
import { HiSearch, HiUserAdd, HiX } from 'react-icons/hi';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { getContactsByHost } from '@/lib/sanity/contactService';
import TelefonoInput from '@/components/TelefonoInput';
import {
  ORIGENES,
  TIPOS_DE_COMPRADOR,
  TIPOS_DE_EXPERIENCIA,
  crearSolicitud,
  errorDeSolicitud,
  pideDetalleDeOrigen,
  type NuevaSolicitud,
  type Origen,
  type TipoDeComprador,
  type TipoDeExperiencia,
} from '@/lib/crm/solicitud';
import type { Contact } from '@/types';

interface Props {
  abierto: boolean;
  onClose: () => void;
  onCreada?: (id: string) => void;
}

/**
 * Nueva solicitud: lo minimo para no perder un lead.
 *
 * Se pregunta primero que clase de experiencia es, porque de eso sale todo lo
 * demas: una abierta se le vende siempre a un particular y no hay nada que
 * elegir; una privada si.
 *
 * Los contactos se buscan antes de crearlos. El API tambien deduplica por
 * correo y telefono, pero verlo antes evita la sorpresa de creer que se creo
 * uno nuevo cuando se reutilizo otro.
 */
export default function NuevaSolicitudModal({ abierto, onClose, onCreada }: Props) {
  const { sanityUser } = useAuth();
  const { showError, showSuccess } = useSweetAlert();

  const [tipo, setTipo] = useState<TipoDeExperiencia | ''>('');
  const [comprador, setComprador] = useState<TipoDeComprador | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Contact[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<Contact | null>(null);
  const [nuevo, setNuevo] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [origen, setOrigen] = useState<Origen | ''>('');
  const [detalleOrigen, setDetalleOrigen] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const limpiar = () => {
    setTipo(''); setComprador(''); setBusqueda(''); setResultados([]);
    setElegido(null); setNuevo({ firstName: '', lastName: '', email: '', phone: '' });
    setOrigen(''); setDetalleOrigen(''); setNotas('');
  };

  // Busqueda con freno: sin esto se dispara una consulta por tecla.
  useEffect(() => {
    if (!sanityUser?.companyId || busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        setResultados(
          await getContactsByHost(sanityUser.companyId!, { query: busqueda.trim(), limit: 5 }),
        );
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda, sanityUser?.companyId]);

  if (!abierto) return null;

  const datos = (): NuevaSolicitud => ({
    experienceKind: tipo as TipoDeExperiencia,
    buyerKind: tipo === 'PRIVADA' ? (comprador as TipoDeComprador) : undefined,
    contactId: elegido?._id,
    contacto: elegido
      ? undefined
      : {
          firstName: nuevo.firstName.trim(),
          lastName: nuevo.lastName.trim() || undefined,
          email: nuevo.email.trim() || undefined,
          phone: nuevo.phone.trim() || undefined,
        },
    leadSource: origen || undefined,
    leadSourceDetail: detalleOrigen.trim() || undefined,
    notes: notas.trim() || undefined,
  });

  const guardar = async () => {
    const s = datos();
    const error = errorDeSolicitud(s);
    if (error) {
      showError('Falta algo', error);
      return;
    }
    setGuardando(true);
    try {
      const creada = await crearSolicitud(s);
      await showSuccess('Solicitud creada', 'Ya puedes cotizarla o seguirla desde el CRM.');
      limpiar();
      onClose();
      onCreada?.(creada.id);
    } catch (err) {
      console.error('Error creando la solicitud:', err);
      showError('No pudimos crear la solicitud', 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const botonTipo = (activo: boolean) =>
    `flex-1 rounded-xl border p-3 text-left transition-colors ${
      activo ? 'border-[#F26726] bg-orange-50' : 'border-gray-300 hover:bg-gray-50'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#334C5D]">Nueva solicitud</h2>
            <p className="text-sm text-gray-500">
              Con el nombre y una forma de contacto basta. El resto se completa después.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              ¿Qué tipo de experiencia busca? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              {TIPOS_DE_EXPERIENCIA.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => {
                    setTipo(t.valor);
                    if (t.valor === 'ABIERTA') setComprador('');
                  }}
                  className={botonTipo(tipo === t.valor)}
                >
                  <span className="block text-sm font-medium text-gray-900">{t.titulo}</span>
                  <span className="block text-xs text-gray-500">{t.ayuda}</span>
                </button>
              ))}
            </div>
          </div>

          {tipo === 'PRIVADA' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                ¿Quién compra? <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                {TIPOS_DE_COMPRADOR.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setComprador(t.valor)}
                    className={botonTipo(comprador === t.valor)}
                  >
                    <span className="block text-sm font-medium text-gray-900">{t.titulo}</span>
                    <span className="block text-xs text-gray-500">{t.ayuda}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {tipo === 'ABIERTA' && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Una experiencia abierta se le vende siempre a un particular, así que
              queda como <strong>Social</strong> sin que tengas que elegirlo.
            </p>
          )}

          {tipo && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contacto <span className="text-red-500">*</span>
              </label>

              {elegido ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F26726] bg-orange-50 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {elegido.firstName} {elegido.lastName ?? ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[elegido.email, elegido.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setElegido(null)}
                    className="shrink-0 text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Busca por nombre, correo o teléfono…"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                    />
                  </div>

                  {buscando && <p className="mt-2 text-xs text-gray-400">Buscando…</p>}

                  {resultados.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">Ya los tienes registrados:</p>
                      {resultados.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => { setElegido(c); setBusqueda(''); }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 p-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-gray-900">
                              {c.firstName} {c.lastName ?? ''}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {[c.email, c.phone].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-[#F26726]">Usar</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <HiUserAdd className="h-4 w-4" />
                      O crea uno nuevo
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={nuevo.firstName}
                        onChange={(e) => setNuevo({ ...nuevo, firstName: e.target.value })}
                        placeholder="Nombre *"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                      />
                      <input
                        type="text"
                        value={nuevo.lastName}
                        onChange={(e) => setNuevo({ ...nuevo, lastName: e.target.value })}
                        placeholder="Apellido"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                      />
                      <input
                        type="email"
                        value={nuevo.email}
                        onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                        placeholder="Correo"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                      />
                      <TelefonoInput
                        value={nuevo.phone}
                        onChange={(v) => setNuevo({ ...nuevo, phone: v })}
                        placeholder="Teléfono"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Con el teléfono o el correo basta; no hacen falta los dos.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {tipo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ¿De dónde viene? <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  value={origen}
                  onChange={(e) => { setOrigen(e.target.value as Origen); setDetalleOrigen(''); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                >
                  <option value="">Sin especificar</option>
                  {ORIGENES.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                  ))}
                </select>
                {pideDetalleDeOrigen(origen) && (
                  <input
                    type="text"
                    value={detalleOrigen}
                    onChange={(e) => setDetalleOrigen(e.target.value)}
                    placeholder={origen === 'REFERIDO' ? '¿Quién lo refirió?' : '¿Qué canal?'}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ¿Qué pidió? <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: cena para 20 personas en noviembre, sin fecha fija todavía"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#F26726]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !tipo}
            className="rounded-lg bg-[#F26726] px-6 py-2 text-white transition-colors hover:bg-[#d9571f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Crear solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}
