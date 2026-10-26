/**
 * Horario semanal de una sede: un tramo por día.
 *
 * Las claves de día son las mismas que usa la disponibilidad de experiencias
 * en el API (`Availability.weeklySchedule`), para no tener dos vocabularios de
 * días en la misma aplicación.
 *
 * Qué significa el horario depende de si la sede está abierta al público: si
 * lo está es su horario de atención, y si no, cuándo se puede montar algo
 * dentro. El dato es el mismo, así que se guarda una sola vez y solo cambia
 * cómo se titula.
 */

export const DIAS = [
  { clave: 'mon', nombre: 'Lunes' },
  { clave: 'tue', nombre: 'Martes' },
  { clave: 'wed', nombre: 'Miércoles' },
  { clave: 'thu', nombre: 'Jueves' },
  { clave: 'fri', nombre: 'Viernes' },
  { clave: 'sat', nombre: 'Sábado' },
  { clave: 'sun', nombre: 'Domingo' },
] as const;

export type ClaveDia = (typeof DIAS)[number]['clave'];

export interface DiaDeHorario {
  isOpen: boolean;
  from: string;
  to: string;
}

export type HorarioSemanal = Record<ClaveDia, DiaDeHorario>;

/** Lo que se ofrece antes de que nadie toque nada. */
export function horarioPorDefecto(): HorarioSemanal {
  return Object.fromEntries(
    DIAS.map((d) => [
      d.clave,
      // De lunes a sábado abierto y el domingo cerrado: es lo mas comun y
      // deja menos casillas que tocar que empezar con todo cerrado.
      { isOpen: d.clave !== 'sun', from: '09:00', to: '18:00' },
    ]),
  ) as HorarioSemanal;
}

/** El horario guardado, completado si viniera a medias. */
export function horarioDesde(valor: unknown): HorarioSemanal {
  const base = horarioPorDefecto();
  if (!valor || typeof valor !== 'object') return base;
  const v = valor as Record<string, Partial<DiaDeHorario>>;
  for (const d of DIAS) {
    const dia = v[d.clave];
    if (!dia) continue;
    base[d.clave] = {
      isOpen: Boolean(dia.isOpen),
      from: typeof dia.from === 'string' ? dia.from : base[d.clave].from,
      to: typeof dia.to === 'string' ? dia.to : base[d.clave].to,
    };
  }
  return base;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Qué le falta al horario para poder guardarse, o null.
 *
 * No se exige que el cierre sea posterior a la apertura: un bar que abre a las
 * 18:00 y cierra a las 02:00 es un horario normal. Solo se rechaza que sean
 * iguales estando abierto, porque eso no dice ni cero horas ni veinticuatro.
 */
export function errorDeHorario(h: HorarioSemanal): string | null {
  for (const d of DIAS) {
    const dia = h[d.clave];
    if (!dia.isOpen) continue;
    if (!HORA.test(dia.from) || !HORA.test(dia.to)) {
      return `Revisa las horas del ${d.nombre.toLowerCase()}`;
    }
    if (dia.from === dia.to) {
      return `El ${d.nombre.toLowerCase()} tiene la misma hora de apertura y de cierre`;
    }
  }
  return null;
}

/** Si el tramo cruza la medianoche, para poder avisarlo. */
export const cruzaMedianoche = (d: DiaDeHorario) => d.isOpen && d.to < d.from;
