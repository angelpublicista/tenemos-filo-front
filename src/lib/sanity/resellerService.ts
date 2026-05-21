// Servicio mockeado para el flujo de revendedor (HOST/RESELLER).
// El backend todavia no tiene endpoints de reventa: cuando existan, reemplazar
// los mocks por llamadas a api.get/post (ver patron en dashboardService.ts).

export interface ResaleCatalogItem {
  id: string;
  title: string;
  hostCompanyName: string;
  hostCompanyId: string;
  category: string;
  description: string;
  basePrice: number;
  currency: 'COP' | 'USD';
  commissionPercent: number;
  duration: number; // minutos
  capacity: number;
  city: string;
  experienceType: 'virtual' | 'presential' | 'hybrid';
  featuredImage?: string;
  rating?: number;
  totalBookings: number;
}

export type ResaleStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Resale {
  id: string;
  resaleNumber: string;
  experienceId: string;
  experienceTitle: string;
  hostCompanyName: string;
  clientName: string;
  clientEmail: string;
  resaleDate: string; // ISO
  reservationDate: string; // ISO
  participants: number;
  basePrice: number;
  total: number;
  commissionPercent: number;
  commissionAmount: number;
  currency: 'COP' | 'USD';
  status: ResaleStatus;
  resaleLinkCode?: string;
}

export interface ResaleLink {
  id: string;
  code: string;
  experienceId: string;
  experienceTitle: string;
  hostCompanyName: string;
  basePrice: number;
  commissionPercent: number;
  currency: 'COP' | 'USD';
  url: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
  createdAt: string;
}

export interface ResellerStats {
  activeLinks: number;
  monthlyResales: number;
  monthlyCommission: number;
  totalCommission: number;
  growth: number; // porcentaje vs mes anterior
  pendingResales: number;
  conversionRate: number; // 0..1
}

export interface RecentResellerActivity {
  id: string;
  type: 'resale' | 'commission' | 'link';
  title: string;
  description: string;
  timestamp: string;
  time: string;
}

// ─── Mocks ────────────────────────────────────────────────────────────────

const MOCK_CATALOG: ResaleCatalogItem[] = [
  {
    id: 'exp-001',
    title: 'Taller de Pasta Italiana Artesanal',
    hostCompanyName: 'Cocina Nonna',
    hostCompanyId: 'host-1',
    category: 'cooking',
    description:
      'Aprende a hacer pasta fresca desde cero con un chef italiano. Incluye degustacion y maridaje con vino.',
    basePrice: 180000,
    currency: 'COP',
    commissionPercent: 15,
    duration: 180,
    capacity: 12,
    city: 'Bogota',
    experienceType: 'presential',
    rating: 4.8,
    totalBookings: 124,
  },
  {
    id: 'exp-002',
    title: 'Cata de Vinos Premium',
    hostCompanyName: 'Filo Sommelier',
    hostCompanyId: 'host-2',
    category: 'tasting',
    description:
      'Recorrido por 6 vinos seleccionados de Chile, Argentina y Espana con un sommelier certificado.',
    basePrice: 250000,
    currency: 'COP',
    commissionPercent: 18,
    duration: 120,
    capacity: 20,
    city: 'Medellin',
    experienceType: 'presential',
    rating: 4.9,
    totalBookings: 87,
  },
  {
    id: 'exp-003',
    title: 'Mixologia Tropical en Casa (Virtual)',
    hostCompanyName: 'Barra Movil',
    hostCompanyId: 'host-3',
    category: 'mixology',
    description:
      'Clase virtual en vivo donde aprenderas a preparar 4 cocteles caribenos. Kit de insumos enviado a domicilio.',
    basePrice: 145000,
    currency: 'COP',
    commissionPercent: 20,
    duration: 90,
    capacity: 30,
    city: 'Nacional',
    experienceType: 'virtual',
    rating: 4.7,
    totalBookings: 203,
  },
  {
    id: 'exp-004',
    title: 'Cena Maridada de 5 Tiempos',
    hostCompanyName: 'Restaurante Aura',
    hostCompanyId: 'host-4',
    category: 'tasting',
    description:
      'Menu degustacion de autor con maridaje incluido. Experiencia gastronomica de alto nivel.',
    basePrice: 420000,
    currency: 'COP',
    commissionPercent: 12,
    duration: 150,
    capacity: 8,
    city: 'Bogota',
    experienceType: 'presential',
    rating: 5.0,
    totalBookings: 58,
  },
  {
    id: 'exp-005',
    title: 'Catering Corporativo - Almuerzo Ejecutivo',
    hostCompanyName: 'Filo Catering',
    hostCompanyId: 'host-5',
    category: 'catering',
    description:
      'Catering para eventos empresariales con menu de 3 tiempos. Cotizacion personalizada segun aforo.',
    basePrice: 65000,
    currency: 'COP',
    commissionPercent: 10,
    duration: 240,
    capacity: 100,
    city: 'Bogota',
    experienceType: 'presential',
    rating: 4.6,
    totalBookings: 312,
  },
  {
    id: 'exp-006',
    title: 'Workshop de Panaderia Sourdough',
    hostCompanyName: 'Cocina Nonna',
    hostCompanyId: 'host-1',
    category: 'workshops',
    description:
      'Aprende a hacer pan de masa madre en un taller intensivo de 4 horas. Te llevas tu propio cultivo.',
    basePrice: 220000,
    currency: 'COP',
    commissionPercent: 16,
    duration: 240,
    capacity: 10,
    city: 'Bogota',
    experienceType: 'presential',
    rating: 4.9,
    totalBookings: 67,
  },
];

const MOCK_RESALES: Resale[] = [
  {
    id: 'rs-001',
    resaleNumber: 'RV-2026-0042',
    experienceId: 'exp-001',
    experienceTitle: 'Taller de Pasta Italiana Artesanal',
    hostCompanyName: 'Cocina Nonna',
    clientName: 'Maria Lopez',
    clientEmail: 'maria.lopez@empresa.com',
    resaleDate: '2026-05-14T10:23:00.000Z',
    reservationDate: '2026-06-08T18:00:00.000Z',
    participants: 6,
    basePrice: 180000,
    total: 1080000,
    commissionPercent: 15,
    commissionAmount: 162000,
    currency: 'COP',
    status: 'confirmed',
    resaleLinkCode: 'PASTA-MAY',
  },
  {
    id: 'rs-002',
    resaleNumber: 'RV-2026-0041',
    experienceId: 'exp-003',
    experienceTitle: 'Mixologia Tropical en Casa (Virtual)',
    hostCompanyName: 'Barra Movil',
    clientName: 'Equipo Marketing Acme',
    clientEmail: 'eventos@acme.co',
    resaleDate: '2026-05-12T16:00:00.000Z',
    reservationDate: '2026-05-22T19:00:00.000Z',
    participants: 12,
    basePrice: 145000,
    total: 1740000,
    commissionPercent: 20,
    commissionAmount: 348000,
    currency: 'COP',
    status: 'completed',
    resaleLinkCode: 'MIXOLOGY-Q2',
  },
  {
    id: 'rs-003',
    resaleNumber: 'RV-2026-0040',
    experienceId: 'exp-005',
    experienceTitle: 'Catering Corporativo - Almuerzo Ejecutivo',
    hostCompanyName: 'Filo Catering',
    clientName: 'Industrias Bolivar S.A.',
    clientEmail: 'compras@bolivar.co',
    resaleDate: '2026-05-08T09:15:00.000Z',
    reservationDate: '2026-05-30T12:00:00.000Z',
    participants: 45,
    basePrice: 65000,
    total: 2925000,
    commissionPercent: 10,
    commissionAmount: 292500,
    currency: 'COP',
    status: 'pending',
    resaleLinkCode: 'CATERING-CORP',
  },
  {
    id: 'rs-004',
    resaleNumber: 'RV-2026-0039',
    experienceId: 'exp-002',
    experienceTitle: 'Cata de Vinos Premium',
    hostCompanyName: 'Filo Sommelier',
    clientName: 'Carlos Mendoza',
    clientEmail: 'carlos.m@gmail.com',
    resaleDate: '2026-05-02T20:45:00.000Z',
    reservationDate: '2026-05-15T19:00:00.000Z',
    participants: 4,
    basePrice: 250000,
    total: 1000000,
    commissionPercent: 18,
    commissionAmount: 180000,
    currency: 'COP',
    status: 'completed',
  },
  {
    id: 'rs-005',
    resaleNumber: 'RV-2026-0038',
    experienceId: 'exp-006',
    experienceTitle: 'Workshop de Panaderia Sourdough',
    hostCompanyName: 'Cocina Nonna',
    clientName: 'Laura Restrepo',
    clientEmail: 'laura.r@gmail.com',
    resaleDate: '2026-04-28T11:00:00.000Z',
    reservationDate: '2026-05-18T09:00:00.000Z',
    participants: 2,
    basePrice: 220000,
    total: 440000,
    commissionPercent: 16,
    commissionAmount: 70400,
    currency: 'COP',
    status: 'cancelled',
  },
];

const MOCK_LINKS: ResaleLink[] = [
  {
    id: 'lnk-001',
    code: 'PASTA-MAY',
    experienceId: 'exp-001',
    experienceTitle: 'Taller de Pasta Italiana Artesanal',
    hostCompanyName: 'Cocina Nonna',
    basePrice: 180000,
    commissionPercent: 15,
    currency: 'COP',
    url: 'https://tenemosfilo.com/book/exp-001?ref=PASTA-MAY',
    clicks: 142,
    conversions: 8,
    isActive: true,
    createdAt: '2026-04-20T14:00:00.000Z',
  },
  {
    id: 'lnk-002',
    code: 'MIXOLOGY-Q2',
    experienceId: 'exp-003',
    experienceTitle: 'Mixologia Tropical en Casa (Virtual)',
    hostCompanyName: 'Barra Movil',
    basePrice: 145000,
    commissionPercent: 20,
    currency: 'COP',
    url: 'https://tenemosfilo.com/book/exp-003?ref=MIXOLOGY-Q2',
    clicks: 87,
    conversions: 5,
    isActive: true,
    createdAt: '2026-04-10T10:30:00.000Z',
  },
  {
    id: 'lnk-003',
    code: 'CATERING-CORP',
    experienceId: 'exp-005',
    experienceTitle: 'Catering Corporativo - Almuerzo Ejecutivo',
    hostCompanyName: 'Filo Catering',
    basePrice: 65000,
    commissionPercent: 10,
    currency: 'COP',
    url: 'https://tenemosfilo.com/book/exp-005?ref=CATERING-CORP',
    clicks: 34,
    conversions: 3,
    isActive: true,
    createdAt: '2026-04-02T08:00:00.000Z',
  },
  {
    id: 'lnk-004',
    code: 'WINE-PROMO',
    experienceId: 'exp-002',
    experienceTitle: 'Cata de Vinos Premium',
    hostCompanyName: 'Filo Sommelier',
    basePrice: 250000,
    commissionPercent: 18,
    currency: 'COP',
    url: 'https://tenemosfilo.com/book/exp-002?ref=WINE-PROMO',
    clicks: 21,
    conversions: 0,
    isActive: false,
    createdAt: '2026-03-18T12:30:00.000Z',
  },
];

function simulateDelay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ─── API publica del servicio (manten firma similar a los demas services) ────

export const getResellerCatalog = async (filters?: {
  category?: string;
  experienceType?: 'virtual' | 'presential' | 'hybrid';
  query?: string;
}): Promise<ResaleCatalogItem[]> => {
  let items = [...MOCK_CATALOG];
  if (filters?.category && filters.category !== 'all') {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters?.experienceType) {
    items = items.filter((i) => i.experienceType === filters.experienceType);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.hostCompanyName.toLowerCase().includes(q),
    );
  }
  return simulateDelay(items);
};

export const getResales = async (filters?: {
  status?: ResaleStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}): Promise<Resale[]> => {
  let items = [...MOCK_RESALES];
  if (filters?.status && filters.status !== 'all') {
    items = items.filter((r) => r.status === filters.status);
  }
  if (filters?.dateFrom) {
    items = items.filter((r) => r.resaleDate >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    items = items.filter((r) => r.resaleDate <= filters.dateTo!);
  }
  return simulateDelay(items);
};

export const getResaleLinks = async (): Promise<ResaleLink[]> => {
  return simulateDelay([...MOCK_LINKS]);
};

export const getResellerStats = async (): Promise<ResellerStats> => {
  const monthly = MOCK_RESALES.filter((r) => {
    const d = new Date(r.resaleDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyCommission = monthly
    .filter((r) => r.status !== 'cancelled')
    .reduce((acc, r) => acc + r.commissionAmount, 0);
  const totalCommission = MOCK_RESALES.filter((r) => r.status !== 'cancelled').reduce(
    (acc, r) => acc + r.commissionAmount,
    0,
  );
  const activeLinks = MOCK_LINKS.filter((l) => l.isActive).length;
  const totalClicks = MOCK_LINKS.reduce((acc, l) => acc + l.clicks, 0);
  const totalConversions = MOCK_LINKS.reduce((acc, l) => acc + l.conversions, 0);

  return simulateDelay({
    activeLinks,
    monthlyResales: monthly.length,
    monthlyCommission,
    totalCommission,
    growth: 12.4,
    pendingResales: MOCK_RESALES.filter((r) => r.status === 'pending').length,
    conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
  });
};

export const getRecentResellerActivities = async (
  limit = 5,
): Promise<RecentResellerActivity[]> => {
  const items: RecentResellerActivity[] = MOCK_RESALES.slice(0, limit).map((r) => ({
    id: r.id,
    type: 'resale',
    title: `Nueva reventa: ${r.experienceTitle}`,
    description: `${r.clientName} - ${r.participants} participantes - Comision ${formatCOP(r.commissionAmount)}`,
    timestamp: r.resaleDate,
    time: formatRelativeTime(r.resaleDate),
  }));
  return simulateDelay(items);
};

export const createResaleLink = async (input: {
  experienceId: string;
  code?: string;
}): Promise<ResaleLink> => {
  const exp = MOCK_CATALOG.find((e) => e.id === input.experienceId);
  if (!exp) throw new Error('Experiencia no encontrada');
  const code = (input.code ?? randomCode()).toUpperCase();
  const link: ResaleLink = {
    id: `lnk-${Date.now()}`,
    code,
    experienceId: exp.id,
    experienceTitle: exp.title,
    hostCompanyName: exp.hostCompanyName,
    basePrice: exp.basePrice,
    commissionPercent: exp.commissionPercent,
    currency: exp.currency,
    url: `https://tenemosfilo.com/book/${exp.id}?ref=${code}`,
    clicks: 0,
    conversions: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  MOCK_LINKS.unshift(link);
  return simulateDelay(link);
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Hace menos de 1 minuto';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `Hace ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return `Hace ${d} ${d === 1 ? 'dia' : 'dias'}`;
  }
  const w = Math.floor(diff / 604800);
  return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`;
}
