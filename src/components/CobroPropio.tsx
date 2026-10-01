"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Label, Select, TextInput, ToggleSwitch } from 'flowbite-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import LogoDePasarela from '@/components/LogoDePasarela';
import {
  getPasarela,
  guardarPasarela,
  type PasarelaDeCobro,
  type ProveedorDePago,
} from '@/lib/company/pasarela';

interface Props {
  companyId: string;
  /** Cuánto se lleva FILO hoy, para poder decir qué se ahorra. */
  comisionDeFilo?: number | null;
}

/** Los secretos no vuelven del API: se escriben enteros o se dejan en blanco. */
type Secretos = { publicKey: string; privateKey: string; integritySecret: string; eventsSecret: string };
const VACIOS: Secretos = { publicKey: '', privateKey: '', integritySecret: '', eventsSecret: '' };

/**
 * Conectar la pasarela de cobro propia.
 *
 * Lo que cambia al activarla no es un detalle técnico: el dinero deja de pasar
 * por FILO y entra directo a la cuenta del anfitrión. Por eso la pantalla
 * explica las tres consecuencias —sin comisión, cobro directo, y la comisión
 * del revendedor pasa a deberla él— antes de que toque nada.
 */
export default function CobroPropio({ companyId, comisionDeFilo }: Props) {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [estado, setEstado] = useState<PasarelaDeCobro | null>(null);
  const [proveedor, setProveedor] = useState<ProveedorDePago>('WOMPI');
  const [entorno, setEntorno] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [secretos, setSecretos] = useState<Secretos>(VACIOS);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Configurar el cobro se limita al titular de la empresa: es a donde va el
  // dinero. A los demás el API les responde 403, y hay que decírselo en vez de
  // enseñarles un formulario que no van a poder guardar.
  const [sinAcceso, setSinAcceso] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const p = await getPasarela(companyId);
      setEstado(p);
      if (p.provider) setProveedor(p.provider);
      setEntorno(p.environment);
      setSecretos({ ...VACIOS, publicKey: p.publicKey ?? '' });
    } catch {
      setEstado(null);
      setSinAcceso(true);
    } finally {
      setCargando(false);
    }
  }, [companyId]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return null;

  if (sinAcceso) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#334C5D]">Cobrar en tu propia cuenta</h2>
        <p className="mt-2 text-sm text-gray-500">
          Solo el titular de la empresa puede configurar con qué pasarela se cobra: es a dónde
          va el dinero de las ventas. Pídeselo a quien figure como titular.
        </p>
      </section>
    );
  }

  const activa = estado?.enabled === true;
  const esMercadoPago = proveedor === 'MERCADO_PAGO';

  const enviar = async (cambios: Parameters<typeof guardarPasarela>[1]) => {
    setGuardando(true);
    try {
      const r = await guardarPasarela(companyId, cambios);
      setEstado(r);
      setSecretos({ ...VACIOS, publicKey: r.publicKey ?? '' });
      if (r.reservasSinCobrar) {
        showError(
          'Ojo con las reservas pendientes',
          `Tienes ${r.reservasSinCobrar} reserva${r.reservasSinCobrar > 1 ? 's' : ''} sin cobrar que iba${
            r.reservasSinCobrar > 1 ? 'n' : ''
          } a tu cuenta. Mientras la pasarela esté apagada no hay forma de cobrarlas: vuelve a encenderla o cóbralas por fuera.`,
        );
      } else {
        showSuccess('Guardado', '');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo guardar', msg || 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Lo que hay que mandar: proveedor, entorno y solo los secretos escritos.
   *
   * Un campo en blanco es "no lo toques", no "bórralo" —borrar se hace
   * apagando la pasarela— y por eso no viajan los vacíos.
   */
  const cambiosPendientes = (): Parameters<typeof guardarPasarela>[1] => {
    const cambios: Parameters<typeof guardarPasarela>[1] = { provider: proveedor, environment: entorno };
    if (secretos.publicKey !== (estado?.publicKey ?? '')) cambios.publicKey = secretos.publicKey;
    if (secretos.privateKey) cambios.privateKey = secretos.privateKey;
    if (secretos.integritySecret) cambios.integritySecret = secretos.integritySecret;
    if (secretos.eventsSecret) cambios.eventsSecret = secretos.eventsSecret;
    return cambios;
  };

  const guardarLlaves = () => enviar(cambiosPendientes());

  const alternar = async () => {
    if (activa) {
      const ok = await showConfirmation(
        '¿Apagar el cobro directo?',
        '',
        'Sí, apagar',
        'Cancelar',
        [
          'Las ventas nuevas volverán a cobrarse por FILO, que descontará su comisión.',
          'Tus reservas sin cobrar quedarán sin forma de cobrarse hasta que vuelvas a encenderla.',
        ],
      );
      if (!ok) return;
      return enviar({ enabled: false });
    }
    const ok = await showConfirmation(
      '¿Cobrar directamente en tu cuenta?',
      '',
      'Sí, activar',
      'Cancelar',
      [
        'El dinero de tus ventas entrará a tu cuenta de la pasarela, no a la de FILO.',
        comisionDeFilo
          ? `FILO dejará de cobrar su comisión (${comisionDeFilo}%) sobre esas ventas.`
          : 'FILO dejará de cobrar su comisión sobre esas ventas.',
        'La comisión de tus revendedores la seguirás debiendo tú, y tendrás que pagársela aparte.',
      ],
    );
    if (!ok) return;
    // Van también las credenciales que acaba de escribir. Sin esto, activar
    // justo después de teclearlas fallaba diciendo que faltaban, con el campo
    // lleno delante.
    return enviar({ ...cambiosPendientes(), enabled: true });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-[#334C5D]">Cobrar en tu propia cuenta</h2>
          <p className="mt-1 text-sm text-gray-500">
            Conecta tu pasarela y el dinero de tus ventas entra directo a tu cuenta, sin pasar
            por FILO. Sobre esas ventas FILO no cobra comisión.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${activa ? 'text-green-700' : 'text-gray-500'}`}>
            {activa ? 'Cobrando en tu cuenta' : 'Cobrando por FILO'}
          </span>
          <ToggleSwitch checked={activa} label="" onChange={() => void alternar()} disabled={guardando} />
        </div>
      </div>

      {activa && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Si vendes por revendedores, su comisión la sigues debiendo tú: ese dinero ya entró a tu
          cuenta y FILO no puede descontarlo. Lo verás en tus ingresos como pendiente de pagar.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dos tarjetas y no un desplegable: un <select> no puede llevar el
            logo, y aquí reconocer la marca de un vistazo vale más que ahorrar
            espacio — es la pasarela con la que uno ya tiene cuenta. */}
        <div className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300">
            Pasarela
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['WOMPI', 'MERCADO_PAGO'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProveedor(p)}
                aria-pressed={proveedor === p}
                className={`flex h-20 items-center justify-center rounded-xl border-2 bg-white transition-colors ${
                  proveedor === p
                    ? 'border-marca shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LogoDePasarela pasarela={p} alto={14} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="pas-entorno">Entorno</Label>
          <Select
            id="pas-entorno"
            value={entorno}
            onChange={(e) => setEntorno(e.target.value as 'SANDBOX' | 'PRODUCTION')}
          >
            <option value="SANDBOX">Pruebas</option>
            <option value="PRODUCTION">Producción</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            {esMercadoPago ? (
              <>
                Las credenciales de prueba de Mercado Pago empiezan por <code>TEST-</code>; si no
                coinciden con el entorno, los pagos no entran y cuesta darse cuenta.
              </>
            ) : (
              <>
                Las llaves de Wompi llevan el entorno dentro (<code>_test_</code> o{' '}
                <code>_prod_</code>); si no coinciden, los pagos no entran y cuesta darse cuenta.
              </>
            )}
          </p>
        </div>

        {/* Cada pasarela pide cosas distintas. Mercado Pago cobra creando una
            preferencia desde el servidor y le basta su access token; Wompi
            firma en el navegador y necesita llave pública y secreto de
            integridad. Enseñar los cuatro campos siempre haría que la mitad
            pareciera obligatoria sin serlo. */}
        {esMercadoPago ? (
          <>
            <div className="md:col-span-2">
              <Label htmlFor="pas-privada">
                Access token {estado?.privateKeyConfigured && '· guardado'}
              </Label>
              <TextInput
                id="pas-privada"
                type="password"
                autoComplete="off"
                value={secretos.privateKey}
                placeholder={
                  estado?.privateKeyConfigured
                    ? 'Déjalo en blanco para no cambiarlo'
                    : entorno === 'SANDBOX' ? 'TEST-...' : 'APP_USR-...'
                }
                onChange={(e) => setSecretos((s) => ({ ...s, privateKey: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Está en tu panel de Mercado Pago, en Tus integraciones → Credenciales.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="pas-eventos">
                Clave secreta de notificaciones {estado?.eventsSecretConfigured && '· guardada'}
              </Label>
              <TextInput
                id="pas-eventos"
                type="password"
                autoComplete="off"
                value={secretos.eventsSecret}
                placeholder={estado?.eventsSecretConfigured ? 'Déjala en blanco para no cambiarla' : 'Opcional'}
                onChange={(e) => setSecretos((s) => ({ ...s, eventsSecret: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Opcional: cobras igual sin ella. Sirve para comprobar que las notificaciones
                vienen de verdad de Mercado Pago.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Label htmlFor="pas-publica">Llave pública</Label>
              <TextInput
                id="pas-publica"
                value={secretos.publicKey}
                placeholder="pub_test_..."
                onChange={(e) => setSecretos((s) => ({ ...s, publicKey: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="pas-integridad">
                Secreto de integridad {estado?.integritySecretConfigured && '· guardado'}
              </Label>
              <TextInput
                id="pas-integridad"
                type="password"
                autoComplete="off"
                value={secretos.integritySecret}
                placeholder={estado?.integritySecretConfigured ? 'Déjalo en blanco para no cambiarlo' : ''}
                onChange={(e) => setSecretos((s) => ({ ...s, integritySecret: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="pas-eventos">
                Secreto de eventos {estado?.eventsSecretConfigured && '· guardado'}
              </Label>
              <TextInput
                id="pas-eventos"
                type="password"
                autoComplete="off"
                value={secretos.eventsSecret}
                placeholder={estado?.eventsSecretConfigured ? 'Déjalo en blanco para no cambiarlo' : ''}
                onChange={(e) => setSecretos((s) => ({ ...s, eventsSecret: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Sin él no sabremos cuándo te pagan: la reserva se quedaría sin confirmar aunque el
                cliente haya pagado.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="pas-privada">
                Llave privada {estado?.privateKeyConfigured && '· guardada'}
              </Label>
              <TextInput
                id="pas-privada"
                type="password"
                autoComplete="off"
                value={secretos.privateKey}
                placeholder={estado?.privateKeyConfigured ? 'Déjalo en blanco para no cambiarla' : 'Opcional'}
                onChange={(e) => setSecretos((s) => ({ ...s, privateKey: e.target.value }))}
              />
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {esMercadoPago ? (
          <>
            No tienes que configurar ninguna URL: se la indicamos a Mercado Pago en cada cobro.{' '}
          </>
        ) : (
          <>
            En el panel de Wompi, apunta los eventos a{' '}
            <code className="rounded bg-gray-100 px-1">
              {process.env.NEXT_PUBLIC_API_URL ?? ''}/payments/wompi/webhook
            </code>
            .{' '}
          </>
        )}
        Tus credenciales se guardan cifradas y no se vuelven a mostrar, ni siquiera a ti.
      </p>

      <div className="mt-4">
        <Button color="primary" onClick={() => void guardarLlaves()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar llaves'}
        </Button>
      </div>
    </section>
  );
}
