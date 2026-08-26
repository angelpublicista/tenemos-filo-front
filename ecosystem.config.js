// Arranque del front bajo PM2.
//
// El servidor que se ejecuta es el de la salida "standalone" de Next.js, no
// `next start`: en la instancia no hay node_modules ni el CLI de Next, solo
// el paquete autocontenido que produce el build en CI.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = '/srv/tenemosfilo-front';

/**
 * Lee las variables de ejecucion del .env de la instancia.
 *
 * Se hace aqui y no con dotenv porque el paquete autocontenido no lo
 * incluye. Ojo: esto solo cubre las variables de SERVIDOR. Las que empiezan
 * por NEXT_PUBLIC_ se incrustan al compilar y no se leen al arrancar —
 * cambiarlas exige recompilar, no reiniciar.
 */
function variablesDeEjecucion() {
  const ruta = path.join(RAIZ, '.env');
  if (!fs.existsSync(ruta)) return {};

  const env = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte === -1) continue;
    env[limpia.slice(0, corte).trim()] = limpia
      .slice(corte + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: 'filo-front',
      script: 'server.js',

      // `current` es un enlace al despliegue activo. Al publicar una version
      // nueva se mueve el enlace y se recarga: si algo sale mal, volver atras
      // es apuntarlo al anterior.
      cwd: `${RAIZ}/current`,

      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Solo localhost: quien atiende desde fuera es Nginx. Escuchar en
        // todas las interfaces dejaria una via directa al puerto 3000 que
        // se salta el proxy y sus cabeceras.
        HOSTNAME: '127.0.0.1',
        ...variablesDeEjecucion(),
      },

      max_memory_restart: '400M',
      autorestart: true,
      max_restarts: 10,
      merge_logs: true,
      time: true,
    },
  ],
};
