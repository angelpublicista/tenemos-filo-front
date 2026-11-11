// El tour por la plataforma: resalta el menú, paso a paso.
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { PASOS_DEL_TOUR } from './pasos';

/** Evento con el que el layout abre o cierra el menú lateral en pantallas pequeñas. */
export const EVENTO_DEL_MENU = 'filo:menu';

const esMovil = () => window.innerWidth < 1024;

const abrirMenu = (abierto: boolean) =>
  window.dispatchEvent(new CustomEvent(EVENTO_DEL_MENU, { detail: { abierto } }));

/**
 * El enlace del menú que se ve ahora.
 *
 * El menú se pinta dos veces —el de escritorio y el cajón del móvil— y uno de
 * los dos está siempre oculto: el primero que devuelve `querySelector` puede
 * ser justo el invisible, y el globo saldría apuntando a la nada.
 */
function enlaceVisible(href: string): HTMLElement | null {
  const enlaces = document.querySelectorAll<HTMLElement>(`a[href="${href}"]`);
  for (const e of enlaces) if (e.getClientRects().length > 0) return e;
  return null;
}

/**
 * Arranca el tour. `alTerminar` se llama tanto si lo completa como si lo cierra
 * (`completo` dice cuál): en ambos casos ya lo vio y no hay que volver a
 * ofrecérselo solo.
 *
 * Los pasos cuyo enlace no está en su menú —según el plan o el rol— se saltan.
 */
export function iniciarTour(alTerminar: (completo: boolean) => void): void {
  const movil = esMovil();
  if (movil) abrirMenu(true);

  // En móvil el cajón tarda en deslizarse; resaltar antes lo mide fuera de sitio.
  window.setTimeout(
    () => {
      const pasos: DriveStep[] = PASOS_DEL_TOUR.flatMap((p) => {
        if (!p.href) {
          return [{ popover: { title: p.titulo, description: p.descripcion } }];
        }
        const href = p.href;
        if (!enlaceVisible(href)) return [];
        return [
          {
            element: () => enlaceVisible(href) ?? document.body,
            popover: { title: p.titulo, description: p.descripcion, side: 'right' as const, align: 'start' as const },
          },
        ];
      });

      const guia = driver({
        steps: pasos,
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Terminar',
        popoverClass: 'tour-filo',
        allowClose: true,
        onDestroyed: () => {
          if (movil) abrirMenu(false);
          // Sin siguiente paso es que llegó al último y pulsó «Terminar».
          alTerminar(!guia.hasNextStep());
        },
      });
      guia.drive();
    },
    movil ? 400 : 0,
  );
}
