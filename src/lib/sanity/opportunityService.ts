// Reescrito sobre el API. Mismas firmas para no romper callers.
import { api } from '@/lib/api/client';
import {
  Opportunity,
  CreateOpportunityData,
  UpdateOpportunityData,
  OpportunitySearchParams,
  OpportunityStage,
  OpportunityStatus,
} from '@/types';

type ApiStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'APPROVAL'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';
type ApiStatus = 'OPEN' | 'WON' | 'LOST' | 'PAUSED';

const STAGE_TO_API: Record<OpportunityStage, ApiStage> = {
  prospecting: 'PROSPECTING',
  qualification: 'QUALIFICATION',
  proposal: 'PROPOSAL',
  negotiation: 'NEGOTIATION',
  approval: 'APPROVAL',
  closed_won: 'CLOSED_WON',
  closed_lost: 'CLOSED_LOST',
};
const STAGE_FROM_API: Record<ApiStage, OpportunityStage> = {
  PROSPECTING: 'prospecting',
  QUALIFICATION: 'qualification',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  APPROVAL: 'approval',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
};
const STATUS_TO_API: Record<OpportunityStatus, ApiStatus> = {
  open: 'OPEN',
  won: 'WON',
  lost: 'LOST',
  paused: 'PAUSED',
};
const STATUS_FROM_API: Record<ApiStatus, OpportunityStatus> = {
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
  PAUSED: 'paused',
};

interface ApiOpportunity {
  id: string;
  name: string;
  hostCompanyId: string;
  crmCompanyId: string | null;
  contactId: string | null;
  stage: ApiStage;
  status: ApiStatus;
  value: string | number;
  currency: string;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  description: string | null;
  lostReason: string | null;
  lostReasonNotes: string | null;
  wonReason: string | null;
  source: string | null;
  assignedToId: string | null;
  createdById: string | null;
  notes: string | null;
  tags: string[];
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hostCompany?: { id: string; companyName: string };
  crmCompany?: { id: string; companyName: string };
  contact?: { id: string; firstName: string; lastName: string | null };
  assignedTo?: { id: string; name: string | null };
  createdBy?: { id: string; name: string | null };
  experiences?: Array<{
    id: string;
    experienceId: string;
    quantity: number;
    customPrice: string | number | null;
    notes: string | null;
    experience?: { id: string; title: string; basePrice: string | number | null; currency: string };
  }>;
  decisionMakers?: Array<{ id: string; firstName: string; lastName: string | null }>;
}

function toOpportunity(o: ApiOpportunity): Opportunity & {
  crmCompanyName?: string;
  contactName?: string;
  assignedToName?: string;
  createdByName?: string;
} {
  return {
    _id: o.id,
    _type: 'opportunity',
    name: o.name,
    hostCompany: { _ref: o.hostCompanyId, _type: 'reference' },
    crmCompany: o.crmCompanyId ? { _ref: o.crmCompanyId, _type: 'reference' } : undefined,
    contact: o.contactId ? { _ref: o.contactId, _type: 'reference' } : undefined,
    stage: STAGE_FROM_API[o.stage],
    status: STATUS_FROM_API[o.status],
    value: typeof o.value === 'string' ? Number(o.value) : o.value,
    currency: o.currency as Opportunity['currency'],
    expectedCloseDate: o.expectedCloseDate ?? undefined,
    actualCloseDate: o.actualCloseDate ?? undefined,
    description: o.description ?? undefined,
    lostReason: (o.lostReason ?? undefined) as Opportunity['lostReason'],
    lostReasonNotes: o.lostReasonNotes ?? undefined,
    wonReason: (o.wonReason ?? undefined) as Opportunity['wonReason'],
    source: (o.source ?? undefined) as Opportunity['source'],
    assignedTo: { _ref: o.assignedToId ?? '', _type: 'reference' },
    notes: o.notes ?? undefined,
    tags: o.tags ?? [],
    experiences: o.experiences?.map((e) => ({
      experience: { _ref: e.experienceId, _type: 'reference' },
      quantity: e.quantity,
      customPrice:
        e.customPrice == null
          ? undefined
          : typeof e.customPrice === 'string'
            ? Number(e.customPrice)
            : e.customPrice,
      notes: e.notes ?? undefined,
    })),
    decisionMakers: o.decisionMakers?.map((c) => ({ _ref: c.id, _type: 'reference' as const })),
    isActive: o.isActive,
    createdBy: { _ref: o.createdById ?? '', _type: 'reference' },
    deletedAt: o.deletedAt ?? undefined,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    crmCompanyName: o.crmCompany?.companyName,
    contactName: o.contact ? `${o.contact.firstName} ${o.contact.lastName ?? ''}`.trim() : undefined,
    assignedToName: o.assignedTo?.name ?? undefined,
    createdByName: o.createdBy?.name ?? undefined,
  };
}

function buildPayload(
  data: CreateOpportunityData | UpdateOpportunityData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ('hostCompany' in data && data.hostCompany !== undefined) out.hostCompany = data.hostCompany;
  if (data.name !== undefined) out.name = data.name;
  if (data.crmCompany !== undefined) out.crmCompany = data.crmCompany;
  if (data.contact !== undefined) out.contact = data.contact;
  if (data.stage !== undefined) out.stage = STAGE_TO_API[data.stage];
  if (data.status !== undefined) out.status = STATUS_TO_API[data.status];
  if (data.value !== undefined) out.value = data.value;
  if (data.currency !== undefined) out.currency = data.currency;
  if (data.expectedCloseDate !== undefined) out.expectedCloseDate = data.expectedCloseDate;
  if (data.actualCloseDate !== undefined) out.actualCloseDate = data.actualCloseDate;
  if (data.description !== undefined) out.description = data.description;
  if (data.lostReason !== undefined) out.lostReason = data.lostReason;
  if (data.lostReasonNotes !== undefined) out.lostReasonNotes = data.lostReasonNotes;
  if (data.wonReason !== undefined) out.wonReason = data.wonReason;
  if (data.source !== undefined) out.source = data.source;
  if (data.assignedTo !== undefined) out.assignedTo = data.assignedTo;
  if (data.notes !== undefined) out.notes = data.notes;
  if (data.tags !== undefined) out.tags = data.tags;
  if (data.experiences !== undefined) {
    out.experiences = data.experiences.map((e) => ({
      experience: e.experience,
      quantity: e.quantity,
      customPrice: e.customPrice,
      notes: e.notes,
    }));
  }
  if (data.decisionMakers !== undefined) out.decisionMakers = data.decisionMakers;
  if (data.isActive !== undefined) out.isActive = data.isActive;
  if ('createdBy' in data && data.createdBy !== undefined) out.createdBy = data.createdBy;
  return out;
}

export const createOpportunity = async (
  opportunityData: CreateOpportunityData,
): Promise<Opportunity> => {
  const created = await api.post<ApiOpportunity>('/opportunities', buildPayload(opportunityData));
  return toOpportunity(created);
};

export const getOpportunityById = async (
  opportunityId: string,
): Promise<Opportunity | null> => {
  try {
    const o = await api.get<ApiOpportunity>(`/opportunities/${encodeURIComponent(opportunityId)}`);
    return toOpportunity(o);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const getOpportunitiesByHost = async (
  hostCompanyId: string,
  searchParams: OpportunitySearchParams = {},
): Promise<Opportunity[]> => {
  const { query, filters, sortBy = 'createdAt', sortOrder = 'desc', limit } = searchParams;
  const items = await api.get<ApiOpportunity[]>('/opportunities', {
    hostCompanyId,
    stage: filters?.stage ? STAGE_TO_API[filters.stage as OpportunityStage] : undefined,
    status: filters?.status ? STATUS_TO_API[filters.status as OpportunityStatus] : undefined,
    source: filters?.source,
    assignedTo: filters?.assignedTo,
    crmCompany: filters?.crmCompany,
    isActive: filters?.isActive,
    search: query,
    sortBy,
    sortOrder,
    limit,
  });
  return items.map(toOpportunity);
};

export const updateOpportunity = async (
  opportunityId: string,
  updateData: UpdateOpportunityData,
): Promise<Opportunity> => {
  const updated = await api.patch<ApiOpportunity>(
    `/opportunities/${encodeURIComponent(opportunityId)}`,
    buildPayload(updateData),
  );
  return toOpportunity(updated);
};

export const deleteOpportunity = async (opportunityId: string): Promise<void> => {
  await api.delete(`/opportunities/${encodeURIComponent(opportunityId)}`);
};
