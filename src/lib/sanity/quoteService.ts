// Reescrito sobre el API. Mismas firmas para no romper callers.
import { api } from '@/lib/api/client';
import { Experience } from '@/types';

interface SearchParams {
  companyId: string;
  date: string;
  time: string;
  guests: number;
  location?: string;
}

export interface QuoteData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventDate: string;
  eventTime: string;
  guests: number;
  location?: string;
  experiences: string[];
  notes?: string;
  companyId: string;
  hostId: string;
}

interface ApiExperienceForQuote {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  duration: number | null;
  capacity: number | null;
  minCapacity: number | null;
  basePrice: string | number | null;
  currency: string;
  experienceType: 'VIRTUAL' | 'PRESENTIAL' | 'HYBRID';
  isVirtual: boolean;
  virtualPlatform: string | null;
  presentialCity: string | null;
  presentialAddress: string | null;
  presentialLocation: string | null;
  featuredImage: string | null;
  includes: unknown;
  requirements: string | null;
  addons: unknown;
  status: string;
  company: { id: string; companyName: string };
  locations?: Array<{ id: string; name: string; address: unknown }>;
  availabilities?: Array<{ id: string; name: string; weeklySchedule: unknown; locationId: string | null }>;
}

const TYPE_FROM_API: Record<'VIRTUAL' | 'PRESENTIAL' | 'HYBRID', Experience['experienceType']> = {
  VIRTUAL: 'virtual',
  PRESENTIAL: 'presential',
  HYBRID: 'hybrid',
};

function toExperienceLite(e: ApiExperienceForQuote): Experience & { companyName?: string; availabilitySchedules?: unknown[] } {
  return {
    _id: e.id,
    _type: 'experience',
    title: e.title,
    slug: { _type: 'slug', current: '' },
    company: { _ref: e.company.id, _type: 'reference' },
    description: e.description ?? '',
    categories: (e.categories ?? []) as Experience['categories'],
    duration: e.duration ?? 0,
    capacity: e.capacity ?? 0,
    minCapacity: e.minCapacity ?? undefined,
    basePrice: typeof e.basePrice === 'string' ? Number(e.basePrice) : (e.basePrice ?? 0),
    currency: e.currency as Experience['currency'],
    featuredImage: e.featuredImage ?? undefined,
    experienceType: TYPE_FROM_API[e.experienceType],
    isVirtual: e.isVirtual,
    virtualPlatform: (e.virtualPlatform ?? undefined) as Experience['virtualPlatform'],
    presentialCity: e.presentialCity ?? undefined,
    presentialAddress: e.presentialAddress ?? undefined,
    presentialLocation: e.presentialLocation ?? undefined,
    includes: (e.includes as Experience['includes']) ?? undefined,
    requirements: e.requirements ? [e.requirements] : undefined,
    addons: (e.addons as Experience['addons']) ?? undefined,
    status: 'active',
    isFeatured: false,
    totalBookings: 0,
    totalRevenue: 0,
    createdAt: '',
    updatedAt: '',
    locations: e.locations?.map((l) => ({ _ref: l.id, _type: 'reference' as const })),
    // Campos extra que el caller usa
    companyName: e.company.companyName,
    availabilitySchedules: e.availabilities,
  };
}

export const searchExperiencesForQuote = async (params: SearchParams): Promise<Experience[]> => {
  const items = await api.get<ApiExperienceForQuote[]>('/quotes/search-experiences', {
    companyId: params.companyId,
    date: params.date,
    time: params.time,
    guests: params.guests,
    location: params.location,
  });
  return items.map(toExperienceLite);
};

export const createQuote = async (quoteData: QuoteData): Promise<{ _id: string }> => {
  const created = await api.post<{ id: string }>('/quotes', {
    customerName: quoteData.customerName,
    customerEmail: quoteData.customerEmail,
    customerPhone: quoteData.customerPhone,
    eventDate: quoteData.eventDate,
    eventTime: quoteData.eventTime,
    guests: quoteData.guests,
    location: quoteData.location,
    experiences: quoteData.experiences,
    notes: quoteData.notes,
    companyId: quoteData.companyId,
    hostId: quoteData.hostId,
  });
  return { _id: created.id };
};

interface ApiQuote {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  eventDate: string | null;
  eventTime: string | null;
  guests: number | null;
  location: string | null;
  notes: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  company: { id: string; companyName: string };
  host: { id: string; name: string | null; email: string } | null;
  experiences: Array<{ id: string; title: string; basePrice: string | number | null; currency: string }>;
}

const QUOTE_STATUS_FROM_API = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

const QUOTE_STATUS_TO_API = {
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  expired: 'EXPIRED',
} as const;

export const getQuotesByCompany = async (companyId: string) => {
  const items = await api.get<ApiQuote[]>('/quotes', { companyId });
  // Devuelve un shape similar al GROQ original (con experiences expandidas + companyName + hostName)
  return items.map((q) => ({
    _id: q.id,
    customerName: q.customerName,
    customerEmail: q.customerEmail,
    customerPhone: q.customerPhone ?? '',
    eventDate: q.eventDate,
    eventTime: q.eventTime,
    guests: q.guests,
    location: q.location ?? '',
    notes: q.notes ?? '',
    status: QUOTE_STATUS_FROM_API[q.status],
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    companyName: q.company.companyName,
    hostName: q.host?.name ?? null,
    experiences: q.experiences.map((e) => ({
      _id: e.id,
      title: e.title,
      basePrice: typeof e.basePrice === 'string' ? Number(e.basePrice) : (e.basePrice ?? 0),
      currency: e.currency,
    })),
  }));
};

export const updateQuoteStatus = async (quoteId: string, status: string) => {
  const apiStatus =
    QUOTE_STATUS_TO_API[status as keyof typeof QUOTE_STATUS_TO_API] ?? status.toUpperCase();
  return api.patch(`/quotes/${encodeURIComponent(quoteId)}/status`, { status: apiStatus });
};
