// Preguntar lo que hace falta para cancelar una reserva (TR-07).
//
// Cancelar no es cambiar un estado: hay que saber quién canceló —de eso
// depende si corresponde devolver el dinero—, por qué, y si se cae la
// reserva entera o solo parte del grupo. Poner "cancelada" en un selector y
// guardar no responde ninguna de las tres.
import Swal from 'sweetalert2';

export interface DatosDeCancelacion {
  cancelledBy: 'host' | 'client';
  reason: string;
  /** Cuánta gente se cae. Igual al total del grupo = se cae la reserva. */
  participants: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Pide los datos y devuelve null si la persona se echa atrás.
 *
 * El reembolso no se pregunta: lo decide el API según quién cancela, y
 * ofrecer aquí una casilla de importe invitaría a dejar sin devolver lo que
 * el anfitrión canceló por su cuenta.
 */
export async function pedirDatosDeCancelacion(opts: {
  numeroDeReserva: string;
  participantes: number;
  /** Lo que vale la reserva. Se enseña para dimensionar el reembolso. */
  total?: number;
}): Promise<DatosDeCancelacion | null> {
  const { participantes } = opts;
  const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

  const { value, isConfirmed } = await Swal.fire({
    title: 'Cancelar reserva',
    html: `
      <div style="text-align:left;font-size:14px">
        <p style="margin:0 0 12px;color:#4b5563">
          Reserva ${esc(opts.numeroDeReserva)} · ${participantes} ${
            participantes === 1 ? 'persona' : 'personas'
          }${opts.total ? ` · ${pesos(opts.total)}` : ''}
        </p>

        <label style="display:block;margin:8px 0 4px">¿Quién canceló?</label>
        <select id="quien" class="swal2-input" style="width:100%;margin:0">
          <option value="client">El comensal</option>
          <option value="host">Nosotros</option>
        </select>

        <label style="display:block;margin:12px 0 4px">¿Cuántas personas se caen?</label>
        <input id="personas" type="number" min="1" max="${participantes}" value="${participantes}"
               class="swal2-input" style="width:100%;margin:0">
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">
          Con menos que ${participantes}, la reserva sigue en pie con el resto.
        </p>

        <label style="display:block;margin:12px 0 4px">Motivo</label>
        <input id="motivo" type="text" class="swal2-input" style="width:100%;margin:0"
               placeholder="Lo que le vas a contar al comensal">

        <p style="margin:12px 0 0;font-size:12px;color:#6b7280">
          Si cancelas tú, se registra el reembolso de lo cobrado. Si cancela el
          comensal, lo que se devuelva depende de tus términos.
        </p>
      </div>`,
    showCancelButton: true,
    confirmButtonText: 'Cancelar la reserva',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#DC2626',
    preConfirm: () => {
      const g = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
      const motivo = g('motivo').trim();
      const personas = Number(g('personas'));
      if (!motivo) {
        Swal.showValidationMessage('Escribe el motivo: se lo vamos a contar al comensal.');
        return false;
      }
      if (!Number.isInteger(personas) || personas < 1 || personas > participantes) {
        Swal.showValidationMessage(`Entre 1 y ${participantes} personas.`);
        return false;
      }
      return {
        cancelledBy: g('quien') as 'host' | 'client',
        reason: motivo,
        participants: personas,
      };
    },
  });

  if (!isConfirmed || !value) return null;
  return value as DatosDeCancelacion;
}
