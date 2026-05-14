// Helper para subir archivos al API:
// 1) pide presigned PUT al API (/uploads/presign)
// 2) hace PUT directo al S3 con el File como body
// 3) devuelve la URL publica
import { api } from './client';

type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  maxBytes: number;
  contentType: string;
};

export type UploadScope = 'logos' | 'avatars' | 'experiences' | 'gallery' | 'misc';

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

  return presign.publicUrl;
}
