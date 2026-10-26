// Menus: la carta del anfitrion. Habla con el API propio (Express + Postgres).
//
// Vive en esta carpeta y con el sufijo `...InSanity` por coherencia con el
// resto de servicios, aunque de Sanity ya no quede nada: el shape de retorno
// se mantiene "Sanity-like" para que las pantallas lo traten como a los demas.
import { api } from '@/lib/api/client';
import { Menu, MenuSection, CreateMenuData } from '@/types';

// ─── Tipos del API ─────────────────────────────────────────────────────────

export interface ApiMenu {
  id: string;
  companyId: string;
  name: string;
  slug: string | null;
  description: string | null;
  sections: MenuSection[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Solo viaja en las respuestas del panel, no en el catalogo publico. */
  experiences?: Array<{ id: string; title: string }>;
}

// ─── Mapeo API → shape del front ───────────────────────────────────────────

/**
 * Se exporta porque el catalogo publico tambien lo necesita: alli el menu
 * llega embebido en la experiencia y hay que traducirlo igual.
 *
 * Las claves `_key` se generan aqui y no vienen del API: son solo para que
 * React no pierda el hilo al reordenar secciones y platos en el editor.
 */
export function toMenu(m: ApiMenu): Menu {
  return {
    _id: m.id,
    _type: 'menu',
    name: m.name,
    slug: { _type: 'slug', current: m.slug ?? '' },
    company: { _ref: m.companyId, _type: 'reference' },
    description: m.description ?? undefined,
    sections: conClaves(m.sections ?? []),
    experiences: m.experiences?.map((e) => ({ _id: e.id, title: e.title })),
    isActive: m.isActive,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

let contador = 0;
const nuevaClave = () => `k${Date.now().toString(36)}${(contador++).toString(36)}`;

/** Rellena las `_key` que falten, sin tocar las que ya vengan puestas. */
export function conClaves(sections: MenuSection[]): MenuSection[] {
  return sections.map((s) => ({
    ...s,
    _key: s._key ?? nuevaClave(),
    items: (s.items ?? []).map((i) => ({ ...i, _key: i._key ?? nuevaClave() })),
  }));
}

/**
 * Quita las `_key` antes de enviar: son un detalle del editor y el API las
 * rechazaria por schema.
 */
function limpiarSecciones(sections: MenuSection[]) {
  return sections.map((s) => ({
    name: s.name,
    ...(s.description ? { description: s.description } : {}),
    items: (s.items ?? []).map((i) => ({
      name: i.name,
      ...(i.description ? { description: i.description } : {}),
      ...(i.price !== undefined && i.price !== null ? { price: i.price } : {}),
      ...(i.image ? { image: i.image } : {}),
    })),
  }));
}

function buildPayload(data: Partial<CreateMenuData>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.description !== undefined) out.description = data.description;
  if (data.sections !== undefined) out.sections = limpiarSecciones(data.sections);
  if (data.isActive !== undefined) out.isActive = data.isActive;
  return out;
}

// ─── API publica ───────────────────────────────────────────────────────────

export const createMenuInSanity = async (data: CreateMenuData): Promise<Menu> => {
  const created = await api.post<ApiMenu>('/menus', buildPayload(data));
  return toMenu(created);
};

export const getMenusByCompany = async (
  companyId: string,
  opts?: { includeInactive?: boolean },
): Promise<Menu[]> => {
  const items = await api.get<ApiMenu[]>('/menus', {
    companyId,
    includeInactive: opts?.includeInactive || undefined,
  });
  return items.map(toMenu);
};

export const getMenuById = async (menuId: string): Promise<Menu | null> => {
  try {
    const menu = await api.get<ApiMenu>(`/menus/${encodeURIComponent(menuId)}`);
    return toMenu(menu);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
};

export const updateMenuInSanity = async (
  menuId: string,
  data: Partial<CreateMenuData>,
): Promise<Menu> => {
  const updated = await api.patch<ApiMenu>(
    `/menus/${encodeURIComponent(menuId)}`,
    buildPayload(data),
  );
  return toMenu(updated);
};

export const deleteMenuInSanity = async (menuId: string): Promise<void> => {
  await api.delete(`/menus/${encodeURIComponent(menuId)}`);
};
