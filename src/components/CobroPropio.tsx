"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Label, TextInput, ToggleSwitch } from 'flowbite-react';
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

/** Los dos entornos, siempre los dos a la vista. */
const ENTORNOS: Array<{ valor: 'SANDBOX' | 'PRODUCTION'; etiqueta: string }> = [
  { valor: 'SANDBOX', etiqueta: 'Pruebas' },
  { valor: 'PRODUCTION', etiqueta: 'Producción' },
];

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
  const { showError, showSuccess, showWarning, showConfirmation } = useSweetAlert();
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
  // Activa no es lo mismo que cobrando: con las llaves a medias el dinero
  // sigue entrando por FILO, y decir "hoy cobras tú" ahí sería mentir.
  const cobrando = estado?.listaParaCobrar === true;
  const faltan = estado?.faltan ?? [];
  const esMercadoPago = proveedor === 'MERCADO_PAGO';

  const enviar = async (cambios: Parameters<typeof guardarPasarela>[1]) => {
    setGuardando(true);
    try {
      const r = await guardarPasarela(companyId, cambios);
      setEstado(r);
      setSecretos({ ...VACIOS, publicKey: r.publicKey ?? '' });
      if (r.reservasSinCobrar) {
        // Un aviso, no un error: el cambio SÍ se guardó. Con una cruz roja
        // delante, cualquiera entiende que no le dejó apagarlo.
        const varias = r.reservasSinCobrar > 1;
        showWarning(
          'Listo, pero mira esto',
          `Ya cobra Tenemos Filo. Te ${varias ? 'quedan' : 'queda'} ${r.reservasSinCobrar} reserva${
            varias ? 's' : ''
          } sin cobrar que iba${varias ? 'n' : ''} a tu cuenta: mientras tu pasarela esté apagada no hay forma de cobrar${
            varias ? 'las' : 'la'
          }. Vuelve a encenderla o cóbra${varias ? 'las' : 'la'} por fuera.`,
        );
      } else if (r.enabled && r.faltan.length > 0) {
        // Guardado sí, pero todavía no cobra. Es un aviso, no un error: el
        // estado quedó puesto y lo único que falta son las llaves.
        showWarning(
          'Guardado, pero aún no cobras tú',
          `${r.faltan.join(' ')} Mientras tanto siguen cobrándose por Tenemos Filo, con su comisión.`,
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
        {/* El interruptor dice lo que HACE y la etiqueta de al lado quién cobra
            hoy. Antes el texto era solo el estado —"Cobrando por FILO"— y
            pegado a un interruptor se leía como lo que ibas a activar: la
            gente lo encendía esperando volver a FILO y conseguía lo contrario. */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              cobrando
                ? 'bg-green-100 text-green-800'
                : activa
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cobrando ? 'Hoy cobras tú' : activa ? 'Falta completarla' : 'Hoy cobra Tenemos Filo'}
          </span>
          <ToggleSwitch
            checked={activa}
            label="Cobrar en mi cuenta"
            onChange={() => void alternar()}
            disabled={guardando}
          />
        </div>
      </div>

      {/* Con el cobro apagado no hay nada que configurar: enseñar las llaves de
          una pasarela que no se va a usar solo invita a rellenarlas y
          preguntarse por qué no pasa nada. */}
      {!activa ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Hoy cobra Tenemos Filo y te dispersa lo tuyo. Enciende el cobro en tu cuenta para elegir
          tu pasarela y pegar tus llaves.
        </p>
      ) : (
      <>
      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Si vendes por revendedores, su comisión la sigues debiendo tú: ese dinero ya entró a tu
        cuenta y FILO no puede descontarlo. Lo verás en tus ingresos como pendiente de pagar.
      </p>

      {/* Lo que falta, siempre a la vista mientras falte: el aviso del guardado
          se cierra y después nadie recuerda por qué no cobra. */}
      {faltan.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900">
          <strong>Todavía no cobras tú.</strong> {faltan.join(' ')} Mientras tanto tus ventas
          siguen cobrándose por Tenemos Filo, con su comisión.
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

        {/* Dos opciones a la vista y no un desplegable: elegir el entorno
            equivocado es el error que mas cuesta diagnosticar —los pagos
            simplemente no entran— y escondiendo una de las dos nadie se para a
            pensar cual esta puesta. */}
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300">
            Entorno
          </span>
          <div className="flex gap-2">
            {ENTORNOS.map((e) => (
              <label
                key={e.valor}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  entorno === e.valor
                    ? 'border-marca bg-marca-tenue font-medium text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="pas-entorno"
                  value={e.valor}
                  checked={entorno === e.valor}
                  onChange={() => setEntorno(e.valor)}
                />
                {e.etiqueta}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
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
      </>
      )}
    </section>
  );
}
