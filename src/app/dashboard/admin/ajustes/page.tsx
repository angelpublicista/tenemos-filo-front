"use client";

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Select, TextInput, ToggleSwitch } from 'flowbite-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminHeader } from '@/components/Admin/AdminTable';
import CommissionInput from '@/components/Admin/CommissionInput';
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

export default function AdminAjustesPage() {
  const { showSuccess, showError } = useSweetAlert();

  const [ajustes, setAjustes] = useState<PlatformSettings | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoWompi, setGuardandoWompi] = useState(false);
  // Los secretos se escriben, nunca se leen: el API no los devuelve.
  const [secretos, setSecretos] = useState({ privateKey: '', integrity: '', events: '' });

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

  const guardarWompi = async () => {
    if (!ajustes) return;
    setGuardandoWompi(true);
    try {
      // Los secretos solo se envian si el admin escribio algo: dejarlos en
      // blanco significa "no los toques", no "borralos".
      const actualizados = await updateSettings({
        wompiEnabled: ajustes.wompiEnabled,
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

  const filo = importe(ajustes.filoCommissionType, ajustes.filoCommissionValue, EJEMPLO);
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
            sobrescribirlas una por una desde Experiencias.
          </p>

          <div className="space-y-4">
            <CommissionInput
              etiqueta="Comisión de Tenemos Filo"
              ayuda="Se cobra en todas las reservas."
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
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Total que paga el cliente</span>
              <span className="font-medium text-gray-900">{pesos(EJEMPLO)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Comisión Tenemos Filo</span>
              <span className="text-gray-900">−{pesos(filo)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">
                Comisión revendedor
                <span className="block text-xs text-gray-400">solo por esa vía</span>
              </span>
              <span className="text-gray-900">−{pesos(reseller)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-medium text-gray-900">Recibe el anfitrión</span>
              <span className="font-semibold text-[#F26726]">
                {pesos(Math.max(EJEMPLO - filo - reseller, 0))}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              En una venta directa del anfitrión no se cobra la de revendedor, así que
              recibiría {pesos(Math.max(EJEMPLO - filo, 0))}.
            </p>
          </div>
        </Card>
      </div>

      <div className="max-w-4xl mt-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pasarela de pagos (Wompi)</h2>
              <p className="text-sm text-gray-600">
                Las experiencias se cobran a través de Wompi y el dinero entra a Tenemos Filo;
                después se reparte desde Dispersiones.
              </p>
            </div>
            <Badge color={ajustes.wompiEnabled ? 'success' : 'gray'} className="shrink-0">
              {ajustes.wompiEnabled ? 'Activa' : 'Inactiva'}
            </Badge>
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
                <p className="text-sm font-semibold text-[#334C5D] mb-2">Cobrar con Wompi</p>
                {/* Mismo tema que los switches de Configuración: por defecto
                    flowbite los pinta azules y aquí todo es naranja de marca. */}
                <ToggleSwitch
                  checked={ajustes.wompiEnabled}
                  label={ajustes.wompiEnabled ? 'Activado' : 'Desactivado'}
                  onChange={(valor) => setAjustes({ ...ajustes, wompiEnabled: valor })}
                  theme={{
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
                  }}
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
