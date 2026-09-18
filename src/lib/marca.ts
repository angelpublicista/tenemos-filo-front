/**
 * Colores de marca del anfitrion.
 *
 * El anfitrion elige dos colores. Todo lo demas —el tono de paso del raton y
 * si el texto encima va en blanco o en negro— se calcula aqui a partir del
 * principal, en vez de guardarse: son consecuencias suyas, y guardarlas seria
 * dejar que alguien las cambie por separado y queden desparejadas.
 */

const HEX = /^#([0-9a-fA-F]{6})$/;

/** El color si es un #RRGGBB valido; si no, null. */
export function colorValido(valor?: string | null): string | null {
  const t = (valor ?? '').trim();
  return HEX.test(t) ? t.toUpperCase() : null;
}

function canales(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const aHex = (c: number) =>
  Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');

/**
 * El mismo color, mas oscuro.
 *
 * Es el tono de paso del raton sobre los botones. Se oscurece un 15%, que es
 * mas o menos la diferencia que habia entre el naranja de la plataforma y su
 * propio tono de hover.
 */
export function masOscuro(hex: string, proporcion = 0.15): string {
  const [r, g, b] = canales(hex);
  const f = 1 - proporcion;
  return `#${aHex(r * f)}${aHex(g * f)}${aHex(b * f)}`.toUpperCase();
}

/**
 * Blanco o negro, el que se lea encima de ese fondo.
 *
 * El blanco es el color de siempre y se respeta: esto no es un optimizador de
 * contraste, es una red de seguridad. Solo se pasa a texto oscuro cuando el
 * blanco encima seria ilegible de verdad —contraste por debajo de 3:1, que no
 * alcanza ni para texto grande segun la WCAG—.
 *
 * Se hace asi a proposito. El maximo contraste matematico mandaria poner
 * texto oscuro sobre el naranja de la plataforma (5,70 contra 3,11), lo que
 * cambiaria el aspecto de todos los catalogos y correos que ya funcionan.
 * Aqui solo se interviene cuando alguien elige un amarillo o un pastel, que
 * es donde el problema es real.
 *
 * El umbral sale de despejar 1,05 / (L + 0,05) < 3.
 */
export function textoSobre(hex: string): string {
  const canal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = canales(hex);
  const L = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  return L > 0.30 ? '#111827' : '#FFFFFF';
}

/**
 * El mismo color, translucido.
 *
 * Existe porque `bg-marca/10` no sirve aqui: Tailwind resuelve esas
 * fracciones al compilar y deja el color ya mezclado en el CSS, asi que se
 * quedaria naranja por mucho que la empresa cambie el suyo. Estos tonos van
 * en variable propia para que se resuelvan al pintar.
 */
function conAlfa(hex: string, porcentaje: number): string {
  const a = Math.round((porcentaje / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`.toUpperCase();
}

/**
 * Las variables CSS que pintan un trozo de interfaz con la marca del
 * anfitrion.
 *
 * Se devuelven para ponerlas como `style` de un contenedor: dentro de el las
 * utilidades `bg-marca`, `text-marca` y demas cogen estos valores, y fuera
 * siguen valiendo los de la plataforma. Asi el catalogo cambia de color sin
 * que el panel se entere.
 *
 * Un color invalido o ausente no pone la variable, y entonces manda el valor
 * por defecto del tema: nunca se queda a medias.
 */
export function estiloDeMarca(
  principal?: string | null,
  secundario?: string | null,
): React.CSSProperties {
  const estilo: Record<string, string> = {};

  const p = colorValido(principal);
  if (p) {
    estilo['--color-marca'] = p;
    estilo['--color-marca-fuerte'] = masOscuro(p);
    estilo['--color-marca-contraste'] = textoSobre(p);
    estilo['--color-marca-tenue'] = conAlfa(p, 10);
    estilo['--color-marca-borde'] = conAlfa(p, 20);
    estilo['--color-marca-medio'] = conAlfa(p, 40);
  }

  const s = colorValido(secundario);
  if (s) {
    estilo['--color-acento'] = s;
    estilo['--color-acento-tenue'] = conAlfa(s, 10);
    estilo['--color-acento-medio'] = conAlfa(s, 40);
  }

  return estilo as React.CSSProperties;
}
