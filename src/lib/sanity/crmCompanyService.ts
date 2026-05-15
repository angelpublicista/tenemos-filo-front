// Reescrito sobre el API. Mismas firmas para no romper callers.
import { api } from '@/lib/api/client';
import {
  CRMCompany,
  CreateCRMCompanyData,
  UpdateCRMCompanyData,
  CRMCompanySearchParams,
} from '@/types';

interface ApiCrmCompany {
  id: string;
  hostCompanyId: string;
  companyName: string;
  businessName: string | null;
  companyType: string | null;
  industry: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: CRMCompany['address'] | null;
  employeeCount: string | null;
  annualRevenue: string | null;
  logo: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  tags: string[];
  socialMedia: CRMCompany['socialMedia'] | null;
  assignedToId: string | null;
  lastContactDate: string | null;
  nextFollowUp: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hostCompany?: { id: string; companyName: string };
  assignedTo?: { id: string; name: string | null };
}

function toCrmCompany(c: ApiCrmCompany): CRMCompany & { hostCompanyName?: string; assignedToName?: string } {
  return {
    _id: c.id,
    _type: 'crmCompany',
    hostCompany: { _ref: c.hostCompanyId, _type: 'reference' },
    companyName: c.companyName,
    businessName: c.businessName ?? undefined,
    companyType: (c.companyType ?? 'other') as CRMCompany['companyType'],
    industry: (c.industry ?? undefined) as CRMCompany['industry'],
    description: c.description ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    website: c.website ?? undefined,
    documentType: (c.documentType ?? undefined) as CRMCompany['documentType'],
    documentNumber: c.documentNumber ?? undefined,
    address: c.address ?? undefined,
    employeeCount: (c.employeeCount ?? undefined) as CRMCompany['employeeCount'],
    annualRevenue: (c.annualRevenue ?? undefined) as CRMCompany['annualRevenue'],
    logo: c.logo ? { asset: { _ref: c.logo, _type: 'reference' } } : undefined,
    status: (c.status ?? 'active') as CRMCompany['status'],
    source: (c.source ?? undefined) as CRMCompany['source'],
    notes: c.notes ?? undefined,
    tags: c.tags ?? [],
    socialMedia: c.socialMedia ?? undefined,
    assignedTo: c.assignedToId ? { _ref: c.assignedToId, _type: 'reference' } : undefined,
    lastContactDate: c.lastContactDate ?? undefined,
    nextFollowUp: c.nextFollowUp ?? undefined,
    isActive: c.isActive,
    deletedAt: c.deletedAt ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    hostCompanyName: c.hostCompany?.companyName,
    assignedToName: c.assignedTo?.name ?? undefined,
  };
}

function buildPayload(data: CreateCRMCompanyData | UpdateCRMCompanyData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ('hostCompany' in data && data.hostCompany !== undefined) out.hostCompany = data.hostCompany;
  if (data.companyName !== undefined) out.companyName = data.companyName;
  if (data.businessName !== undefined) out.businessName = data.businessName;
  if (data.companyType !== undefined) out.companyType = data.companyType;
  if (data.industry !== undefined) out.industry = data.industry;
  if (data.description !== undefined) out.description = data.description;
  if (data.email !== undefined) out.email = data.email;
  if (data.phone !== undefined) out.phone = data.phone;
  if (data.website !== undefined) out.website = data.website;
  if (data.documentType !== undefined) out.documentType = data.documentType;
  if (data.documentNumber !== undefined) out.documentNumber = data.documentNumber;
  if (data.address !== undefined) out.address = data.address;
  if (data.employeeCount !== undefined) out.employeeCount = data.employeeCount;
  if (data.annualRevenue !== undefined) out.annualRevenue = data.annualRevenue;
  if (data.logo !== undefined) out.logo = data.logo;
  if (data.status !== undefined) out.status = data.status;
  if (data.source !== undefined) out.source = data.source;
  if (data.notes !== undefined) out.notes = data.notes;
  if (data.tags !== undefined) out.tags = data.tags;
  if (data.socialMedia !== undefined) out.socialMedia = data.socialMedia;
  if (data.assignedTo !== undefined) out.assignedTo = data.assignedTo;
  if (data.lastContactDate !== undefined) out.lastContactDate = data.lastContactDate;
  if (data.nextFollowUp !== undefined) out.nextFollowUp = data.nextFollowUp;
  if (data.isActive !== undefined) out.isActive = data.isActive;
  return out;
}

export const createCRMCompany = async (
  companyData: CreateCRMCompanyData,
): Promise<CRMCompany> => {
  const created = await api.post<ApiCrmCompany>('/crm-companies', buildPayload(companyData));
  return toCrmCompany(created);
};

export const getCRMCompanyById = async (companyId: string): Promise<CRMCompany | null> => {
  try {
    const c = await api.get<ApiCrmCompany>(`/crm-companies/${encodeURIComponent(companyId)}`);
    return toCrmCompany(c);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const getCRMCompaniesByHost = async (
  hostCompanyId: string,
  searchParams: CRMCompanySearchParams = {},
): Promise<CRMCompany[]> => {
  const { query, filters, sortBy = 'createdAt', sortOrder = 'desc', limit = 50 } = searchParams;
  const items = await api.get<ApiCrmCompany[]>('/crm-companies', {
    hostCompanyId,
    companyType: filters?.companyType,
    status: filters?.status,
    industry: filters?.industry,
    source: filters?.source,
    assignedTo: filters?.assignedTo,
    isActive: filters?.isActive,
    search: query,
    sortBy,
    sortOrder,
    limit,
  });
  return items.map(toCrmCompany);
};

export const updateCRMCompany = async (
  companyId: string,
  updateData: UpdateCRMCompanyData,
): Promise<CRMCompany> => {
  const updated = await api.patch<ApiCrmCompany>(
    `/crm-companies/${encodeURIComponent(companyId)}`,
    buildPayload(updateData),
  );
  return toCrmCompany(updated);
};

export const deleteCRMCompany = async (companyId: string): Promise<void> => {
  await api.delete(`/crm-companies/${encodeURIComponent(companyId)}`);
};

export const restoreCRMCompany = async (companyId: string): Promise<CRMCompany> => {
  const restored = await api.post<ApiCrmCompany>(
    `/crm-companies/${encodeURIComponent(companyId)}/restore`,
  );
  return toCrmCompany(restored);
};
