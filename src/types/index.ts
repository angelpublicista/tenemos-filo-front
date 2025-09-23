// Tipos para formularios de configuración de empresa por pasos
export interface CompanyBasicInfo {
  companyName: string;
  companyType: 'restaurant' | 'catering' | 'foodtruck' | 'other';
  description?: string;
  companyEmail: string;
  companyPhone: string;
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
  role: 'guest' | 'host' | 'admin';
  phone: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
}

export interface SanityUser {
  _id: string;
  _type: 'user';
  firebaseId: string;
  name: string;
  email: string;
  avatar?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  role: 'guest' | 'host' | 'admin';
  phone: string;
  typeDocument: 'nit' | 'cedula' | 'pasaporte' | 'other';
  documentNumber: string;
  company?: {
    _ref: string;
    _type: 'reference';
  };
  locations?: Array<{
    _ref: string;
    _type: 'reference';
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para autenticación
import { User } from 'firebase/auth';

export interface CompanySetupState {
  hasCompletedSetup: boolean;
  companyId?: string;
  lastUpdated: string;
}

export interface AuthContextType {
  user: User | null;
  sanityUser: SanityUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: Omit<CreateUserData, 'firebaseId'>) => Promise<{ user: { uid: string } }>;
  resetPassword: (email: string) => Promise<void>;
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
  category: 'cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other';
  duration: number; // minutos
  capacity: number;
  minCapacity?: number;
  basePrice: number;
  currency: 'COP' | 'USD';
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
  location?: {
    _ref: string;
    _type: 'reference';
  };
  experienceType: 'virtual' | 'presential' | 'hybrid';
  virtualPlatform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  presentialLocation?: string;
  presentialAddress?: string;
  presentialCity?: string;
  availability?: {
    days?: string[];
    timeSlots?: string[];
  };
  requirements?: string[];
  includes?: string[];
  addons?: Array<{
    _key: string;
    name: string;
    price: number;
    description?: string;
  }>;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'inactive';
  isFeatured: boolean;
  rating?: number;
  totalBookings: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos para crear/actualizar experiencias
export interface CreateExperienceData {
  title: string;
  company: string; // company ID
  description: string;
  category: 'cooking' | 'mixology' | 'tasting' | 'catering' | 'corporate' | 'celebrations' | 'workshops' | 'other';
  duration: number;
  capacity: number;
  minCapacity?: number;
  basePrice: number;
  currency: 'COP' | 'USD';
  images?: string[]; // URLs de imágenes
  location?: string; // location ID
  experienceType: 'virtual' | 'presential' | 'hybrid';
  virtualPlatform?: 'zoom' | 'google_meet' | 'teams' | 'other';
  presentialLocation?: string;
  presentialAddress?: string;
  presentialCity?: string;
  availability?: {
    days?: string[];
    timeSlots?: string[];
  };
  requirements?: string[];
  includes?: string[];
  addons?: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
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

// Tipos para reservas (futuro)
export interface Reservation {
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