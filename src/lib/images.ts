/**
 * URL de una imagen guardada.
 *
 * Los archivos se suben a S3 y se sirven por CloudFront, asi que el valor
 * guardado ya es una URL completa. Esta funcion existe porque la
 * comprobacion vivia copiada en seis sitios y en tres de ellos faltaba: a
 * una URL de CloudFront le anteponian el CDN de Sanity y la imagen no
 * cargaba. Al estar en un solo lugar, añadir un origen nuevo deja de ser
 * una caceria.
 *
 * Hasta hace poco reconstruia tambien las referencias heredadas de Sanity
 * ("image-abc123-jpg"). Se quito al dejar de usar Sanity: la base no
 * contiene ninguna, asi que esa rama no podia ejecutarse.
 */
export function urlDeImagen(ref?: string | null): string | null {
  if (!ref) return null;
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;

  // Cualquier otra cosa es un valor que ya no sabemos resolver. Devolver
  // null deja que quien llama muestre su marcador, en vez de pedir una
  // imagen a una URL inventada.
  return null;
}
