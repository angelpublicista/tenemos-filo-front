"use client";

import React, { useEffect, useState } from 'react';
import { Button, Card } from 'flowbite-react';
import { HiLockClosed } from 'react-icons/hi';
import CompanySetupGuard from '@/components/CompanySetupGuard';
import FiloLogo from '@/components/FiloLogo';
import SalirDeLaSesion from '@/components/SalirDeLaSesion';
import Loader from '@/components/Loader';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  crearCheckoutDeSuscripcion,
  getSuscripcion,
  irAPagar,
  type EstadoDeSuscripcion,
} from '@/lib/api/subscription';
import { mensajeDeError } from '@/lib/api/client';
import { pesos } from '@/lib/dinero';

/**
 * Último paso del registro de un anfitrión: pagar la suscripción.
 *
 * Se llega aquí al crear la empresa, solo si la plataforma exige suscripción y
 * la empresa no la tiene. Wompi devuelve a /dashboard/suscripcion, que ya sabe
 * esperar la confirmación del pago, así que aquí no se repite esa lógica.
 */
export default function PagoDeSuscripcionInicialPage() {
  const { showError } = useSweetAlert();
  const [estado, setEstado] = useState<EstadoDeSuscripcion | null>(null);
  const [pagando, setPagando] = useState(false);

  useEffect(() => {
    getSuscripcion()
      .then((s) => {
        // Nada que pagar (no se exige, está exenta o ya está al día): se sigue.
        if (!s.bloqueada) window.location.replace('/dashboard');
        else setEstado(s);
      })
      // Si no se puede saber, no se deja a nadie atascado aquí: el panel
      // mismo lo devolverá a pagar si hace falta.
      .catch(() => window.location.replace('/dashboard'));
  }, []);

  const pagar = async () => {
    setPagando(true);
    try {
      irAPagar(await crearCheckoutDeSuscripcion());
    } catch (e) {
      showError('No se pudo abrir el pago', mensajeDeError(e));
      setPagando(false);
    }
  };

  return (
    <CompanySetupGuard>
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <FiloLogo className="mx-auto mb-4 w-32" />
          <h1 className="mb-2 text-center text-2xl font-bold text-[#334C5D]">
            Último paso: activa tu suscripción
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            Tu empresa ya está registrada. Para empezar a vender, activa tu plan: un solo plan, pago
            mensual y sin permanencia.
          </p>

          {!estado ? (
            <Loader message="Cargando..." />
          ) : (
            <Card>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Plan Tenemos Filo</h2>
                <p className="text-sm text-gray-600">Todo lo de la plataforma, por 30 días.</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Plan mensual</span>
                  <span className="text-gray-900">{pesos(estado.precio)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">IVA ({estado.ivaPorcentaje}%)</span>
                  <span className="text-gray-900">{pesos(estado.iva)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t pt-2 font-semibold">
                  <span className="text-gray-900">Total a pagar</span>
                  <span className="text-[#F26726]">{pesos(estado.total)}</span>
                </div>
              </div>

              <Button color="primary" onClick={pagar} disabled={pagando} className="w-full">
                <HiLockClosed className="mr-2 h-4 w-4" />
                {pagando ? 'Abriendo pasarela...' : `Pagar ${pesos(estado.total)} y activar`}
              </Button>
              <p className="text-xs text-gray-500">
                Pago seguro por Wompi. No guardamos tu tarjeta ni cobramos de forma automática: cada
                mes decides si renuevas.
              </p>
            </Card>
          )}
          <div className="mt-6 text-center">
            <SalirDeLaSesion />
          </div>
        </div>
      </div>
    </CompanySetupGuard>
  );
}
