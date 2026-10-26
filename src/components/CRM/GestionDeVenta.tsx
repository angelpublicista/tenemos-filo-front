"use client";

import React, { useState } from 'react';
import { Button } from 'flowbite-react';
import Swal from 'sweetalert2';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import {
  MOTIVOS_DE_PERDIDA,
  autorizarCondicionDePago,
  cerrarGanada,
  confirmarVenta,
  crearPreReserva,
  crearReservaDeOportunidad,
  faltaParaConfirmar,
  generarEnlaceDeReserva,
  perderOportunidad,
  registrarPago,
  type ReservaDeOportunidad,
} from '@/lib/crm/venta';
import type { Experience } from '@/types';
import { formatearMientrasEscribe, pesos, soloElNumero } from '@/lib/dinero';

interface Props {
  opportunityId: string;
  experienceKind: 'ABIERTA' | 'PRIVADA' | null;
  status: string;
  reservations?: ReservaDeOportunidad[];
  condicionDePago?: string | null;
  /**
   * Si quien mira puede autorizar una condición distinta al abono. Lo decide
   * el API —solo el titular de la empresa—; aquí solo sirve para no ofrecer un
   * botón que iba a fallar.
   */
  puedeAutorizarCondicion?: boolean;
  /**
   * TR-15. Cuántas opciones distintas se le pusieron al cliente. Con más de
   * una en una privada, confirmar una reserva no cierra la oportunidad: puede
   * que el cliente siga decidiendo las demás.
   */
  opciones?: number;
  experiencias: Experience[];
  onCambio: () => void;
}


/**
 * El tramo final: apartar el espacio, cobrar y cerrar.
 *
 * Solo se ofrece lo que aplica en cada momento. Una experiencia abierta no
 * tiene pre-reserva —sus cupos se pagan enteros—, y una oportunidad cerrada no
 * tiene nada que hacer aquí salvo mirarse.
 *
 * Las reglas de cuánto hay que cobrar las decide el API. Lo de aquí solo sirve
 * para que el botón diga cuánto falta en lugar de fallar sin explicar.
 */
export default function GestionDeVenta({
  opportunityId,
  experienceKind,
  status,
  reservations = [],
  condicionDePago,
  puedeAutorizarCondicion = false,
  opciones = 0,
  experiencias,
  onCambio,
}: Props) {
  const { showError, showSuccess, showConfirmation } = useSweetAlert();
  const [trabajando, setTrabajando] = useState(false);

  const esAbierta = experienceKind === 'ABIERTA';
  const variasOpciones = experienceKind === 'PRIVADA' && opciones > 1;
  const abierta = status === 'OPEN' || status === 'open';
  // Una reserva viva es la que esta comprometida o confirmada: las dos
  // bloquean el espacio, y sobre las dos se cobra.
  const reserva = reservations.find(
    (r) => r.status === 'PENDING' || r.status === 'CONFIRMED',
  );
  // TR-08. "Apartado" no es un estado, es lo que significa un PENDING en una
  // privada: el espacio esta comprometido y nadie ha cobrado todavia. En una
  // abierta ese mismo PENDING se lee como "pendiente de pago".
  const preReservada = !esAbierta && reserva?.status === 'PENDING';
  const porCobrar = reserva?.status === 'PENDING';
  const { total, pagado, falta } = faltaParaConfirmar(reserva, esAbierta);

  const conError = async (fn: () => Promise<unknown>, exito: string) => {
    setTrabajando(true);
    try {
      await fn();
      onCambio();
      showSuccess(exito, '');
    } catch (err) {
      // El API explica por qué no se puede —cuánto falta, qué condición—, así
      // que su mensaje vale más que uno genérico nuestro.
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo completar', msg || 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  /**
   * El mismo formulario para apartar un espacio y para crear la reserva de
   * una abierta: se piden los mismos cuatro datos, y lo que cambia —el
   * estado con el que nace, si hay abono minimo— lo decide el API.
   */
  const pedirDatosDeReserva = async (titulo: string, boton: string) => {
    if (experiencias.length === 0) {
      showError('No tienes experiencias', 'Crea una experiencia antes de continuar.');
      return null;
    }
    const { value, isConfirmed } = await Swal.fire({
      title: titulo,
      html: `
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">Experiencia</label>
          <select id="exp" class="swal2-input" style="width:100%;margin:0">
            ${experiencias.map((e) => `<option value="${e._id}">${e.title}</option>`).join('')}
          </select>
          <label style="display:block;margin:8px 0 4px">Fecha y hora</label>
          <input id="fecha" type="datetime-local" class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:8px 0 4px">Personas</label>
          <input id="pax" type="number" min="1" value="10" class="swal2-input" style="width:100%;margin:0">
          <label style="display:block;margin:8px 0 4px">Valor acordado (COP)</label>
          <input id="total" type="text" inputmode="numeric" class="swal2-input"
                 style="width:100%;margin:0" placeholder="0">
        </div>`,
      showCancelButton: true,
      confirmButtonText: boton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
      // El valor acordado se escribe con separadores de miles, como cualquier
      // precio: sin ellos hay que contar ceros para saber si son cien mil o un
      // millón.
      didOpen: () => {
        const campo = document.getElementById('total') as HTMLInputElement | null;
        if (campo) formatearMientrasEscribe(campo);
      },
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
        const fecha = g('fecha');
        const pax = Number(g('pax'));
        const tot = soloElNumero(g('total')) ?? 0;
        if (!fecha) return Swal.showValidationMessage('Indica la fecha');
        if (!pax || pax < 1) return Swal.showValidationMessage('Indica cuántas personas');
        if (!tot || tot <= 0) return Swal.showValidationMessage('Indica el valor acordado');
        return { experienceId: g('exp'), reservationDate: new Date(fecha).toISOString(), participants: pax, total: tot };
      },
    });
    return isConfirmed && value ? (value as Parameters<typeof crearPreReserva>[1]) : null;
  };

  const apartar = async () => {
    const datos = await pedirDatosDeReserva('Apartar el espacio', 'Apartar');
    if (!datos) return;
    await conError(
      () => crearPreReserva(opportunityId, datos),
      'Espacio apartado. Queda bloqueado hasta que confirmes o cierres.',
    );
  };

  const crearReserva = async () => {
    const datos = await pedirDatosDeReserva('Crear la reserva', 'Crear reserva');
    if (!datos) return;
    await conError(
      () => crearReservaDeOportunidad(opportunityId, datos),
      'Reserva creada. Queda pendiente hasta que se pague completa.',
    );
  };

  /**
   * El enlace de reserva con los datos del cliente ya dentro.
   *
   * Se copia al portapapeles en vez de mandarlo: el canal lo elige quien
   * vende —WhatsApp casi siempre— y adivinarlo desde aqui seria mandar un
   * correo que nadie pidio.
   */
  const enviarEnlace = async () => {
    setTrabajando(true);
    try {
      const { url } = await generarEnlaceDeReserva(opportunityId);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Sin permiso de portapapeles el enlace se enseña igual: verlo y
        // copiarlo a mano sigue funcionando.
      }
      onCambio();
      await Swal.fire({
        title: 'Enlace listo',
        html: `
          <p style="font-size:14px;color:#6b7280;margin-bottom:12px">
            Ya está copiado. Al abrirlo, el cliente encuentra sus datos puestos.
          </p>
          <input readonly value="${url}" class="swal2-input" style="width:100%;font-size:12px"
                 onclick="this.select()">`,
        confirmButtonText: 'Listo',
        confirmButtonColor: '#F26726',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo generar el enlace', msg || 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  const abonar = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Registrar un abono',
      input: 'number',
      inputLabel: total > 0 ? `Lleva pagado ${pesos(pagado)} de ${pesos(total)}` : 'Monto recibido',
      inputAttributes: { min: '1' },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
    });
    if (!isConfirmed || !value) return;
    await conError(() => registrarPago(opportunityId, Number(value)), 'Abono registrado');
  };

  const autorizar = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: '¿Qué se acordó?',
      input: 'text',
      inputPlaceholder: 'Ej: orden de compra 4501 a 30 días',
      text: 'Quedará registrado que tú autorizaste esta condición.',
      showCancelButton: true,
      confirmButtonText: 'Autorizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F26726',
    });
    if (!isConfirmed || !value) return;
    await conError(
      () => autorizarCondicionDePago(opportunityId, String(value)),
      'Condición autorizada',
    );
  };

  const confirmar = async () => {
    // TR-15. Lo que va a pasar depende de si hay más de una opción sobre la
    // mesa, y decirlo antes evita la sorpresa de ver la oportunidad abierta
    // —o cerrada— cuando se esperaba lo contrario.
    const ok = await showConfirmation(
      '¿Confirmar la venta?',
      '',
      'Sí, confirmar',
      'Cancelar',
      variasOpciones
        ? [
            'La reserva quedará confirmada y el espacio sigue bloqueado.',
            'La oportunidad NO se cierra: tiene varias opciones y puede que el cliente todavía esté decidiendo las demás.',
            'Ciérrala como ganada cuando sepas que no queda nada por vender.',
          ]
        : [
            'La reserva quedará confirmada y la oportunidad pasará a Ganado cerrado.',
            'El espacio sigue bloqueado.',
          ],
    );
    if (!ok) return;
    setTrabajando(true);
    try {
      const r = await confirmarVenta(opportunityId);
      onCambio();
      const pendientes = r?.opcionesPendientes ?? 0;
      showSuccess(
        'Venta confirmada',
        pendientes > 0
          ? `Quedan ${pendientes} ${pendientes === 1 ? 'opción' : 'opciones'} en el aire, así que la oportunidad sigue abierta.`
          : '',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      showError('No se pudo confirmar', msg || 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  /** TR-15. Cerrar a mano lo que confirmar ya no cierra solo. */
  const cerrar = async () => {
    const ok = await showConfirmation(
      '¿Cerrar como ganada?',
      '',
      'Sí, cerrar',
      'Cancelar',
      [
        'La oportunidad pasa a Ganado cerrado y se retiran sus seguimientos.',
        'Las reservas confirmadas siguen como están.',
      ],
    );
    if (!ok) return;
    await conError(() => cerrarGanada(opportunityId), 'Oportunidad cerrada como ganada');
  };

  const perder = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: 'Cerrar como perdida',
      html: `
        <div style="text-align:left;font-size:14px">
          <label style="display:block;margin:8px 0 4px">Motivo</label>
          <select id="motivo" class="swal2-input" style="width:100%;margin:0">
            ${MOTIVOS_DE_PERDIDA.map((m) => `<option value="${m.valor}">${m.etiqueta}</option>`).join('')}
          </select>
          <label style="display:block;margin:8px 0 4px">Detalle (opcional)</label>
          <input id="notas" class="swal2-input" style="width:100%;margin:0" placeholder="Qué pasó exactamente">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Cerrar como perdida',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      preConfirm: () => ({
        motivo: (document.getElementById('motivo') as HTMLSelectElement)?.value,
        notas: (document.getElementById('notas') as HTMLInputElement)?.value || undefined,
      }),
    });
    if (!isConfirmed || !value) return;
    const v = value as { motivo: string; notas?: string };
    await conError(
      () => perderOportunidad(opportunityId, v.motivo, v.notas),
      'Oportunidad cerrada. El espacio apartado quedó libre.',
    );
  };

  if (!abierta) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Venta</h3>
        <p className="mt-1 text-sm text-gray-500">
          Esta oportunidad ya está cerrada. Su historial se conserva.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Venta</h3>

      {reserva ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {preReservada
                ? 'Espacio apartado'
                : reserva.status === 'CONFIRMED'
                  ? 'Reserva confirmada'
                  : 'Reserva pendiente de pago'}{' '}
              · {reserva.reservationNumber}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(reserva.reservationDate).toLocaleString('es-CO', {
                day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
              })}{' '}
              · {reserva.participants} personas
            </p>
            {total > 0 && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Pagado <strong>{pesos(pagado)}</strong> de {pesos(total)}
                {falta > 0 && !condicionDePago && (
                  <span className="text-gray-500">
                    {' '}· faltan {pesos(falta)} para poder confirmar
                  </span>
                )}
              </p>
            )}
            {/* La pre-reserva no caduca sola: se dice, para que nadie asuma
                que se liberará por su cuenta. */}
            {preReservada && (
              <p className="mt-1 text-xs text-amber-700">
                El espacio queda bloqueado hasta que confirmes o cierres la oportunidad.
                No se libera solo.
              </p>
            )}
          </div>

          {condicionDePago && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">
              Condición de pago autorizada: {condicionDePago}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {porCobrar && (
              <>
                <Button size="sm" color="secondary" onClick={abonar} disabled={trabajando}>
                  Registrar abono
                </Button>
                {/* Autorizar una orden de compra es confirmar una venta sin
                    tener el dinero: lo decide el titular, no quien atiende. */}
                {!condicionDePago && puedeAutorizarCondicion && (
                  <Button size="sm" color="secondary" onClick={autorizar} disabled={trabajando}>
                    Autorizar otra condición
                  </Button>
                )}
                <Button size="sm" onClick={confirmar} disabled={trabajando}>
                  Confirmar venta
                </Button>
              </>
            )}
            {/* TR-15. Con una reserva ya confirmada y varias opciones encima,
                la oportunidad sigue abierta a propósito: aquí se cierra
                cuando quien vende sabe que no queda nada por vender. */}
            {reserva?.status === 'CONFIRMED' && (
              <Button size="sm" onClick={cerrar} disabled={trabajando}>
                Cerrar como ganada
              </Button>
            )}
            <Button size="sm" color="danger" onClick={perder} disabled={trabajando}>
              Cerrar como perdida
            </Button>
          </div>

          {reserva?.status === 'CONFIRMED' && variasOpciones && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Esta oportunidad tiene {opciones} opciones y sigue abierta: la venta
              confirmada es una de ellas. Ciérrala como ganada cuando el cliente
              haya decidido el resto.
            </p>
          )}

          {/* Sin esto, a quien no es titular le falta dinero para confirmar y
              no hay nada en pantalla que explique por qué no puede saltárselo. */}
          {porCobrar && falta > 0 && !condicionDePago && !puedeAutorizarCondicion && (
            <p className="text-xs text-gray-500">
              ¿Van a pagar con orden de compra o alguna otra condición? Eso solo lo
              autoriza el titular de la empresa.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {esAbierta ? (
            <p className="text-sm text-gray-500">
              Es una experiencia abierta: sus cupos se pagan completos y no se
              apartan. Crea tú la reserva, o mándale su enlace y que reserve
              él —el enlace ya lleva sus datos puestos.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Cuando le mandes los medios de pago, aparta el espacio. Quedará
              bloqueado hasta que confirmes o cierres la oportunidad.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {esAbierta ? (
              <>
                <Button size="sm" onClick={crearReserva} disabled={trabajando}>
                  Crear reserva
                </Button>
                <Button size="sm" color="secondary" onClick={enviarEnlace} disabled={trabajando}>
                  Copiar enlace de reserva
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={apartar} disabled={trabajando}>
                Medios de pago enviados
              </Button>
            )}
            <Button size="sm" color="danger" onClick={perder} disabled={trabajando}>
              Cerrar como perdida
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
