"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Label, Textarea, TextInput, ToggleSwitch } from 'flowbite-react';
import { HiOutlineChatAlt2, HiPaperAirplane } from 'react-icons/hi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import ConversacionesDelAgente from '@/components/Agente/ConversacionesDelAgente';
import {
  getAgente,
  guardarAgente,
  probarAgente,
  type AgenteConfig,
  type GuardarAgente,
} from '@/lib/agente/agente';

/** Los tokens no vuelven del API: se escriben enteros o se dejan en blanco. */
type Secretos = { waAccessToken: string; waVerifyToken: string; waAppSecret: string };
const VACIOS: Secretos = { waAccessToken: '', waVerifyToken: '', waAppSecret: '' };

type Turno = { de: 'tu' | 'agente'; texto: string };

/**
 * El agente de IA del anfitrión y su conexión con WhatsApp.
 *
 * Dos cosas gobiernan la pantalla. Una: encendido no es lo mismo que
 * atendiendo WhatsApp —se puede encender y probarlo aquí mismo antes de tener
 * las credenciales de Meta, que es un trámite aparte— y la etiqueta dice cuál
 * de las dos cosas es. Dos: se puede probar sin WhatsApp, porque encender un
 * agente que habla con clientes sin haberlo oído antes es temerario.
 */
export default function AgentePage() {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [estado, setEstado] = useState<AgenteConfig | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('Asistente');
  const [tono, setTono] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [puedeCrearSolicitud, setPuedeCrearSolicitud] = useState(true);
  const [puedeEnviarEnlace, setPuedeEnviarEnlace] = useState(true);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [numero, setNumero] = useState('');
  const [secretos, setSecretos] = useState<Secretos>(VACIOS);

  const [prueba, setPrueba] = useState('');
  const [vuelta, setVuelta] = useState(0);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [probando, setProbando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const a = await getAgente();
      setEstado(a);
      setNombre(a.nombre);
      setTono(a.tono ?? '');
      setInstrucciones(a.instrucciones ?? '');
      setPuedeCrearSolicitud(a.puedeCrearSolicitud);
      setPuedeEnviarEnlace(a.puedeEnviarEnlace);
      setPhoneNumberId(a.waPhoneNumberId ?? '');
      setNumero(a.waNumero ?? '');
      setSecretos(VACIOS);
    } catch {
      setEstado(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const cambios = (): GuardarAgente => {
    const c: GuardarAgente = {
      nombre,
      tono,
      instrucciones,
      puedeCrearSolicitud,
      puedeEnviarEnlace,
      waNumero: numero,
    };
    if (phoneNumberId !== (estado?.waPhoneNumberId ?? '')) c.waPhoneNumberId = phoneNumberId;
    // Solo viajan los que se escribieron: en blanco es "no lo toques".
    if (secretos.waAccessToken) c.waAccessToken = secretos.waAccessToken;
    if (secretos.waVerifyToken) c.waVerifyToken = secretos.waVerifyToken;
    if (secretos.waAppSecret) c.waAppSecret = secretos.waAppSecret;
    return c;
  };

  const enviar = async (extra: GuardarAgente = {}) => {
    setGuardando(true);
    try {
      const a = await guardarAgente({ ...cambios(), ...extra });
      setEstado(a);
      setSecretos(VACIOS);
      // El aviso dice en qué quedó la cosa, no "guardado": encender y apagar
      // cambian quién le contesta a tus clientes, y eso merece decirse.
      if (extra.enabled === false) showSuccess('Apagado', 'Ya no le contesta a nadie.');
      else if (extra.enabled === true) {
        showSuccess(
          'Encendido',
          a.atendiendoWhatsApp
            ? 'Ya está contestando por WhatsApp.'
            : 'Pruébalo aquí abajo. Para WhatsApp todavía le falta algo.',
        );
      } else {
        showSuccess('Guardado', a.enabled ? '' : 'Lo usará en cuanto lo enciendas.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo guardar', msg || 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async () => {
    if (estado?.enabled) return enviar({ enabled: false });
    const ok = await showConfirmation(
      '¿Encender el agente?',
      '',
      'Sí, encender',
      'Cancelar',
      [
        'Si tienes WhatsApp conectado, empezará a contestarle a tus clientes por su cuenta.',
        'Nunca confirma reservas ni cobra: responde, guarda la solicitud y pasa el enlace.',
        'Pruébalo aquí abajo antes, y léete lo que contesta.',
      ],
    );
    if (!ok) return;
    return enviar({ enabled: true });
  };

  const probar = async () => {
    const texto = prueba.trim();
    if (!texto) return;
    setPrueba('');
    setTurnos((t) => [...t, { de: 'tu', texto }]);
    setProbando(true);
    try {
      const r = await probarAgente(texto);
      setTurnos((t) => [
        ...t,
        { de: 'agente', texto: r.respuesta ?? `— ${r.motivo ?? 'No contestó.'}` },
      ]);
      // La prueba gasta cupo y deja un hilo guardado, asi que el contador y la
      // lista de abajo tienen que moverse: si no, parecen no enterarse.
      if (r.respuesta) {
        setEstado((e) => (e ? { ...e, mensajesUsados: e.mensajesUsados + 1 } : e));
        setVuelta((v) => v + 1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo probar', msg || 'Inténtalo de nuevo.');
    } finally {
      setProbando(false);
    }
  };

  if (cargando) return null;

  const activo = estado?.enabled === true;
  const atendiendo = estado?.atendiendoWhatsApp === true;
  const faltan = estado?.faltan ?? [];

  return (
    <ProtectedRoute roles={['host', 'admin']}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#334C5D]">Agente de IA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contesta por ti en WhatsApp con la información real de tus experiencias, guarda la
            solicitud en tu CRM y le pasa al cliente su enlace de reserva. No confirma ni cobra:
            eso lo sigues decidiendo tú.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#334C5D]">Tu agente</h2>
            {/* Encendido y atendiendo WhatsApp no son lo mismo: se puede
                encender para probarlo antes de tener las credenciales. */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  atendiendo
                    ? 'bg-green-100 text-green-800'
                    : activo
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {atendiendo ? 'Atendiendo WhatsApp' : activo ? 'Encendido, sin WhatsApp' : 'Apagado'}
              </span>
              <ToggleSwitch
                checked={activo}
                label="Encender el agente"
                onChange={() => void alternar()}
                disabled={guardando}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ag-nombre">¿Cómo se llama?</Label>
              <TextInput
                id="ag-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Sofía"
              />
              <p className="mt-1 text-xs text-gray-500">Así se presenta a tus clientes.</p>
            </div>
            <div>
              <Label htmlFor="ag-tono">¿Cómo habla?</Label>
              <TextInput
                id="ag-tono"
                value={tono}
                onChange={(e) => setTono(e.target.value)}
                placeholder="cercano y breve, de tú"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ag-instrucciones">Lo que tiene que saber</Label>
              <Textarea
                id="ag-instrucciones"
                rows={5}
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                placeholder={
                  'Lo que no está en tus experiencias y te preguntan todo el tiempo.\n' +
                  'Ej: hay parqueadero en la calle; no manejamos menú infantil; los sábados cerramos a las 11.'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Precios, horarios y sedes los saca solo de tus experiencias: eso no hace falta
                escribirlo, y escribirlo aquí lo desactualiza.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-4">
              <div>
                <p className="text-sm font-semibold text-[#334C5D]">Guardar la solicitud</p>
                <p className="text-sm text-gray-500">
                  Cuando sepa quién es y qué quiere, lo deja en tu CRM para que lo contactes.
                </p>
              </div>
              <ToggleSwitch
                checked={puedeCrearSolicitud}
                label=""
                onChange={() => setPuedeCrearSolicitud((v) => !v)}
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-4">
              <div>
                <p className="text-sm font-semibold text-[#334C5D]">Pasar el enlace de reserva</p>
                <p className="text-sm text-gray-500">
                  Con los datos del cliente ya puestos. Reserva él, no el agente.
                </p>
              </div>
              <ToggleSwitch
                checked={puedeEnviarEnlace}
                label=""
                onChange={() => setPuedeEnviarEnlace((v) => !v)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button color="primary" onClick={() => void enviar()} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </section>

        {/* Probarlo sin WhatsApp. Va antes de la configuración de Meta a
            propósito: conectar el número es un trámite, y oír al agente no
            debería esperar a eso. */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#334C5D]">Pruébalo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Escríbele como lo haría un cliente. Esto no usa WhatsApp, no le llega a nadie y no
            guarda nada en tu CRM: el enlace de reserva que te pase es de muestra.
          </p>

          {!activo && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Enciéndelo arriba para poder probarlo.
            </p>
          )}

          {turnos.length > 0 && (
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
              {turnos.map((t, i) => (
                <div key={i} className={`flex ${t.de === 'tu' ? 'justify-end' : 'justify-start'}`}>
                  <span
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      t.de === 'tu' ? 'bg-marca text-marca-contraste' : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {t.texto}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <TextInput
              className="flex-1"
              value={prueba}
              onChange={(e) => setPrueba(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void probar(); }}
              placeholder="Hola, ¿qué experiencias tienen?"
              disabled={!activo || probando}
            />
            <Button color="primary" onClick={() => void probar()} disabled={!activo || probando}>
              <HiPaperAirplane className="h-4 w-4 rotate-90" />
            </Button>
          </div>
          {estado && (
            <p className="mt-2 text-xs text-gray-500">
              Llevas {estado.mensajesUsados} de {estado.mensajesPorMes} respuestas este mes.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <HiOutlineChatAlt2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-[#334C5D]">Conectar tu WhatsApp</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Con tu propia cuenta de Meta: el número es tuyo y los mensajes salen de él. Los datos
            están en tu app de Meta, en WhatsApp → Configuración de la API.
          </p>

          {activo && faltan.length > 0 && (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900">
              <strong>Todavía no contesta por WhatsApp.</strong> {faltan.join(' ')} Mientras tanto
              puedes probarlo aquí arriba.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ag-pnid">Phone Number ID</Label>
              <TextInput
                id="ag-pnid"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="109876543210987"
              />
            </div>
            <div>
              <Label htmlFor="ag-numero">Tu número (como se ve)</Label>
              <TextInput
                id="ag-numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ag-token">
                Token de acceso {estado?.accessTokenConfigurado && '· guardado'}
              </Label>
              <TextInput
                id="ag-token"
                type="password"
                autoComplete="off"
                value={secretos.waAccessToken}
                placeholder={estado?.accessTokenConfigurado ? 'Déjalo en blanco para no cambiarlo' : 'EAAG...'}
                onChange={(e) => setSecretos((s) => ({ ...s, waAccessToken: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Usa uno permanente. Los temporales de Meta caducan en 24 horas y el agente deja de
                contestar sin avisar.
              </p>
            </div>
            <div>
              <Label htmlFor="ag-verify">
                Token de verificación {estado?.verifyTokenConfigurado && '· guardado'}
              </Label>
              <TextInput
                id="ag-verify"
                type="password"
                autoComplete="off"
                value={secretos.waVerifyToken}
                placeholder={estado?.verifyTokenConfigurado ? 'Déjalo en blanco para no cambiarlo' : 'Invéntatelo'}
                onChange={(e) => setSecretos((s) => ({ ...s, waVerifyToken: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Te lo inventas tú y lo pegas igual en Meta: sirve para que sepamos que quien
                configura el webhook eres tú.
              </p>
            </div>
            <div>
              <Label htmlFor="ag-appsecret">
                App Secret {estado?.appSecretConfigurado && '· guardado'}
              </Label>
              <TextInput
                id="ag-appsecret"
                type="password"
                autoComplete="off"
                value={secretos.waAppSecret}
                placeholder={estado?.appSecretConfigurado ? 'Déjalo en blanco para no cambiarlo' : 'Opcional'}
                onChange={(e) => setSecretos((s) => ({ ...s, waAppSecret: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Opcional, pero recomendado: con él comprobamos que los mensajes vienen de verdad
                de Meta.
              </p>
            </div>

            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                Pega esta URL en Meta como webhook
              </p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs text-gray-700">
                {estado?.urlDelWebhook}
              </code>
              <p className="mt-2 text-xs text-gray-500">
                En tu app de Meta → WhatsApp → Configuración → Webhook. Suscríbete al campo{' '}
                <code>messages</code>. Tus tokens se guardan cifrados y no se vuelven a mostrar.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Button color="primary" onClick={() => void enviar()} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar conexión'}
            </Button>
          </div>
        </section>

        <ConversacionesDelAgente refrescar={vuelta} />
      </div>
    </ProtectedRoute>
  );
}
