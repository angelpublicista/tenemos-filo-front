// Servicios de user. Tras la migracion ya no quedan funciones contra Sanity:
// - getUserByFirebaseId, createUserInSanity, checkUserExists*, updateUserLocations,
//   testSanityConnection: BORRADAS (sin callers tras migrar AuthContext)
// - associateUserWithCompany, markCompanySetupCompleted: usan POST /companies/:id/associate-me
// - updateUserProfile: usa PATCH /users/:id

import { api } from '@/lib/api/client';
import { SanityUser } from '@/types';

// ─── Mapeos enum (front lower ↔ API upper) ─────────────────────────────────

type ApiRole = 'HOST' | 'GUEST' | 'ADMIN' | 'RESELLER';

const ROLE_TO_API: Record<NonNullable<SanityUser['role']>, ApiRole> = {
  host: 'HOST',
  guest: 'GUEST',
  admin: 'ADMIN',
  reseller: 'RESELLER',
};

interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: ApiRole;
  image: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Asociacion user ↔ company ─────────────────────────────────────────────

export const associateUserWithCompany = async (_firebaseId: string, companyId: string) => {
  void _firebaseId; // legacy: el API resuelve user del JWT
  return api.post<{ id: string; email: string; companyId: string }>(
    `/companies/${encodeURIComponent(companyId)}/associate-me`,
  );
};

export const markCompanySetupCompleted = async (_firebaseId: string) => {
  // No-op: el flag vive en localStorage (AuthContext.markSetupCompleted).
  void _firebaseId;
  return { ok: true };
};

// ─── Update perfil ─────────────────────────────────────────────────────────

export const updateUserProfile = async (
  userId: string,
  updateData: Partial<SanityUser>,
): Promise<ApiUser> => {
  // Mapeamos del shape Sanity-style del front al body que espera el API.
  const body: Record<string, unknown> = {};
  if (updateData.name !== undefined) body.name = updateData.name;
  if (updateData.phone !== undefined) body.phone = updateData.phone;
  if (updateData.role !== undefined) body.role = ROLE_TO_API[updateData.role];
  if (updateData.typeDocument !== undefined) body.documentType = updateData.typeDocument;
  if (updateData.documentNumber !== undefined) body.documentNumber = updateData.documentNumber;
  if (updateData.companyId !== undefined) body.companyId = updateData.companyId;
  if (updateData.isActive !== undefined) body.isActive = updateData.isActive;

  return api.patch<ApiUser>(`/users/${encodeURIComponent(userId)}`, body);
};
