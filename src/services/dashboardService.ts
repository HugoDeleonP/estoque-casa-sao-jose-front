import { API_ROUTES, request } from '@/config'
import type { DashboardFiltro, DashboardResumo, PendenciaSaldo, PontoSerie } from '@/types/api'

const r = API_ROUTES.dashboard

export const dashboardService = {
  resumo: (filtro: DashboardFiltro = {}) =>
    request<DashboardResumo>(r.resumo, { query: { ...filtro } }),
  pendencias: (categoria_id?: number) =>
    request<PendenciaSaldo[]>(r.pendencias, { query: { categoria_id } }),
  serie: (filtro: DashboardFiltro = {}) => request<PontoSerie[]>(r.serie, { query: { ...filtro } }),
}
