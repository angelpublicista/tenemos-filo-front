/**
 * URL de una imagen guardada, venga de donde venga.
 *
 * Hoy los archivos se suben a S3 y se sirven por CloudFront, asi que el
 * valor guardado ya es una URL completa. Pero los assets creados antes de
 * la migracion se guardaron como referencia de Sanity ("image-abc123-jpg")
 * y hay que reconstruir su URL.
 *
 * Esta funcion existe porque la comprobacion vivia copiada en seis sitios
 * y en tres de ellos faltaba: a una URL de CloudFront le anteponian el CDN
 * de Sanity y la imagen no cargaba. Al estar en un solo lugar, añadir un
 * origen nuevo deja de ser una caceria.
 */
export function urlDeImagen(ref?: string | null): string | null {
  if (!ref) return null;

  // Ya es una URL: no hay nada que construir.
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  if (!projectId) return null;

  // "image-abc123-800x600-jpg" -> "abc123-800x600.jpg"
  const sinPrefijo = ref.replace(/^image-/, '');
  const ultimoGuion = sinPrefijo.lastIndexOf('-');
  const nombre =
    ultimoGuion === -1
      ? sinPrefijo
      : `${sinPrefijo.slice(0, ultimoGuion)}.${sinPrefijo.slice(ultimoGuion + 1)}`;

  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${nombre}`;
}
