// Reescrito sobre el API. Conserva las firmas de las 10 funciones publicas
// para no romper los callers (dashboard/experiences, crm, reservas, etc.).
// El shape de Experience se mantiene "Sanity-like" via mapeo.
import { api } from '@/lib/api/client';
import {
  Experience,
  CreateExperienceData,
  UpdateExperienceData,
  ExperienceSearchParams,
} from '@/types';

// ─── Tipos del API (Postgres) ──────────────────────────────────────────────

type ApiExperienceType = 'VIRTUAL' | 'PRESENTIAL' | 'HYBRID';
type ApiExperienceStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'PAUSED' | 'INACTIVE';

interface ApiExperience {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  description: string | null;
  categories: string[];
  duration: number | null;
  capacity: number | null;
  minCapacity: number | null;
  basePrice: string | number | null;
  currency: string;
  featuredImage: string | null;
  gallery: Array<{ assetId: string; alt?: string; caption?: string }> | null;
  experienceType: ApiExperienceType;
  isVirtual: boolean;
  virtualPlatform: string | null;
  presentialLocation: string | null;
  presentialAddress: string | null;
  presentialCity: string | null;
  hideAddress: boolean;
  requirements: string | null;
  includes: string[] | string | null;
  addons: Experience['addons'] | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ApiExperienceStatus;
  isFeatured: boolean;
  rating: number | null;
  totalBookings: number;
  totalRevenue: string | number;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; companyName: string; companyEmail?: string; companyPhone?: string };
  locations?: Array<{
    id: string;
    name: string;
    isMain: boolean;
    address?: Experience['locations'] extends Array<infer L> ? L extends { address?: infer A } ? A : unknown : unknown;
    capacity?: unknown;
  }>;
  availabilities?: Array<{
    id: string;
    name: string;
    weeklySchedule: unknown;
    bufferTime: number;
    minimumNotice: number;
    blockedDates: string[];
    locationId: string | null;
  }>;
}

// ─── Mapeos enum (lower<->upper) ───────────────────────────────────────────

const STATUS_TO_API: Record<NonNullable<Experience['status']>, ApiExperienceStatus> = {
  draft: 'DRAFT',
  pending: 'PENDING',
  active: 'ACTIVE',
  paused: 'PAUSED',
  inactive: 'INACTIVE',
};
const STATUS_FROM_API: Record<ApiExperienceStatus, Experience['status']> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  INACTIVE: 'inactive',
};

const TYPE_TO_API: Record<NonNullable<Experience['experienceType']>, ApiExperienceType> = {
  virtual: 'VIRTUAL',
  presential: 'PRESENTIAL',
  hybrid: 'HYBRID',
};
const TYPE_FROM_API: Record<ApiExperienceType, Experience['experienceType']> = {
  VIRTUAL: 'virtual',
  PRESENTIAL: 'presential',
  HYBRID: 'hybrid',
};

// ─── Mapper API → Experience (Sanity-like) ─────────────────────────────────

function toExperience(e: ApiExperience): Experience {
  const includesArr =
    e.includes == null
      ? []
      : Array.isArray(e.includes)
        ? e.includes
        : [e.includes];

  return {
    _id: e.id,
    _type: 'experience',
    title: e.title,
    slug: { _type: 'slug', current: e.slug },
    company: { _ref: e.companyId, _type: 'reference' },
    description: e.description ?? '',
    categories: (e.categories ?? []) as Experience['categories'],
    duration: e.duration ?? 0,
    capacity: e.capacity ?? 0,
    minCapacity: e.minCapacity ?? undefined,
    basePrice: typeof e.basePrice === 'string' ? Number(e.basePrice) : (e.basePrice ?? 0),
    currency: e.currency as Experience['currency'],
    featuredImage: e.featuredImage ?? undefined,
    gallery: e.gallery ?? undefined,
    // Incluimos refs Y datos expandidos para que los consumers tengan ambos.
    locations: e.locations?.map((l) => ({
      _ref: l.id,
      _type: 'reference' as const,
      _id: l.id,
      name: l.name,
      address: l.address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | undefined,
      isMain: l.isMain,
      capacity: l.capacity as { minGuests?: number; maxGuests?: number } | undefined,
    })),
    availabilities: e.availabilities?.map((a) => ({ _ref: a.id, _type: 'reference' as const })),
    availabilitySchedules: e.availabilities?.map((a) => ({
      _id: a.id,
      _type: 'availability' as const,
      name: a.name,
      weeklySchedule: a.weeklySchedule as import('@/types').WeeklySchedule,
      bufferTime: a.bufferTime,
      minimumNotice: a.minimumNotice,
      blockedDates: (a.blockedDates ?? []).map((d) => ({ date: d })),
      isMain: false,
      isActive: true,
      location: a.locationId ? { _ref: a.locationId, _type: 'reference' as const } : undefined,
      createdAt: '',
      updatedAt: '',
    })),
    experienceType: TYPE_FROM_API[e.experienceType],
    isVirtual: e.isVirtual,
    virtualPlatform: (e.virtualPlatform ?? undefined) as Experience['virtualPlatform'],
    presentialLocation: e.presentialLocation ?? undefined,
    presentialAddress: e.presentialAddress ?? undefined,
    presentialCity: e.presentialCity ?? undefined,
    hideAddress: e.hideAddress,
    requirements: e.requirements ? [e.requirements] : undefined,
    includes: includesArr,
    addons: e.addons ?? undefined,
    startDate: e.startDate ?? undefined,
    endDate: e.endDate ?? undefined,
    startTime: e.startTime ?? undefined,
    endTime: e.endTime ?? undefined,
    status: STATUS_FROM_API[e.status],
    isFeatured: e.isFeatured,
    rating: e.rating ?? undefined,
    totalBookings: e.totalBookings,
    totalRevenue: typeof e.totalRevenue === 'string' ? Number(e.totalRevenue) : e.totalRevenue,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ─── Builder body create/update ────────────────────────────────────────────

function buildCreatePayload(data: CreateExperienceData): Record<string, unknown> {
  return {
    title: data.title,
    company: data.company,
    description: data.description,
    categories: data.categories,
    duration: data.duration,
    capacity: data.capacity,
    minCapacity: data.minCapacity,
    basePrice: data.basePrice,
    currency: data.currency,
    featuredImage: data.featuredImage,
    gallery: data.gallery,
    locations: data.locations ?? [],
    availabilities: data.availabilities ?? [],
    experienceType: TYPE_TO_API[data.experienceType],
    isVirtual: data.isVirtual,
    virtualPlatform: data.virtualPlatform,
    presentialLocation: data.presentialLocation,
    presentialAddress: data.presentialAddress,
    presentialCity: data.presentialCity,
    hideAddress: data.hideAddress,
    requirements: Array.isArray(data.requirements) ? data.requirements.join('\n') : data.requirements,
    includes: data.includes,
    addons: data.addons,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status ? STATUS_TO_API[data.status] : undefined,
    isFeatured: data.isFeatured,
  };
}

function buildUpdatePayload(data: UpdateExperienceData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = data.title;
  if (data.description !== undefined) out.description = data.description;
  if (data.categories !== undefined) out.categories = data.categories;
  if (data.duration !== undefined) out.duration = data.duration;
  if (data.capacity !== undefined) out.capacity = data.capacity;
  if (data.minCapacity !== undefined) out.minCapacity = data.minCapacity;
  if (data.basePrice !== undefined) out.basePrice = data.basePrice;
  if (data.currency !== undefined) out.currency = data.currency;
  if (data.featuredImage !== undefined) out.featuredImage = data.featuredImage;
  if (data.gallery !== undefined) out.gallery = data.gallery;
  if (data.locations !== undefined) out.locations = data.locations;
  if (data.availabilities !== undefined) out.availabilities = data.availabilities;
  if (data.experienceType !== undefined) out.experienceType = TYPE_TO_API[data.experienceType];
  if (data.isVirtual !== undefined) out.isVirtual = data.isVirtual;
  if (data.virtualPlatform !== undefined) out.virtualPlatform = data.virtualPlatform;
  if (data.presentialLocation !== undefined) out.presentialLocation = data.presentialLocation;
  if (data.presentialAddress !== undefined) out.presentialAddress = data.presentialAddress;
  if (data.presentialCity !== undefined) out.presentialCity = data.presentialCity;
  if (data.hideAddress !== undefined) out.hideAddress = data.hideAddress;
  if (data.requirements !== undefined)
    out.requirements = Array.isArray(data.requirements)
      ? data.requirements.join('\n')
      : data.requirements;
  if (data.includes !== undefined) out.includes = data.includes;
  if (data.addons !== undefined) out.addons = data.addons;
  if (data.startDate !== undefined) out.startDate = data.startDate;
  if (data.endDate !== undefined) out.endDate = data.endDate;
  if (data.startTime !== undefined) out.startTime = data.startTime;
  if (data.endTime !== undefined) out.endTime = data.endTime;
  if (data.status !== undefined) out.status = STATUS_TO_API[data.status];
  if (data.isFeatured !== undefined) out.isFeatured = data.isFeatured;
  return out;
}

// ─── API publica ───────────────────────────────────────────────────────────

export const createExperienceInSanity = async (data: CreateExperienceData) => {
  const created = await api.post<ApiExperience>('/experiences', buildCreatePayload(data));
  return toExperience(created);
};

export const getExperiences = async (
  searchParams: ExperienceSearchParams = {},
): Promise<Experience[]> => {
  const { query = '', filters = {}, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } =
    searchParams;
  const items = await api.get<ApiExperience[]>('/experiences', {
    search: query || undefined,
    category: filters.category,
    status: filters.status ? STATUS_TO_API[filters.status as Experience['status']] : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    experienceType: filters.experienceType ? TYPE_TO_API[filters.experienceType] : undefined,
    isFeatured: filters.isFeatured,
    sortBy,
    sortOrder,
    page,
    limit,
  });
  return items.map(toExperience);
};

export const getExperiencesByCompany = async (companyId: string): Promise<Experience[]> => {
  const items = await api.get<ApiExperience[]>('/experiences', { companyId, limit: 100 });
  return items.map(toExperience);
};

export const getActiveExperiencesByCompany = async (companyId: string): Promise<Experience[]> => {
  const items = await api.get<ApiExperience[]>('/experiences', {
    companyId,
    status: 'ACTIVE',
    limit: 100,
  });
  return items.map(toExperience);
};

export const getExperienceById = async (experienceId: string): Promise<Experience | null> => {
  try {
    const exp = await api.get<ApiExperience>(`/experiences/${encodeURIComponent(experienceId)}`);
    return toExperience(exp);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const updateExperienceInSanity = async (data: UpdateExperienceData) => {
  const updated = await api.patch<ApiExperience>(
    `/experiences/${encodeURIComponent(data._id)}`,
    buildUpdatePayload(data),
  );
  return toExperience(updated);
};

export const deleteExperienceInSanity = async (experienceId: string) => {
  await api.delete(`/experiences/${encodeURIComponent(experienceId)}`);
};

export const updateExperienceStatus = async (
  experienceId: string,
  status: Experience['status'],
) => {
  const updated = await api.patch<ApiExperience>(
    `/experiences/${encodeURIComponent(experienceId)}/status`,
    { status: STATUS_TO_API[status] },
  );
  return toExperience(updated);
};

export const getFeaturedExperiences = async (limit: number = 6): Promise<Experience[]> => {
  const items = await api.get<ApiExperience[]>('/experiences/featured', { limit });
  return items.map(toExperience);
};

export const getExperienceStatsByCompany = async (companyId: string) => {
  return api.get<{
    total: number;
    active: number;
    draft: number;
    pending: number;
    paused: number;
    inactive: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
  }>(`/experiences/stats/by-company/${encodeURIComponent(companyId)}`);
};
