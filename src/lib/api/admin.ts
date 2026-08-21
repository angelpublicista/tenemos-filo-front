// Llamadas del panel de administracion (solo ADMIN).
//
// El API ya restringe estas rutas por rol; esto es la capa de datos que
// consumen las pantallas de /dashboard/admin.
import { aNumero, api, apiEnvelope, type Paginated } from './client';
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
  filoCommissionType?: 'PERCENT' | 'FIXED' | null;
  filoCommissionValue?: number | null;
  resellerCommissionType?: 'PERCENT' | 'FIXED' | null;
  resellerCommissionValue?: number | null;
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

export const listExperiences = async (
  params: ListParams & { companyId?: string } = {},
): Promise<Paginated<AdminExperience>> => {
  // El listado de experiencias usa `limit` en vez de `pageSize`.
  const { pageSize, ...rest } = params;
  const { items, total } = await api.list<AdminExperience>('/experiences', {
    ...rest,
    limit: pageSize,
  });
  // Mismos Decimal-como-string que en los ajustes.
  return {
    total,
    items: items.map((e) => ({
      ...e,
      basePrice: aNumeroONull(e.basePrice),
      filoCommissionValue: aNumeroONull(e.filoCommissionValue),
      resellerCommissionValue: aNumeroONull(e.resellerCommissionValue),
    })),
  };
};

// ─── Comisiones ────────────────────────────────────────────────────────────

export type CommissionType = 'PERCENT' | 'FIXED';

/** null en una experiencia = hereda el valor por defecto de la plataforma. */
export type Comisiones = {
  filoCommissionType: CommissionType | null;
  filoCommissionValue: number | null;
  resellerCommissionType: CommissionType | null;
  resellerCommissionValue: number | null;
};

export type WompiEnvironment = 'SANDBOX' | 'PRODUCTION';

export type PlatformSettings = {
  filoCommissionType: CommissionType;
  filoCommissionValue: number;
  resellerCommissionType: CommissionType;
  resellerCommissionValue: number;

  wompiEnabled: boolean;
  wompiEnvironment: WompiEnvironment;
  /** Pública por diseño: el navegador la necesita para abrir el checkout. */
  wompiPublicKey: string | null;
  // Los secretos nunca llegan al front; solo si están puestos.
  wompiPrivateKeyConfigured: boolean;
  wompiIntegritySecretConfigured: boolean;
  wompiEventsSecretConfigured: boolean;
};

/** Campos que se pueden enviar. Cadena vacía borra un secreto. */
export type SettingsUpdate = Partial<
  Pick<
    PlatformSettings,
    | 'filoCommissionType'
    | 'filoCommissionValue'
    | 'resellerCommissionType'
    | 'resellerCommissionValue'
    | 'wompiEnabled'
    | 'wompiEnvironment'
  >
> & {
  wompiPublicKey?: string;
  wompiPrivateKey?: string;
  wompiIntegritySecret?: string;
  wompiEventsSecret?: string;
};

/**
 * Prisma serializa los Decimal como STRING ("12" y no 12). Si no los
 * convertimos aqui, al guardar se reenvia el string y el API lo rechaza:
 * basta con editar un campo y dejar el otro sin tocar.
 */
const aNumeroONull = (v: unknown): number | null =>
  v === null || v === undefined ? null : aNumero(v);

export const getSettings = async (): Promise<PlatformSettings> => {
  const s = await api.get<PlatformSettings>('/settings');
  return {
    ...s,
    filoCommissionValue: aNumero(s.filoCommissionValue),
    resellerCommissionValue: aNumero(s.resellerCommissionValue),
  };
};

export const updateSettings = (data: SettingsUpdate) =>
  api.patch<PlatformSettings>('/settings', data);

export const updateExperienceCommissions = (id: string, data: Comisiones) =>
  api.patch<AdminExperience>(`/experiences/${encodeURIComponent(id)}`, data);

/** Texto legible de una comisión, o de qué hereda. */
export const formatoComision = (
  tipo: CommissionType | null,
  valor: number | null,
  porDefecto?: { tipo: CommissionType; valor: number },
): string => {
  if (tipo === null || valor === null) {
    if (!porDefecto) return 'Heredada';
    return `Heredada (${formatoComision(porDefecto.tipo, porDefecto.valor)})`;
  }
  return tipo === 'PERCENT'
    ? `${valor}%`
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);
};

export const updateExperienceStatus = (id: string, status: string) =>
  api.patch<AdminExperience>(`/experiences/${encodeURIComponent(id)}/status`, { status });

export const deleteExperience = (id: string) =>
  api.delete<void>(`/experiences/${encodeURIComponent(id)}`);

// ─── Dispersiones ──────────────────────────────────────────────────────────

export type PayoutRole = 'HOST' | 'RESELLER';

export type Saldo = {
  companyId: string;
  companyName: string;
  role: PayoutRole;
  accrued: number;
  paid: number;
  pending: number;
};

export type Payout = {
  id: string;
  companyId: string;
  company?: { id: string; companyName: string } | null;
  role: PayoutRole;
  amount: number;
  reference: string | null;
  notes: string | null;
  createdByEmail: string | null;
  paidAt: string;
};

/** Saldos por destinatario + lo que retiene FILO en comisiones. */
export const listBalances = async (): Promise<{ items: Saldo[]; filoRetained: number }> => {
  const payload = await apiEnvelope<Saldo[]>('/payouts/balances');
  const items = (payload?.data ?? []).map((s) => ({
    ...s,
    accrued: aNumero(s.accrued),
    paid: aNumero(s.paid),
    pending: aNumero(s.pending),
  }));
  return { items, filoRetained: aNumero(payload?.meta?.filoRetained) };
};

export const createPayout = (data: {
  companyId: string;
  role: PayoutRole;
  amount: number;
  reference?: string;
  notes?: string;
}) => api.post<Payout>('/payouts', data);

export const listPayouts = async (params: { companyId?: string } = {}) => {
  const { items, total } = await api.list<Payout>('/payouts', { ...params, pageSize: 50 });
  return { items: items.map((p) => ({ ...p, amount: aNumero(p.amount) })), total };
};

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
