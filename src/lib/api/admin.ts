// Llamadas del panel de administracion (solo ADMIN).
//
// El API ya restringe estas rutas por rol; esto es la capa de datos que
// consumen las pantallas de /dashboard/admin.
import { api, type Paginated } from './client';
import type { SanityUser } from '@/types';

export type ApiRole = 'HOST' | 'GUEST' | 'ADMIN' | 'RESELLER';

export const ROLE_LABELS: Record<ApiRole, string> = {
  ADMIN: 'Administrador',
  HOST: 'Anfitrión',
  GUEST: 'Comensal',
  RESELLER: 'Revendedor',
};

export type AdminCompany = {
  id: string;
  companyName: string;
  slug: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyType: string | null;
  deletedAt: string | null;
  createdAt: string;
  owner: { id: string; name: string | null; email: string } | null;
  _count: { users: number; experiences: number };
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: ApiRole;
  phone: string | null;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AdminExperience = {
  id: string;
  title: string;
  slug: string;
  status: string;
  basePrice: number | null;
  company?: { id: string; companyName: string } | null;
};

type ListParams = { page?: number; pageSize?: number; search?: string };

// ─── Empresas ──────────────────────────────────────────────────────────────

export const listCompanies = (params: ListParams = {}): Promise<Paginated<AdminCompany>> =>
  api.list<AdminCompany>('/companies', { ...params });

/** Empresa entre las que puede moverse quien llama (para el selector). */
export type MiEmpresa = {
  id: string;
  companyName: string;
  slug: string;
  ownerId: string;
};

/** Un anfitrión puede tener varias; /companies/me solo devuelve la activa. */
export const listMyCompanies = () => api.get<MiEmpresa[]>('/companies/mine/all');

/** ownerId es obligatorio para un ADMIN: no puede ser dueño de una empresa. */
export const createCompany = (data: { companyName: string; ownerId?: string }) =>
  api.post<AdminCompany>('/companies', data);

export const updateCompany = (id: string, data: Record<string, unknown>) =>
  api.patch<AdminCompany>(`/companies/${encodeURIComponent(id)}`, data);

/** Soft-delete: la empresa queda desactivada, no se borra la fila. */
export const deactivateCompany = (id: string) =>
  api.delete<AdminCompany>(`/companies/${encodeURIComponent(id)}`);

export const restoreCompany = (id: string) =>
  api.patch<AdminCompany>(`/companies/${encodeURIComponent(id)}/restore`, {});

// ─── Usuarios ──────────────────────────────────────────────────────────────

export const listUsers = (params: ListParams & { role?: ApiRole } = {}): Promise<
  Paginated<AdminUser>
> => api.list<AdminUser>('/users', { ...params });

export type NewUser = {
  email: string;
  password: string;
  name?: string;
  role: ApiRole;
  phone?: string;
  companyId?: string;
};

/** Alta manual. /auth/register es la via publica y no admite ADMIN/RESELLER. */
export const createUser = (data: NewUser) => api.post<AdminUser>('/users', data);

export const updateUserRole = (id: string, role: ApiRole) =>
  api.patch<AdminUser>(`/users/${encodeURIComponent(id)}`, { role });

export const setUserActive = (id: string, isActive: boolean) =>
  api.patch<AdminUser>(`/users/${encodeURIComponent(id)}`, { isActive });

export const deleteUser = (id: string) => api.delete<void>(`/users/${encodeURIComponent(id)}`);

// ─── Experiencias ──────────────────────────────────────────────────────────

export const listExperiences = (
  params: ListParams & { companyId?: string } = {},
): Promise<Paginated<AdminExperience>> => {
  // El listado de experiencias usa `limit` en vez de `pageSize`.
  const { pageSize, ...rest } = params;
  return api.list<AdminExperience>('/experiences', { ...rest, limit: pageSize });
};

export const updateExperienceStatus = (id: string, status: string) =>
  api.patch<AdminExperience>(`/experiences/${encodeURIComponent(id)}/status`, { status });

export const deleteExperience = (id: string) =>
  api.delete<void>(`/experiences/${encodeURIComponent(id)}`);

// ─── Registro de actividad ─────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: ApiRole | null;
  companyId: string | null;
  companyName: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId: string | null;
  method: string;
  path: string;
  status: number;
  payload: unknown;
  createdAt: string;
};

export const listAuditLogs = (
  params: ListParams & { action?: string; resourceType?: string } = {},
): Promise<Paginated<AuditEntry>> => api.list<AuditEntry>('/audit-logs', { ...params });

/** Traduce el rol del API al que usa el front (minusculas). */
export const roleToFront = (r: ApiRole): SanityUser['role'] =>
  r.toLowerCase() as SanityUser['role'];
