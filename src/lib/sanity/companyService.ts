// Reescrito para apuntar al API propio (Express + Postgres) en vez de Sanity.
// El nombre del archivo se conserva para no romper imports en los 10+ callers.
// El shape de retorno (`Company`) se mantiene "Sanity-style" via mapeo, asi
// que ningun caller necesita cambiar mientras el tipo `Company` no cambie.
import { api } from '@/lib/api/client';
import { Company } from '@/types';

// ─── Tipos publicos (se conservan para compat) ─────────────────────────────

export interface CreateCompanyData {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
  logo?: string;
  documentType?: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber?: string;
  businessName?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  employeeCount?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annualRevenue?: '0-100k' | '100k-500k' | '500k-1M' | '1M-5M' | '5M+';
  businessYears?: '0-1' | '1-3' | '3-5' | '5-10' | '10+';
}

// `logo` admite null para borrarlo explicitamente (PATCH con logo:null deja
// el campo en NULL en Postgres). Usamos Omit para que no se intersecte con
// el `logo: string | undefined` de CreateCompanyData.
export type UpdateCompanyData = Partial<Omit<CreateCompanyData, 'logo'>> & {
  logo?: string | null;
  tagline?: string | null;
  /** Id del restaurante en OpenTable (el "rid" de sus enlaces). */
  openTableRid?: string | null;
  coverType?: 'NONE' | 'IMAGE' | 'VIDEO' | 'SLIDER';
  coverImages?: string[];
  coverVideo?: string | null;
  /** Ajustes de operacion: cambian como entran las reservas. */
  autoConfirmReservations?: boolean;
  blockWhenFull?: boolean;
};

// ─── Tipos del API (Postgres) ──────────────────────────────────────────────

type ApiCompanyType = 'RESTAURANT' | 'CATERING' | 'FOODTRUCK' | 'OTHER';
type ApiDocumentType = 'NIT' | 'CEDULA' | 'PASAPORTE' | 'OTHER';

export interface ApiCompany {
  id: string;
  ownerId: string;
  companyName: string;
  slug: string;
  businessName: string | null;
  description: string | null;
  companyType: ApiCompanyType | null;
  companyEmail: string | null;
  companyPhone: string | null;
  logo: string | null;
  documentType: ApiDocumentType | null;
  documentNumber: string | null;
  website: string | null;
  address: Company['address'] | null;
  employeeCount: string | null;
  embedDomains?: string[];
  tagline: string | null;
  openTableRid: string | null;
  coverType: 'NONE' | 'IMAGE' | 'VIDEO' | 'SLIDER' | null;
  coverImages: string[] | null;
  coverVideo: string | null;
  autoConfirmReservations: boolean;
  blockWhenFull: boolean;
  annualRevenue: string | null;
  businessYears: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  locations?: Array<{ id: string; name: string; isMain: boolean }>;
}

// ─── Mapeos enum (lower<->upper) ───────────────────────────────────────────

const COMPANY_TYPE_TO_API: Record<NonNullable<CreateCompanyData['companyType']>, ApiCompanyType> = {
  restaurant: 'RESTAURANT',
  catering: 'CATERING',
  foodtruck: 'FOODTRUCK',
  other: 'OTHER',
};
const COMPANY_TYPE_FROM_API: Record<ApiCompanyType, Company['companyType']> = {
  RESTAURANT: 'restaurant',
  CATERING: 'catering',
  FOODTRUCK: 'foodtruck',
  OTHER: 'other',
};

const DOC_TYPE_TO_API: Record<NonNullable<CreateCompanyData['documentType']>, ApiDocumentType> = {
  nit: 'NIT',
  cedula: 'CEDULA',
  pasaporte: 'PASAPORTE',
  other: 'OTHER',
};
const DOC_TYPE_FROM_API: Record<ApiDocumentType, NonNullable<Company['documentType']>> = {
  NIT: 'nit',
  CEDULA: 'cedula',
  PASAPORTE: 'pasaporte',
  OTHER: 'other',
};

// ─── Mapper API → Company shape (compatible con tipo `Company` Sanity-like) ─

export function toCompany(c: ApiCompany): Company {
  return {
    _id: c.id,
    _type: 'company',
    companyName: c.companyName,
    slug: { _type: 'slug', current: c.slug },
    businessName: c.businessName ?? undefined,
    description: c.description ?? undefined,
    logo: c.logo
      ? { asset: { _ref: c.logo, _type: 'reference' } }
      : undefined,
    companyType: c.companyType ? COMPANY_TYPE_FROM_API[c.companyType] : 'other',
    companyEmail: c.companyEmail ?? '',
    companyPhone: c.companyPhone ?? '',
    documentType: c.documentType ? DOC_TYPE_FROM_API[c.documentType] : undefined,
    documentNumber: c.documentNumber ?? undefined,
    website: c.website ?? undefined,
    address: c.address ?? undefined,
    employeeCount: (c.employeeCount as Company['employeeCount']) ?? undefined,
    embedDomains: c.embedDomains ?? [],
    tagline: c.tagline ?? undefined,
    openTableRid: c.openTableRid ?? undefined,
    coverType: c.coverType ?? 'NONE',
    coverImages: c.coverImages ?? [],
    coverVideo: c.coverVideo ?? undefined,
    autoConfirmReservations: c.autoConfirmReservations ?? false,
    // Por defecto true: es lo que hace el API si el campo no viaja.
    blockWhenFull: c.blockWhenFull ?? true,
    annualRevenue: (c.annualRevenue as Company['annualRevenue']) ?? undefined,
    businessYears: (c.businessYears as Company['businessYears']) ?? undefined,
    locations: c.locations?.map((l) => ({ _ref: l.id, _type: 'reference' as const })),
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function buildPayload(data: CreateCompanyData | UpdateCompanyData): Record<string, unknown> {
  // Los ajustes de marca y operacion solo llegan por UpdateCompanyData.
  const upd = data as UpdateCompanyData;
  const out: Record<string, unknown> = {};
  if (data.companyName !== undefined) out.companyName = data.companyName;
  if (data.companyType !== undefined) out.companyType = COMPANY_TYPE_TO_API[data.companyType];
  if (data.description !== undefined) out.description = data.description;
  if (data.companyEmail !== undefined) out.companyEmail = data.companyEmail;
  if (data.companyPhone !== undefined) out.companyPhone = data.companyPhone;
  if (data.logo !== undefined) out.logo = data.logo === null ? null : data.logo;
  if (data.documentType !== undefined) out.documentType = DOC_TYPE_TO_API[data.documentType];
  if (data.documentNumber !== undefined) out.documentNumber = data.documentNumber;
  if (data.businessName !== undefined) out.businessName = data.businessName;
  if (data.website !== undefined) out.website = data.website;
  if (data.address !== undefined) out.address = data.address;
  if (data.employeeCount !== undefined) out.employeeCount = data.employeeCount;
  if (data.annualRevenue !== undefined) out.annualRevenue = data.annualRevenue;
  if (data.businessYears !== undefined) out.businessYears = data.businessYears;
  if (upd.tagline !== undefined) out.tagline = upd.tagline;
  if (upd.openTableRid !== undefined) out.openTableRid = upd.openTableRid;
  if (upd.coverType !== undefined) out.coverType = upd.coverType;
  if (upd.coverImages !== undefined) out.coverImages = upd.coverImages;
  if (upd.coverVideo !== undefined) out.coverVideo = upd.coverVideo;
  if (upd.autoConfirmReservations !== undefined) {
    out.autoConfirmReservations = upd.autoConfirmReservations;
  }
  if (upd.blockWhenFull !== undefined) out.blockWhenFull = upd.blockWhenFull;
  return out;
}

// ─── API publica (mismas firmas que la version Sanity) ─────────────────────

export const createCompanyInSanity = async (data: CreateCompanyData): Promise<Company> => {
  const created = await api.post<ApiCompany>('/companies', buildPayload(data));
  return toCompany(created);
};

export const getCompanyByUserId = async (_userIdLegacy?: string): Promise<Company | null> => {
  // El parametro era el firebaseId del user; ahora ignoramos y usamos /companies/me
  // (el API resuelve la company del usuario autenticado).
  void _userIdLegacy;
  const company = await api.get<ApiCompany | null>('/companies/me');
  return company ? toCompany(company) : null;
};

export const getCompanyById = async (companyId: string): Promise<Company | null> => {
  try {
    const company = await api.get<ApiCompany>(`/companies/${encodeURIComponent(companyId)}`);
    return toCompany(company);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const updateCompanyInSanity = async (
  companyId: string,
  data: UpdateCompanyData,
): Promise<Company> => {
  const updated = await api.patch<ApiCompany>(
    `/companies/${encodeURIComponent(companyId)}`,
    buildPayload(data),
  );
  return toCompany(updated);
};

export const updateCompanyLocations = async (_companyId: string, _locationIds: string[]) => {
  // TODO: migrar al API. Pertenece al modulo `locations` (aun en esqueleto).
  void _companyId;
  void _locationIds;
  throw new Error('updateCompanyLocations aun no migrado al nuevo backend.');
};

/**
 * Dominios autorizados a insertar el catalogo en un iframe.
 * Devuelve la lista ya normalizada por el API.
 */
export const setEmbedDomains = async (
  companyId: string,
  embedDomains: string[],
): Promise<string[]> => {
  const res = await api.patch<{ id: string; embedDomains: string[] }>(
    `/companies/${encodeURIComponent(companyId)}/embed-domains`,
    { embedDomains },
  );
  return res.embedDomains ?? [];
};
