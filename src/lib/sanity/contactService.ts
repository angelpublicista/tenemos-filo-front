// Reescrito sobre el API. Mismas firmas para no romper callers.
import { api } from '@/lib/api/client';
import {
  Contact,
  CreateContactData,
  UpdateContactData,
  ContactSearchParams,
  ContactStatus,
} from '@/types';

type ApiStatus = 'ACTIVE' | 'INACTIVE' | 'QUALIFIED' | 'UNQUALIFIED' | 'ARCHIVED';

const STATUS_TO_API: Record<ContactStatus, ApiStatus> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  qualified: 'QUALIFIED',
  unqualified: 'UNQUALIFIED',
};
const STATUS_FROM_API: Record<ApiStatus, ContactStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  QUALIFIED: 'qualified',
  UNQUALIFIED: 'unqualified',
  ARCHIVED: 'inactive', // mapeo: ARCHIVED -> 'inactive' al exponer al front
};

interface ApiContact {
  id: string;
  hostCompanyId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  jobTitle: string | null;
  department: string | null;
  crmCompanyId: string | null;
  contactType: string | null;
  status: ApiStatus;
  source: string | null;
  address: Contact['address'] | null;
  avatar: string | null;
  notes: string | null;
  tags: string[];
  socialMedia: Contact['socialMedia'] | null;
  assignedToId: string | null;
  createdById: string | null;
  lastContactDate: string | null;
  nextFollowUp: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hostCompany?: { id: string; companyName: string };
  crmCompany?: { id: string; companyName: string };
  assignedTo?: { id: string; name: string | null };
  createdBy?: { id: string; name: string | null };
}

function toContact(c: ApiContact): Contact {
  return {
    _id: c.id,
    _type: 'contact',
    hostCompany: { _ref: c.hostCompanyId, _type: 'reference' },
    firstName: c.firstName,
    lastName: c.lastName ?? '',
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    mobile: c.mobile ?? undefined,
    jobTitle: c.jobTitle ?? undefined,
    department: c.department ?? undefined,
    company: c.crmCompanyId ? { _ref: c.crmCompanyId, _type: 'reference' } : undefined,
    contactType: (c.contactType ?? 'other') as Contact['contactType'],
    status: STATUS_FROM_API[c.status],
    source: (c.source ?? undefined) as Contact['source'],
    address: c.address ?? undefined,
    avatar: c.avatar ? { asset: { _ref: c.avatar, _type: 'reference' } } : undefined,
    notes: c.notes ?? undefined,
    tags: c.tags ?? [],
    socialMedia: c.socialMedia ?? undefined,
    assignedTo: c.assignedToId ? { _ref: c.assignedToId, _type: 'reference' } : undefined,
    lastContactDate: c.lastContactDate ?? undefined,
    nextFollowUp: c.nextFollowUp ?? undefined,
    isActive: c.isActive,
    createdBy: { _ref: c.createdById ?? '', _type: 'reference' },
    deletedAt: c.deletedAt ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    // Campos expandidos
    companyName: c.crmCompany?.companyName,
    hostCompanyName: c.hostCompany?.companyName,
    assignedToName: c.assignedTo?.name ?? undefined,
    createdByName: c.createdBy?.name ?? undefined,
  };
}

function buildCreatePayload(data: CreateContactData): Record<string, unknown> {
  return {
    hostCompany: data.hostCompany,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    mobile: data.mobile,
    jobTitle: data.jobTitle,
    department: data.department,
    company: data.company,
    contactType: data.contactType,
    status: data.status ? STATUS_TO_API[data.status] : undefined,
    source: data.source,
    address: data.address,
    avatar: data.avatar,
    notes: data.notes,
    tags: data.tags,
    socialMedia: data.socialMedia,
    assignedTo: data.assignedTo,
    createdBy: data.createdBy,
    lastContactDate: data.lastContactDate,
    nextFollowUp: data.nextFollowUp,
    isActive: data.isActive,
  };
}

function buildUpdatePayload(data: UpdateContactData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.firstName !== undefined) out.firstName = data.firstName;
  if (data.lastName !== undefined) out.lastName = data.lastName;
  if (data.email !== undefined) out.email = data.email;
  if (data.phone !== undefined) out.phone = data.phone;
  if (data.mobile !== undefined) out.mobile = data.mobile;
  if (data.jobTitle !== undefined) out.jobTitle = data.jobTitle;
  if (data.department !== undefined) out.department = data.department;
  if (data.company !== undefined) out.company = data.company;
  if (data.contactType !== undefined) out.contactType = data.contactType;
  if (data.status !== undefined) out.status = STATUS_TO_API[data.status];
  if (data.source !== undefined) out.source = data.source;
  if (data.address !== undefined) out.address = data.address;
  if (data.avatar !== undefined) out.avatar = data.avatar;
  if (data.notes !== undefined) out.notes = data.notes;
  if (data.tags !== undefined) out.tags = data.tags;
  if (data.socialMedia !== undefined) out.socialMedia = data.socialMedia;
  if (data.assignedTo !== undefined) out.assignedTo = data.assignedTo;
  if (data.lastContactDate !== undefined) out.lastContactDate = data.lastContactDate;
  if (data.nextFollowUp !== undefined) out.nextFollowUp = data.nextFollowUp;
  if (data.isActive !== undefined) out.isActive = data.isActive;
  return out;
}

export const createContact = async (contactData: CreateContactData): Promise<Contact> => {
  const created = await api.post<ApiContact>('/contacts', buildCreatePayload(contactData));
  return toContact(created);
};

export const getContactById = async (contactId: string): Promise<Contact | null> => {
  try {
    const c = await api.get<ApiContact>(`/contacts/${encodeURIComponent(contactId)}`);
    return toContact(c);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const getContactsByHost = async (
  hostCompanyId: string,
  searchParams: ContactSearchParams = {},
): Promise<Contact[]> => {
  const { query, filters, sortBy = 'createdAt', sortOrder = 'desc', limit = 50 } = searchParams;
  const items = await api.get<ApiContact[]>('/contacts', {
    hostCompanyId,
    contactType: filters?.contactType,
    status: filters?.status ? STATUS_TO_API[filters.status as ContactStatus] : undefined,
    source: filters?.source,
    company: filters?.company,
    assignedTo: filters?.assignedTo,
    isActive: filters?.isActive,
    search: query,
    sortBy,
    sortOrder,
    limit,
  });
  return items.map(toContact);
};

export const updateContact = async (
  contactId: string,
  updateData: UpdateContactData,
): Promise<Contact> => {
  const updated = await api.patch<ApiContact>(
    `/contacts/${encodeURIComponent(contactId)}`,
    buildUpdatePayload(updateData),
  );
  return toContact(updated);
};

export const deleteContact = async (contactId: string): Promise<void> => {
  await api.delete(`/contacts/${encodeURIComponent(contactId)}`);
};

export const restoreContact = async (contactId: string): Promise<Contact> => {
  const restored = await api.post<ApiContact>(`/contacts/${encodeURIComponent(contactId)}/restore`);
  return toContact(restored);
};
