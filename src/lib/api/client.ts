// Cliente HTTP para hablar con el API.
// Siempre va contra /api/proxy/* del propio Next; el proxy adjunta el JWT
// y reenvia al backend (ver src/app/api/proxy/[...path]/route.ts).

import { ACTING_COMPANY_HEADER, getActingCompany } from "./actingCompany";

const PROXY_BASE = "/api/proxy";

type QueryValue = string | number | boolean | null | undefined;
type Query = Record<string, QueryValue | QueryValue[]>;

type Options = Omit<RequestInit, "body"> & {
  json?: unknown;
  query?: Query;
};

export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

export class ApiHttpError extends Error implements ApiError {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null) params.append(k, String(item));
      }
    } else {
      params.append(k, String(v));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Sobre completo que devuelve el API: { data, meta? }. */
type Envelope<T> = { data: T; meta?: { total: number; page: number; pageSize: number } };

/** Hace el request y devuelve el sobre sin desenvolver. */
async function request<T>(path: string, opts: Options = {}): Promise<Envelope<T> | null> {
  const { json, query, headers, ...rest } = opts;
  const url = `${PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}${buildQuery(query)}`;

  // Si un ADMIN eligio una empresa activa, se la anunciamos al API: alli
  // pasa a ser su companyId y todos los modulos operan sobre ella.
  const acting = getActingCompany();

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(acting ? { [ACTING_COMPANY_HEADER]: acting } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : null;

  if (!res.ok) {
    const err = (payload as { error?: ApiError } | null)?.error;
    throw new ApiHttpError(
      res.status,
      err?.code ?? "REQUEST_FAILED",
      err?.message ?? res.statusText,
      err?.details,
    );
  }

  return payload as Envelope<T> | null;
}

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const payload = await request<T>(path, opts);
  return payload?.data as T;
}

export type Paginated<T> = { items: T[]; total: number };

/**
 * Para endpoints paginados: conserva el `meta.total`, que apiFetch descarta
 * al quedarse solo con `data`.
 */
export async function apiList<T>(path: string, query?: Query): Promise<Paginated<T>> {
  const payload = await request<T[]>(path, { method: "GET", query });
  const items = payload?.data ?? [];
  return { items, total: payload?.meta?.total ?? items.length };
}

export const api = {
  get: <T>(path: string, query?: Query) => apiFetch<T>(path, { method: "GET", query }),
  list: apiList,
  post: <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: "PATCH", json }),
  put: <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: "PUT", json }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
