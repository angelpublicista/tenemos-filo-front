// Tipos para formularios de configuración de empresa por pasos
export interface CompanyBasicInfo {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
  logo?: string;
}

export interface CompanyFiscalInfo {
  documentType: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
  businessName: string; // Razón social
  website?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

export interface CompanySizeInfo {
  employeeCount: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annualRevenue?: '0-100k' | '100k-500k' | '500k-1M' | '1M-5M' | '5M+';
  businessYears?: '0-1' | '1-3' | '3-5' | '5-10' | '10+';
}

export interface CompleteCompanyData extends CompanyBasicInfo, CompanyFiscalInfo, CompanySizeInfo {}

// Tipos para formularios de registro
export interface RegisterFormData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  terms: boolean;
}

export interface RegisterHostFormData extends RegisterFormData {
  phone: string;
}

// Tipos para formularios de login
export interface LoginFormData {
  email: string;
  password: string;
}

// Tipos para Sanity
export interface CreateUserData {
  firebaseId: string;
  name: string;
  email: string;
  /**
   * Roles auto-registrables. NO incluye 'admin': registerSchema del API solo
   * acepta HOST/GUEST/RESELLER, y permitir que alguien se registre como
   * administrador seria una escalada de privilegios.
   */
  role: 'guest' | 'host';
  phone: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
}

export interface SanityUser {
  _id: string;
  _type: 'user';
  /** @deprecated reemplazado por _id (Postgres) tras la migracion a NextAuth+API */
  firebaseId?: string;
  name: string;
  email: string;
  avatar?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  /** Espeja el enum UserRole del API (HOST | GUEST | ADMIN | RESELLER). */
  role: 'guest' | 'host' | 'admin' | 'reseller';
  phone: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
  company?: {
    _ref: string;
    _type: 'reference';
  };
  companyId?: string;
  // hasCompletedCompanySetup se maneja en localStorage, no se almacena en Sanity
  // Este campo es solo para compatibilidad de tipos, pero nunca se consulta desde Sanity
  hasCompletedCompanySetup?: boolean;
  locations?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para autenticación
// `user` ya no es Firebase User: ahora es la identidad basica desde NextAuth.
// El detalle del usuario vive en `sanityUser` (poblado desde GET /users/me).
export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface CompanySetupState {
  hasCompletedSetup: boolean;
  companyId?: string;
  lastUpdated: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  sanityUser: SanityUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: Omit<CreateUserData, 'firebaseId'>) => Promise<{ user: { uid: string } }>;
  /** Paso 1: pide al API que envie el correo con el enlace de recuperacion. */
  resetPassword: (email: string) => Promise<void>;
  /** Paso 2: canjea el token del enlace por una contrasena nueva. */
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<{ success: boolean; message: string }>;
  // Funciones de company setup
  markSetupCompleted: (companyId?: string) => void;
  clearSetupState: () => void;
  isSetupCompleted: () => boolean;
  hasCompany: () => boolean;
  companySetupState: CompanySetupState | null;
}

// Tipos para componentes
export interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Tipos para Company
export interface Company {
  _id: string;
  _type: 'company';
  companyName: string;
  slug: {
    current: string;
    _type: 'slug';
  };
  businessName?: string;
  description?: string;
  logo?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  companyEmail: string;
  companyPhone: string;
  documentType?: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber?: string;
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
  locations?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para Location
export interface Location {
  _id: string;
  _type: 'location';
  name: string;
  slug: {
    current: string;
    _type: 'slug';
  };
  company: {
    _ref: string;
    _type: 'reference';
  };
  isMain: boolean;
  description?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  capacity?: {
    minGuests?: number;
    maxGuests?: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para formularios de registro por pasos
export interface HostStep1Data {
  fname: string;
  lname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
  terms: boolean;
}

export interface HostStep2Data {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
}

export interface HostStep3Data {
  locationName: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  locationPhone?: string;
  locationEmail?: string;
  minGuests?: number;
  maxGuests?: number;
}

// Tipos para experiencias
export interface Experience {
  _id: string;
  _type: 'experience';
  title: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  company: {
    _ref: string;
    _type: 'reference';
  };
  description: string;
  categories: ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[];
  duration: number; // minutos
  capacity: number;
  minCapacity?: number;
  basePrice: number;
  currency: 'COP' | 'USD';
  featuredImage?: string; // Asset ID de Sanity para imagen destacada/portada
  gallery?: Array<{
    assetId: string;
    alt?: string;
    caption?: string;
  }>; // Array de imágenes de la galería
  images?: Array<{
    _key: string;
    _type: 'image';
    asset: {
      _ref: string;
      _type: 'reference';
    };
    hotspot?: {
      x: number;
      y: number;
      height: number;
      width: number;
    };
  }>;
  locations?: Array<{
    _ref: string;
    _type: 'reference';
    // Campos extra que el API puede expandir (la version legacy de Sanity los traia
    // via GROQ con `locations[]->{...}`). El front los lee directamente.
    _id?: string;
    name?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    isMain?: boolean;
    capacity?: { minGuests?: number; maxGuests?: number };
  }>;
  availabilities?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  // Expansion de availabilities con datos completos (heredado del GROQ original).
  availabilitySchedules?: AvailabilitySchedule[];
  experienceType: 'virtual' | 'presential' | 'hybrid';
  isVirtual?: boolean;
  virtualPlatform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  presentialLocation?: string;
  presentialAddress?: string;
  presentialCity?: string;
  hideAddress?: boolean;
  requirements?: string[];
  includes?: string[];
  addons?: Array<{
    _key: string;
    name: string;
    price: number;
    priceType: 'per_person' | 'total';
    description?: string;
  }>;
  startDate?: string;   // ISO date string (YYYY-MM-DD), opcional
  endDate?: string;     // ISO date string (YYYY-MM-DD), opcional
  startTime?: string;   // HH:mm, opcional
  endTime?: string;     // HH:mm, opcional
  status: 'draft' | 'pending' | 'active' | 'paused' | 'inactive';
  isFeatured: boolean;
  rating?: number;
  totalBookings: number;
  totalRevenue: number;
  reservations?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  createdAt: string;
  updatedAt: string;
}

// Tipos para crear/actualizar experiencias
export interface CreateExperienceData {
  title: string;
  company: string; // company ID
  description: string;
  categories: ('cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other')[];
  duration: number;
  capacity: number;
  minCapacity?: number;
  basePrice: number;
  currency: 'COP' | 'USD';
  images?: string[]; // URLs de imágenes (deprecated - usar featuredImage y gallery)
  featuredImage?: string; // Asset ID de Sanity para imagen destacada/portada
  gallery?: Array<{
    assetId: string;
    alt?: string;
    caption?: string;
  }>; // Array de imágenes de la galería
  locations?: string[]; // Array de location IDs (múltiples sedes)
  availabilities?: string[]; // Array de IDs de calendarios de disponibilidad (múltiples calendarios)
  experienceType: 'virtual' | 'presential' | 'hybrid';
  isVirtual?: boolean;
  virtualPlatform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  presentialLocation?: string;
  presentialAddress?: string;
  presentialCity?: string;
  hideAddress?: boolean;
  requirements?: string[];
  includes?: string[];
  addons?: Array<{
    name: string;
    price: number;
    priceType: 'per_person' | 'total';
    description?: string;
  }>;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  status?: 'draft' | 'pending' | 'active' | 'paused' | 'inactive';
  isFeatured?: boolean;
}

export interface UpdateExperienceData extends Partial<CreateExperienceData> {
  _id: string;
}

// Tipos para filtros y búsqueda
export interface ExperienceFilters {
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  experienceType?: 'virtual' | 'presential' | 'hybrid';
  isFeatured?: boolean;
}

export interface ExperienceSearchParams {
  query?: string;
  filters?: ExperienceFilters;
  sortBy?: 'title' | 'price' | 'rating' | 'createdAt' | 'totalBookings';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para reservas (futuro) - DEPRECATED
export interface OldReservation {
  _id: string;
  _type: 'reservation';
  eventId: string;
  guestId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Tipos para formularios de registro por pasos del comensal
export interface GuestStep1Data {
  fname: string;
  lname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
  terms: boolean;
}

export interface GuestStep2Data {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other' | null;
  companyEmail: string;
  companyPhone: string;
  jobTitle?: string;
  department?: string;
}

export interface GuestStep3Data {
  jobTitle?: string;
  department?: string;
}

// Tipos para reservas
export interface ReservationClient {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  contactPerson?: string;
  notes?: string;
}

export interface ReservationPricing {
  basePrice: number;
  subtotal: number;
  addons?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  addonsTotal?: number;
  discount?: number;
  discountCode?: string;
  tax?: number;
  commission?: number;
  total: number;
  hostEarnings?: number;
}

export interface ReservationPaymentDetails {
  advancePayment?: number;
  advancePaymentDate?: string;
  remainingAmount?: number;
  dueDate?: string;
  paymentReference?: string;
}

export interface ReservationVirtualDetails {
  platform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  meetingLink?: string;
  meetingId?: string;
  password?: string;
}

export interface ReservationCancellation {
  cancelledAt?: string;
  cancelledBy?: 'client' | 'host' | 'system';
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'processed' | 'completed' | 'failed';
}

export interface ReservationRescheduling {
  originalDate?: string;
  newDate?: string;
  reason?: string;
  requestedBy?: 'client' | 'host';
}

export interface ReservationRating {
  score?: number;
  comment?: string;
  ratedAt?: string;
}

export interface Reservation {
  _id: string;
  _type: 'reservation';
  reservationNumber: string;
  experience: {
    _id: string;
    title: string;
    category: string;
    duration: number;
    capacity: number;
  };
  company: {
    _id: string;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
  };
  client?: ReservationClient;
  clientInfo?: ReservationClient;
  clientType?: 'guest' | 'registered';
  reservationDate: string;
  duration: number;
  participants: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  pricing: ReservationPricing;
  paymentMethod?: 'advance' | 'deferred' | 'corporate_credit' | 'cash';
  paymentDetails?: ReservationPaymentDetails;
  location?: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  isVirtual?: boolean;
  virtualDetails?: ReservationVirtualDetails;
  specialRequirements?: string;
  cancellation?: ReservationCancellation;
  rescheduling?: ReservationRescheduling;
  rating?: ReservationRating;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationData {
  experience: string;
  company: string;
  client: ReservationClient;
  reservationDate: string;
  duration: number;
  participants: number;
  status?: Reservation['status'];
  paymentStatus?: Reservation['paymentStatus'];
  pricing: ReservationPricing;
  paymentMethod?: Reservation['paymentMethod'];
  paymentDetails?: ReservationPaymentDetails;
  location?: string;
  isVirtual?: boolean;
  virtualDetails?: ReservationVirtualDetails;
  specialRequirements?: string;
  notes?: string;
}

export interface UpdateReservationData extends Partial<CreateReservationData> {
  _id: string;
}

export interface ReservationFilters {
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  experience?: string;
  isVirtual?: boolean;
}

export interface ReservationSearchParams {
  query?: string;
  filters?: ReservationFilters;
  sortBy?: 'reservationDate' | 'createdAt' | 'total' | 'participants';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Integration types
export interface Integration {
  _id: string;
  userId: string;
  type: 'google' | 'outlook' | 'zoho';
  name: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  lastSync?: string;
  config?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    calendarId?: string;
    webhookUrl?: string;
    autoSync?: boolean;
    syncFrequency?: 'realtime' | '15min' | 'hourly' | 'daily';
    events?: IntegrationEvent[];
    [key: string]: unknown;
  };
  error?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface IntegrationEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
  sourceCalendar: string;
  lastModified: string;
}

export interface CreateIntegrationData {
  userId: string;
  type: 'google' | 'outlook' | 'zoho';
  name: string;
  status?: 'connected' | 'disconnected' | 'pending' | 'error';
  config?: Integration['config'];
}

export interface UpdateIntegrationData {
  name?: string;
  status?: 'connected' | 'disconnected' | 'pending' | 'error';
  config?: Integration['config'];
  lastSync?: string;
  error?: string;
}

export interface IntegrationSyncJob {
  id: string;
  integrationId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  eventsProcessed?: number;
  eventsCreated?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
  error?: string;
}

// Tipos para disponibilidad
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  startTime: string; // formato HH:mm (24h)
  endTime: string; // formato HH:mm (24h)
}

export interface DaySchedule {
  isActive: boolean; // Si el día está activo o no
  timeSlots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface BlockedDate {
  date: string; // formato ISO date
  reason?: 'maintenance' | 'vacation' | 'private_event' | 'other';
  description?: string;
}

export interface AvailabilitySchedule {
  _id: string;
  _type: 'availability';
  name: string; // Nombre del calendario (ej: "Horario Verano 2025")
  location?: {
    _ref: string;
    _type: 'reference';
  };
  experience?: {
    _ref: string;
    _type: 'reference';
  };
  isMain: boolean; // Si es el calendario principal de la sede/experiencia
  isActive: boolean; // Si este calendario está activo
  description?: string;
  weeklySchedule: WeeklySchedule;
  bufferTime: number; // Tiempo de buffer entre reservas (minutos)
  minimumNotice: number; // Aviso mínimo para reservas (horas)
  notes?: string;
  blockedDates: BlockedDate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityScheduleData {
  name: string;
  location?: string; // location ID (opcional si se usa experience)
  experience?: string; // experience ID (opcional si se usa location)
  isMain?: boolean;
  isActive?: boolean;
  description?: string;
  weeklySchedule: WeeklySchedule;
  bufferTime?: number;
  minimumNotice?: number;
  notes?: string;
  blockedDates?: BlockedDate[];
}

export interface UpdateAvailabilityScheduleData extends Partial<CreateAvailabilityScheduleData> {
  _id: string;
}

// Tipos para CRM Company
export type CRMCompanyType = 'customer' | 'supplier' | 'other';
export type CRMCompanyStatus = 'active' | 'inactive' | 'qualified' | 'unqualified' | 'closed';
export type CRMCompanySource = 'web' | 'referral' | 'social' | 'email' | 'event' | 'cold_call' | 'other';
export type CRMCompanyIndustry = 
  | 'restaurants' | 'hospitality' | 'events' | 'retail' | 'technology' | 'services' 
  | 'manufacturing' | 'construction' | 'healthcare' | 'education' | 'finance' | 'real_estate'
  | 'transport' | 'media' | 'energy' | 'agriculture' | 'tourism' | 'sports' | 'fashion'
  | 'automotive' | 'pharmaceutical' | 'consulting' | 'marketing' | 'legal' | 'nonprofit'
  | 'government' | 'other';

export interface CRMCompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface CRMCompanySocialMedia {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface CRMCompany {
  _id: string;
  _type: 'crmCompany';
  hostCompany: {
    _ref: string;
    _type: 'reference';
  };
  companyName: string;
  businessName?: string;
  companyType: CRMCompanyType;
  industry?: CRMCompanyIndustry;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  documentType?: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber?: string;
  address?: CRMCompanyAddress;
  employeeCount?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annualRevenue?: '0-100k' | '100k-500k' | '500k-1M' | '1M-5M' | '5M+';
  logo?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  status: CRMCompanyStatus;
  source?: CRMCompanySource;
  notes?: string;
  tags?: string[];
  socialMedia?: CRMCompanySocialMedia;
  assignedTo?: {
    _ref: string;
    _type: 'reference';
  };
  lastContactDate?: string;
  nextFollowUp?: string;
  isActive: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCRMCompanyData {
  hostCompany: string; // company ID
  companyName: string;
  businessName?: string;
  companyType: CRMCompanyType;
  industry?: CRMCompanyIndustry;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  documentType?: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber?: string;
  address?: CRMCompanyAddress;
  employeeCount?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annualRevenue?: '0-100k' | '100k-500k' | '500k-1M' | '1M-5M' | '5M+';
  logo?: string; // Asset ID
  status?: CRMCompanyStatus;
  source?: CRMCompanySource;
  notes?: string;
  tags?: string[];
  socialMedia?: CRMCompanySocialMedia;
  assignedTo?: string; // user ID
  lastContactDate?: string;
  nextFollowUp?: string;
  isActive?: boolean;
}

export interface UpdateCRMCompanyData extends Partial<CreateCRMCompanyData> {
  _id: string;
}

export interface CRMCompanyFilters {
  companyType?: CRMCompanyType;
  status?: CRMCompanyStatus;
  industry?: CRMCompanyIndustry;
  source?: CRMCompanySource;
  assignedTo?: string;
  isActive?: boolean;
}

export interface CRMCompanySearchParams {
  query?: string;
  filters?: CRMCompanyFilters;
  sortBy?: 'companyName' | 'createdAt' | 'lastContactDate' | 'nextFollowUp';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para CRM Contact
export type ContactType = 'customer' | 'supplier' | 'other';
export type ContactStatus = 'active' | 'inactive' | 'qualified' | 'unqualified';
export type ContactSource = 'web' | 'referral' | 'social' | 'email' | 'event' | 'cold_call' | 'other';

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ContactSocialMedia {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface Contact {
  _id: string;
  _type: 'contact';
  hostCompany: {
    _ref: string;
    _type: 'reference';
  };
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  company?: {
    _ref: string;
    _type: 'reference';
  };
  contactType: ContactType;
  status: ContactStatus;
  source?: ContactSource;
  address?: ContactAddress;
  avatar?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  notes?: string;
  tags?: string[];
  socialMedia?: ContactSocialMedia;
  assignedTo?: {
    _ref: string;
    _type: 'reference';
  };
  lastContactDate?: string;
  nextFollowUp?: string;
  isActive: boolean;
  createdBy: {
    _ref: string;
    _type: 'reference';
  };
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Campos expandidos desde referencias (opcionales)
  companyName?: string;
  hostCompanyName?: string;
  assignedToName?: string;
  createdByName?: string;
}

export interface CreateContactData {
  hostCompany: string; // company ID
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  company?: string; // crmCompany ID
  contactType: ContactType;
  status?: ContactStatus;
  source?: ContactSource;
  address?: ContactAddress;
  avatar?: string; // Asset ID
  notes?: string;
  tags?: string[];
  socialMedia?: ContactSocialMedia;
  assignedTo?: string; // user ID
  lastContactDate?: string;
  nextFollowUp?: string;
  isActive?: boolean;
  createdBy: string; // user ID
}

export interface UpdateContactData extends Partial<CreateContactData> {
  _id: string;
}

export interface ContactFilters {
  contactType?: ContactType;
  status?: ContactStatus;
  source?: ContactSource;
  company?: string; // crmCompany ID
  assignedTo?: string; // user ID
  isActive?: boolean;
}

export interface ContactSearchParams {
  query?: string;
  filters?: ContactFilters;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'lastContactDate' | 'nextFollowUp';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para CRM Opportunity
export type OpportunityStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'approval' | 'closed_won' | 'closed_lost';
export type OpportunityStatus = 'open' | 'won' | 'lost' | 'paused';
export type OpportunitySource = 'web' | 'referral' | 'social' | 'email' | 'event' | 'cold_call' | 'existing_contact' | 'other';
export type LostReason = 'price' | 'competition' | 'no_budget' | 'no_need' | 'timing' | 'other';
export type WonReason = 'best_price' | 'best_proposal' | 'existing_relationship' | 'best_product' | 'other';

export interface OpportunityExperience {
  experience: {
    _ref: string;
    _type: 'reference';
  };
  quantity: number;
  customPrice?: number;
  notes?: string;
}

export interface Opportunity {
  _id: string;
  _type: 'opportunity';
  name: string;
  hostCompany: {
    _ref: string;
    _type: 'reference';
  };
  crmCompany?: {
    _ref: string;
    _type: 'reference';
  };
  contact?: {
    _ref: string;
    _type: 'reference';
  };
  stage: OpportunityStage;
  status: OpportunityStatus;
  value?: number;
  currency: 'COP' | 'USD';
  expectedCloseDate?: string;
  actualCloseDate?: string;
  description?: string;
  lostReason?: LostReason;
  lostReasonNotes?: string;
  wonReason?: WonReason;
  source?: OpportunitySource;
  assignedTo: {
    _ref: string;
    _type: 'reference';
  };
  notes?: string;
  tags?: string[];
  experiences?: OpportunityExperience[];
  decisionMakers?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  isActive: boolean;
  createdBy: {
    _ref: string;
    _type: 'reference';
  };
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityData {
  name: string;
  hostCompany: string; // company ID
  crmCompany?: string; // crmCompany ID
  contact?: string; // contact ID
  stage: OpportunityStage;
  status?: OpportunityStatus;
  value?: number;
  currency?: 'COP' | 'USD';
  expectedCloseDate?: string;
  actualCloseDate?: string;
  description?: string;
  lostReason?: LostReason;
  lostReasonNotes?: string;
  wonReason?: WonReason;
  source?: OpportunitySource;
  assignedTo: string; // user ID
  notes?: string;
  tags?: string[];
  experiences?: Array<{
    experience: string; // experience ID
    quantity: number;
    customPrice?: number;
    notes?: string;
  }>;
  decisionMakers?: string[]; // contact IDs
  isActive?: boolean;
  createdBy: string; // user ID
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> {
  _id: string;
}

export interface OpportunityFilters {
  stage?: OpportunityStage;
  status?: OpportunityStatus;
  source?: OpportunitySource;
  assignedTo?: string;
  crmCompany?: string;
  isActive?: boolean;
}

export interface OpportunitySearchParams {
  query?: string;
  filters?: OpportunityFilters;
  sortBy?: 'name' | 'value' | 'stage' | 'status' | 'expectedCloseDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ─── Notificaciones ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_reservation'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_rescheduled'
  | 'payment_received'
  | 'review_received'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: { seconds: number; nanoseconds: number }; // Firestore Timestamp (serialized)
  data?: {
    reservationId?: string;
    experienceId?: string;
    [key: string]: unknown;
  };
} 