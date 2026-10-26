// Helper para subir archivos al API:
// 1) pide presigned PUT al API (/uploads/presign)
// 2) hace PUT directo al S3 con el File como body
// 3) devuelve la URL publica
import { api } from './client';

type PresignResponse = {
  uploadUrl: string;
  key: string;
  /** null cuando el fichero es privado: esos no tienen URL que servir. */
  publicUrl: string | null;
  maxBytes: number;
  contentType: string;
};

export type UploadScope = 'logos' | 'avatars' | 'experiences' | 'gallery' | 'portadas'
  | 'menus' | 'documentos' | 'misc';

/**
 * Sube cualquier archivo permitido y devuelve su URL publica.
 *
 * Se llama uploadImage por historia, pero el API tambien acepta video para
 * las portadas del catalogo.
 */
export async function uploadImage(file: File, scope: UploadScope = 'misc'): Promise<string> {
  const presign = await api.post<PresignResponse>('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    scope,
  });

  if (file.size > presign.maxBytes) {
    throw new Error(`El archivo excede ${(presign.maxBytes / (1024 * 1024)).toFixed(0)} MB`);
  }

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': presign.contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`S3 rechazo el upload (${putRes.status}). Revisa CORS y bucket policy.`);
  }

  // Una subida publica siempre trae publicUrl; si no viene, el API la trato
  // como privada y devolver '' dejaria un logo roto sin decir por que.
  if (!presign.publicUrl) {
    throw new Error('El API no devolvio una URL publica para este archivo.');
  }
  return presign.publicUrl;
}

/**
 * Sube un documento legal y devuelve su CLAVE de S3, no una URL.
 *
 * Estos ficheros van al prefijo privado del bucket —un RUT lleva NIT,
 * direccion y a veces datos del representante legal—, asi que no hay URL que
 * guardar: para abrirlos se pide despues un enlace firmado que caduca.
 */
export async function subirDocumento(file: File, scope: UploadScope = 'documentos'): Promise<string> {
  const presign = await api.post<PresignResponse>('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    scope,
    visibilidad: 'privado',
  });

  if (file.size > presign.maxBytes) {
    throw new Error(`El archivo excede ${(presign.maxBytes / (1024 * 1024)).toFixed(0)} MB`);
  }

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': presign.contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`S3 rechazo el upload (${putRes.status}). Revisa CORS y bucket policy.`);
  }

  return presign.key;
}

/** Enlace temporal para abrir un documento privado. */
export async function enlaceDeDocumento(key: string): Promise<string> {
  const { url } = await api.get<{ url: string; expiraEnSeg: number }>('/uploads/firma-lectura', { key });
  return url;
}
