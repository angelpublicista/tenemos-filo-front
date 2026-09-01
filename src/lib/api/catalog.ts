// Catalogo digital publico: lo que ve un cliente al abrir el enlace que le
// comparte un anfitrion. No requiere sesion.
import { api } from './client';
import { toCompany, type ApiCompany } from '@/lib/sanity/companyService';
import { toExperience, type ApiExperience } from '@/lib/sanity/experienceService';
import type { Company, Experience } from '@/types';

/** Tal como llega del API, antes de traducir empresa y experiencias. */
type RespuestaCruda = {
  company: ApiCompany;
  experiences: ApiExperience[];
  paymentsEnabled?: boolean;
  paymentRequired?: boolean;
};

/**
 * El catalogo ya traducido a los tipos del front.
 *
 * paymentRequired dice si hay que pagar para que la reserva valga. Lo decide
 * el anfitrion; si no dice nada, el valor por defecto de la plataforma. Sin
 * pasarela activa llega siempre en false: no se puede exigir lo que no se
 * puede cobrar.
 */
export type CatalogoPublico = {
  company: Company;
  experiences: Experience[];
  paymentsEnabled: boolean;
  paymentRequired: boolean;
};

function traducir(data: RespuestaCruda): CatalogoPublico {
  return {
    company: toCompany(data.company),
    experiences: (data.experiences ?? []).map(toExperience),
    paymentsEnabled: Boolean(data.paymentsEnabled),
    paymentRequired: Boolean(data.paymentRequired),
  };
}

/**
 * Acepta el slug de la empresa ("filo-demo") o su id.
 *
 * El id se sigue admitiendo porque los anfitriones ya compartieron enlaces
 * con ese formato y romperlos seria peor que tener dos formas validas.
 */
export const getPublicCatalog = async (slugOrId: string): Promise<CatalogoPublico> =>
  traducir(await api.get<RespuestaCruda>(`/public/catalog/${encodeURIComponent(slugOrId)}`));

/**
 * Catálogo de un revendedor: las experiencias activas de toda la
 * plataforma, no las de una empresa concreta.
 *
 * La empresa que devuelve es la del revendedor, para que su catálogo salga
 * con su marca aunque las experiencias sean de otros.
 */
export const getResellerCatalog = async (slugOrId: string): Promise<CatalogoPublico> =>
  traducir(await api.get<RespuestaCruda>(`/public/reseller/${encodeURIComponent(slugOrId)}`));
