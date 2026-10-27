"use client";

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Select, TextInput, ToggleSwitch } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminHeader } from '@/components/Admin/AdminTable';
import CommissionInput from '@/components/Admin/CommissionInput';
import PrecioInput from '@/components/PrecioInput';
import LogoDePasarela from '@/components/LogoDePasarela';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  getSettings,
  updateSettings,
  type CommissionType,
  type PlatformSettings,
  type WompiEnvironment,
} from '@/lib/api/admin';

// El webhook apunta al API, no al front: Wompi llama al servidor.
const urlWebhook = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/payments/wompi/webhook`;

const EJEMPLO = 200000;

function importe(tipo: CommissionType, valor: number, base: number): number {
  return tipo === 'PERCENT' ? Math.round((base * Math.min(valor, 100)) / 100) : Math.min(valor, base);
}

const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Tema del interruptor.
 *
 * Flowbite los pinta azules por defecto y aqui todo es naranja de marca.
 * Vive fuera del componente para que los dos interruptores de esta pantalla
 * no se separen visualmente con el tiempo.
 */
const TEMA_SWITCH = {
  root: {
    base: 'group flex items-center',
    active: { on: 'cursor-pointer', off: 'cursor-pointer' },
    label: 'ms-3 text-sm font-medium text-[#334C5D]',
  },
  toggle: {
    base: 'relative h-6 w-11 rounded-full after:absolute after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all group-focus:ring-2',
    checked: {
      on: 'bg-[#F26726] after:translate-x-full after:border-transparent rtl:after:-translate-x-full group-focus:ring-[#F26726]/40',
      off: 'bg-gray-200 after:border-gray-300 dark:bg-gray-700',
    },
  },
};


export default function AdminAjustesPage() {
  const { showSuccess, showError } = useSweetAlert();

  const [ajustes, setAjustes] = useState<PlatformSettings | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoWompi, setGuardandoWompi] = useState(false);
  const [guardandoSuscripcion, setGuardandoSuscripcion] = useState(false);
  const [guardandoMp, setGuardandoMp] = useState(false);
  // Los secretos se escriben, nunca se leen: el API no los devuelve.
  const [secretos, setSecretos] = useState({ privateKey: '', integrity: '', events: '' });
  const [secretosMp, setSecretosMp] = useState({ accessToken: '', webhook: '' });

  useEffect(() => {
    getSettings()
      .then(setAjustes)
      .catch((err) =>
        showError('No se pudieron cargar los ajustes', err instanceof Error ? err.message : undefined),
      )
      .finally(() => setCargando(false));
  }, [showError]);

  const guardar = async () => {
    if (!ajustes) return;
    setGuardando(true);
    try {
      const actualizados = await updateSettings({
        filoCommissionType: ajustes.filoCommissionType,
        filoCommissionValue: ajustes.filoCommissionValue,
        filoCommissionOwnGatewayType: ajustes.filoCommissionOwnGatewayType,
        filoCommissionOwnGatewayValue: ajustes.filoCommissionOwnGatewayValue,
        resellerCommissionType: ajustes.resellerCommissionType,
        resellerCommissionValue: ajustes.resellerCommissionValue,
      });
      setAjustes(actualizados);
      showSuccess('Ajustes guardados', 'Aplican a las reservas nuevas.');
    } catch (err) {
      showError('No se pudieron guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardando(false);
    }
  };

  const guardarSuscripcion = async () => {
    if (!ajustes) return;
    setGuardandoSuscripcion(true);
    try {
      const actualizados = await updateSettings({
        subscriptionRequired: ajustes.subscriptionRequired,
        subscriptionPrice: ajustes.subscriptionPrice,
        subscriptionVat: ajustes.subscriptionVat,
        subscriptionProvider: ajustes.subscriptionProvider,
      });
      setAjustes(actualizados);
      showSuccess(
        'Suscripción actualizada',
        actualizados.subscriptionRequired
          ? 'Los anfitriones sin suscripción vigente quedan bloqueados.'
          : 'Nadie queda bloqueado mientras esté apagada.',
      );
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardandoSuscripcion(false);
    }
  };

  const guardarWompi = async () => {
    if (!ajustes) return;
    setGuardandoWompi(true);
    try {
      // Los secretos solo se envian si el admin escribio algo: dejarlos en
      // blanco significa "no los toques", no "borralos".
      const actualizados = await updateSettings({
        wompiEnabled: ajustes.wompiEnabled,
        reservationsProvider: ajustes.reservationsProvider,
        requirePaymentDefault: ajustes.requirePaymentDefault,
        wompiEnvironment: ajustes.wompiEnvironment,
        wompiPublicKey: ajustes.wompiPublicKey ?? '',
        ...(secretos.privateKey ? { wompiPrivateKey: secretos.privateKey } : {}),
        ...(secretos.integrity ? { wompiIntegritySecret: secretos.integrity } : {}),
        ...(secretos.events ? { wompiEventsSecret: secretos.events } : {}),
      });
      setAjustes(actualizados);
      setSecretos({ privateKey: '', integrity: '', events: '' });
      showSuccess('Pasarela actualizada');
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardandoWompi(false);
    }
  };

  const guardarMp = async () => {
    if (!ajustes) return;
    setGuardandoMp(true);
    try {
      // Igual que con Wompi: un secreto en blanco significa "no lo toques".
      const actualizados = await updateSettings({
        mercadopagoEnabled: ajustes.mercadopagoEnabled,
        mercadopagoEnvironment: ajustes.mercadopagoEnvironment,
        ...(secretosMp.accessToken ? { mercadopagoAccessToken: secretosMp.accessToken } : {}),
        ...(secretosMp.webhook ? { mercadopagoWebhookSecret: secretosMp.webhook } : {}),
      });
      setAjustes(actualizados);
      setSecretosMp({ accessToken: '', webhook: '' });
      showSuccess('Mercado Pago actualizado');
    } catch (err) {
      showError('No se pudo guardar', err instanceof Error ? err.message : undefined);
    } finally {
      setGuardandoMp(false);
    }
  };

  if (cargando || !ajustes) {
    return (
      <ProtectedRoute roles={['admin']}>
        <AdminHeader titulo="Ajustes" descripcion="Configuración general de la plataforma" />
        <Card>
          <p className="text-gray-500">Cargando...</p>
        </Card>
      </ProtectedRoute>
    );
  }

  // Si FILO puede cobrar reservas en línea: depende de cuál pasarela esté elegida.
  const cobroDeReservasActivo =
    ajustes.reservationsProvider === 'MERCADO_PAGO' ? ajustes.mercadopagoEnabled : ajustes.wompiEnabled;

  const filo = importe(ajustes.filoCommissionType, ajustes.filoCommissionValue, EJEMPLO);
  const filoPropia = importe(
    ajustes.filoCommissionOwnGatewayType,
    ajustes.filoCommissionOwnGatewayValue,
    EJEMPLO,
  );
  const reseller = importe(
    ajustes.resellerCommissionType,
    ajustes.resellerCommissionValue,
    EJEMPLO,
  );

  return (
    <ProtectedRoute roles={['admin']}>
      <AdminHeader titulo="Ajustes" descripcion="Configuración general de la plataforma" />

      <div className="grid gap-4 lg:grid-cols-2 max-w-4xl">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Comisiones por defecto</h2>
          <p className="text-sm text-gray-600 -mt-2">
            Se aplican a toda experiencia que no tenga una comisión propia. Puedes
            sobrescribir la de cuando cobra FILO una por una desde Experiencias; la de cuando
            cobra el anfitrión es la misma para todas.
          </p>

          <div className="space-y-4">
            <CommissionInput
              etiqueta="Comisión de Tenemos Filo · cobra FILO"
              ayuda="Cuando el cliente paga con la pasarela de FILO. Se descuenta del pago antes de dispersar al anfitrión."
              tipo={ajustes.filoCommissionType}
              valor={ajustes.filoCommissionValue}
              onChange={(tipo, valor) =>
                setAjustes({
                  ...ajustes,
                  filoCommissionType: tipo ?? 'PERCENT',
                  filoCommissionValue: valor ?? 0,
                })
              }
            />

            <CommissionInput
              etiqueta="Comisión de Tenemos Filo · cobra el anfitrión"
              ayuda="Cuando el anfitrión usa su propia pasarela. El dinero entra a su cuenta, así que esta comisión se le resta de lo que gana y se la debe a FILO. En 0 no se cobra."
              tipo={ajustes.filoCommissionOwnGatewayType}
              valor={ajustes.filoCommissionOwnGatewayValue}
              onChange={(tipo, valor) =>
                setAjustes({
                  ...ajustes,
                  filoCommissionOwnGatewayType: tipo ?? 'PERCENT',
                  filoCommissionOwnGatewayValue: valor ?? 0,
                })
              }
            />

            <CommissionInput
              etiqueta="Comisión de revendedor"
              ayuda="Solo se cobra si la reserva entra por un revendedor o el catálogo público."
              tipo={ajustes.resellerCommissionType}
              valor={ajustes.resellerCommissionValue}
              onChange={(tipo, valor) =>
                setAjustes({
                  ...ajustes,
                  resellerCommissionType: tipo ?? 'PERCENT',
                  resellerCommissionValue: valor ?? 0,
                })
              }
            />
          </div>

          <Button color="primary" onClick={guardar} disabled={guardando} className="w-fit">
            {guardando ? 'Guardando...' : 'Guardar ajustes'}
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Cómo queda una reserva</h2>
          <p className="text-sm text-gray-600 -mt-2">
            Ejemplo sobre una reserva de {pesos(EJEMPLO)}.
          </p>

          <div className="text-sm">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2 border-b text-xs font-medium text-gray-500">
              <span />
              <span className="text-right">Cobra FILO</span>
              <span className="text-right">Cobra el anfitrión</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2 border-b">
              <span className="text-gray-600">Total que paga el cliente</span>
              <span className="text-right font-medium text-gray-900">{pesos(EJEMPLO)}</span>
              <span className="text-right font-medium text-gray-900">{pesos(EJEMPLO)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2 border-b">
              <span className="text-gray-600">Comisión Tenemos Filo</span>
              <span className="text-right text-gray-900">−{pesos(filo)}</span>
              <span className="text-right text-gray-900">−{pesos(filoPropia)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-2 border-b">
              <span className="text-gray-600">
                Comisión revendedor
                <span className="block text-xs text-gray-400">solo por esa vía</span>
              </span>
              <span className="text-right text-gray-900">−{pesos(reseller)}</span>
              <span className="text-right text-gray-900">−{pesos(reseller)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-3">
              <span className="font-medium text-gray-900">Recibe el anfitrión</span>
              <span className="text-right font-semibold text-[#F26726]">
                {pesos(Math.max(EJEMPLO - filo - reseller, 0))}
              </span>
              <span className="text-right font-semibold text-[#F26726]">
                {pesos(Math.max(EJEMPLO - filoPropia - reseller, 0))}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              En una venta directa del anfitrión no se cobra la de revendedor, así que
              recibiría {pesos(Math.max(EJEMPLO - filo, 0))} si cobra FILO y{' '}
              {pesos(Math.max(EJEMPLO - filoPropia, 0))} si cobra él.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Cuando cobra el anfitrión, el dinero ya está en su cuenta: lo que se le descuenta
              queda registrado en la reserva y se suma por mes en Comisiones por cobrar, donde
              marcas cuándo lo paga.
            </p>
          </div>
        </Card>
      </div>

      <div className="max-w-4xl mt-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Suscripción de anfitriones</h2>
              <p className="text-sm text-gray-600">
                Un solo plan, sin permanencia. Cada pago suma 30 días; sin pago vigente el panel del
                anfitrión queda cerrado. Se cobra por la pasarela que elijas abajo.
              </p>
            </div>
            <Badge color={ajustes.subscriptionRequired ? 'success' : 'gray'} className="shrink-0">
              {ajustes.subscriptionRequired ? 'Activa' : 'Apagada'}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio (sin IVA)</label>
              <PrecioInput
                value={ajustes.subscriptionPrice}
                onChange={(v) => setAjustes({ ...ajustes, subscriptionPrice: v ?? 0 })}
                placeholder="79.000"
                aria-label="Precio de la suscripción sin IVA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={String(ajustes.subscriptionVat)}
                onChange={(e) =>
                  setAjustes({ ...ajustes, subscriptionVat: e.target.value === '' ? 0 : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Cada anfitrión paga</span>
              <p className="text-lg font-semibold text-[#F26726]">
                {pesos(
                  ajustes.subscriptionPrice +
                    Math.round((ajustes.subscriptionPrice * ajustes.subscriptionVat) / 100),
                )}
              </p>
              <p className="text-xs text-gray-500">IVA incluido, cada 30 días</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-sm font-semibold text-[#334C5D] mb-2">Pasarela de la suscripción</p>
            <Select
              value={ajustes.subscriptionProvider}
              onChange={(e) =>
                setAjustes({
                  ...ajustes,
                  subscriptionProvider: e.target.value as PlatformSettings['subscriptionProvider'],
                })
              }
              aria-label="Pasarela con la que se cobra la suscripción"
            >
              <option value="WOMPI">Wompi: el anfitrión paga cada mes a mano</option>
              <option value="MERCADO_PAGO" disabled={!ajustes.mercadopagoEnabled}>
                Mercado Pago: cobro automático cada 30 días
                {ajustes.mercadopagoEnabled ? '' : ' (configúralo abajo)'}
              </option>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Una sola a la vez. Cambiarla no toca a quien ya autorizó el cobro automático: Mercado
              Pago le seguirá cobrando con su monto de entonces hasta que cancele.
            </p>
          </div>

          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-sm font-semibold text-[#334C5D] mb-2">Exigir la suscripción</p>
            <ToggleSwitch
              checked={ajustes.subscriptionRequired}
              label={ajustes.subscriptionRequired ? 'Activa' : 'Apagada'}
              onChange={(valor) => setAjustes({ ...ajustes, subscriptionRequired: valor })}
              theme={TEMA_SWITCH}
            />
            <p className="text-xs text-gray-500 mt-2">
              Apagada, nadie queda bloqueado. Antes de encenderla, registra el pago (o la exención)
              de quienes ya operan en Suscripciones: al activarla, el panel de cualquier anfitrión
              sin pago vigente se cierra al momento.
            </p>
          </div>

          <Button color="primary" onClick={guardarSuscripcion} disabled={guardandoSuscripcion} className="w-fit">
            {guardandoSuscripcion ? 'Guardando...' : 'Guardar suscripción'}
          </Button>
        </Card>
      </div>

      <div className="max-w-4xl mt-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Pasarela de pagos</h2>
                <LogoDePasarela pasarela="WOMPI" alto={12} />
              </div>
              <p className="text-sm text-gray-600">
                Las experiencias se cobran con la pasarela que elijas aquí y el dinero entra a
                Tenemos Filo; después se reparte desde Dispersiones. Los anfitriones que conectaron
                la suya propia cobran con ella.
              </p>
            </div>
            <Badge color={cobroDeReservasActivo ? 'success' : 'gray'} className="shrink-0">
              {cobroDeReservasActivo ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>

          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-sm font-semibold text-[#334C5D] mb-2">Pasarela de las reservas</p>
            <Select
              value={ajustes.reservationsProvider}
              onChange={(e) =>
                setAjustes({
                  ...ajustes,
                  reservationsProvider: e.target.value as PlatformSettings['reservationsProvider'],
                })
              }
              aria-label="Pasarela con la que se cobran las reservas"
            >
              <option value="WOMPI">Wompi</option>
              <option value="MERCADO_PAGO" disabled={!ajustes.mercadopagoEnabled}>
                Mercado Pago
                {ajustes.mercadopagoEnabled ? '' : ' (configúralo en su tarjeta, abajo)'}
              </option>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Una sola a la vez. Las reservas ya creadas se cobran con la que esté elegida cuando el
              cliente paga. {ajustes.reservationsProvider === 'MERCADO_PAGO'
                ? 'Las llaves de Wompi de abajo dejan de usarse para cobrar, pero se conservan.'
                : ''}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entorno</label>
              <Select
                value={ajustes.wompiEnvironment}
                onChange={(e) =>
                  setAjustes({ ...ajustes, wompiEnvironment: e.target.value as WompiEnvironment })
                }
              >
                <option value="SANDBOX">Pruebas (sandbox)</option>
                <option value="PRODUCTION">Producción</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Debe coincidir con el prefijo de las llaves (<code>_test_</code> o{' '}
                <code>_prod_</code>).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Llave pública</label>
              <TextInput
                value={ajustes.wompiPublicKey ?? ''}
                onChange={(e) => setAjustes({ ...ajustes, wompiPublicKey: e.target.value })}
                placeholder="pub_test_..."
              />
            </div>

            <SecretInput
              etiqueta="Secreto de integridad"
              ayuda="Firma los datos del checkout. Imprescindible para cobrar."
              configurado={ajustes.wompiIntegritySecretConfigured}
              valor={secretos.integrity}
              onChange={(v) => setSecretos({ ...secretos, integrity: v })}
            />

            <SecretInput
              etiqueta="Secreto de eventos"
              ayuda="Valida los webhooks. Sin él no se confirman los pagos."
              configurado={ajustes.wompiEventsSecretConfigured}
              valor={secretos.events}
              onChange={(v) => setSecretos({ ...secretos, events: v })}
            />

            <SecretInput
              etiqueta="Llave privada"
              ayuda="Para consultar transacciones desde el servidor."
              configurado={ajustes.wompiPrivateKeyConfigured}
              valor={secretos.privateKey}
              onChange={(v) => setSecretos({ ...secretos, privateKey: v })}
            />

            <div className="flex items-end">
              <div className="w-full rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-semibold text-[#334C5D] mb-2">Exigir pago al reservar</p>
                <ToggleSwitch
                  checked={ajustes.requirePaymentDefault}
                  disabled={!cobroDeReservasActivo}
                  label={ajustes.requirePaymentDefault ? 'Obligatorio' : 'Opcional'}
                  onChange={(valor) => setAjustes({ ...ajustes, requirePaymentDefault: valor })}
                  theme={TEMA_SWITCH}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {cobroDeReservasActivo
                    ? 'Valor por defecto. Cada anfitrión puede cambiarlo en su configuración. Una reserva sin pagar no ocupa cupo.'
                    : 'Necesita la pasarela activa: sin forma de cobrar, exigir el pago dejaría el catálogo sin reservas posibles.'}
                </p>
              </div>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-semibold text-[#334C5D] mb-2">Cobrar con Wompi</p>
                {/* Mismo tema que los switches de Configuración: por defecto
                    flowbite los pinta azules y aquí todo es naranja de marca. */}
                <ToggleSwitch
                  checked={ajustes.wompiEnabled}
                  label={ajustes.wompiEnabled ? 'Activado' : 'Desactivado'}
                  onChange={(valor) => setAjustes({ ...ajustes, wompiEnabled: valor })}
                  theme={TEMA_SWITCH}
                />
              </div>
            </div>
          </div>

          <div className="rounded bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Webhook a configurar en Wompi</p>
            <code className="break-all">{urlWebhook}</code>
            <p className="mt-2">
              Los secretos no se muestran nunca: solo se indica si están configurados. Déjalos en
              blanco para conservar el actual.
            </p>
          </div>

          <Button color="primary" onClick={guardarWompi} disabled={guardandoWompi} className="w-fit">
            {guardandoWompi ? 'Guardando...' : 'Guardar pasarela'}
          </Button>
        </Card>
      </div>

      <div className="max-w-4xl mt-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Mercado Pago</h2>
                <LogoDePasarela pasarela="MERCADO_PAGO" alto={12} />
              </div>
              <p className="text-sm text-gray-600">
                Puede cobrar la suscripción de los anfitriones (de forma automática cada 30 días) y
                las reservas. Elige para qué se usa en las secciones de suscripción y de pasarela de
                pagos.
              </p>
            </div>
            <Badge color={ajustes.mercadopagoEnabled ? 'success' : 'gray'} className="shrink-0">
              {ajustes.mercadopagoEnabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entorno</label>
              <Select
                value={ajustes.mercadopagoEnvironment}
                onChange={(e) =>
                  setAjustes({ ...ajustes, mercadopagoEnvironment: e.target.value as WompiEnvironment })
                }
              >
                <option value="SANDBOX">Pruebas</option>
                <option value="PRODUCTION">Producción</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Las credenciales de prueba empiezan por <code>TEST-</code>; las de producción, por{' '}
                <code>APP_USR-</code>.
              </p>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-semibold text-[#334C5D] mb-2">Cobrar con Mercado Pago</p>
                <ToggleSwitch
                  checked={ajustes.mercadopagoEnabled}
                  label={ajustes.mercadopagoEnabled ? 'Activado' : 'Desactivado'}
                  onChange={(valor) => setAjustes({ ...ajustes, mercadopagoEnabled: valor })}
                  theme={TEMA_SWITCH}
                />
              </div>
            </div>

            <SecretInput
              etiqueta="Access token"
              ayuda="Credencial privada de tu aplicación. Imprescindible para cobrar."
              configurado={ajustes.mercadopagoAccessTokenConfigured}
              valor={secretosMp.accessToken}
              onChange={(v) => setSecretosMp({ ...secretosMp, accessToken: v })}
            />

            <SecretInput
              etiqueta="Clave secreta del webhook"
              ayuda="Opcional. Con ella se valida que los avisos vengan de Mercado Pago."
              configurado={ajustes.mercadopagoWebhookSecretConfigured}
              valor={secretosMp.webhook}
              onChange={(v) => setSecretosMp({ ...secretosMp, webhook: v })}
            />
          </div>

          <div className="rounded bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Webhook a configurar en Mercado Pago</p>
            <code className="break-all">{ajustes.mercadopagoWebhookUrl}</code>
            <p className="mt-2">
              En «Tus integraciones → Webhooks», suscríbelo a los eventos{' '}
              <code>payment</code>, <code>subscription_preapproval</code> y{' '}
              <code>subscription_authorized_payment</code>. Sin el último, los cobros mensuales
              pueden no sumar los 30 días.
            </p>
            <p className="mt-2">
              Para elegirlo como pasarela de la suscripción, actívalo aquí y guárdalo primero.
            </p>
          </div>

          <Button color="primary" onClick={guardarMp} disabled={guardandoMp} className="w-fit">
            {guardandoMp ? 'Guardando...' : 'Guardar Mercado Pago'}
          </Button>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

/** Campo de solo escritura para un secreto que el API nunca devuelve. */
function SecretInput({
  etiqueta,
  ayuda,
  configurado,
  valor,
  onChange,
}: {
  etiqueta: string;
  ayuda: string;
  configurado: boolean;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {etiqueta}
        {configurado && (
          <span className="ml-2 text-xs font-normal text-green-700">✓ configurado</span>
        )}
      </label>
      <TextInput
        type="password"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={configurado ? '•••••••• (sin cambios)' : 'Pegar aquí'}
      />
      <p className="text-xs text-gray-500 mt-1">{ayuda}</p>
    </div>
  );
}
