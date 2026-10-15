import { API_ROUTES, request } from '@/config'
import type {
  Movimentacao,
  MovimentacaoFiltro,
  MovimentacaoInput,
  MovimentacaoRegistrada,
} from '@/types/api'

const r = API_ROUTES.movimentacoes

export const movimentacaoService = {
  listar: (filtro: MovimentacaoFiltro = {}) =>
    request<Movimentacao[]>(r.listar, { query: { ...filtro } }),
  buscar: (id: number) => request<Movimentacao>(r.buscar, { params: { id } }),
  registrar: (dados: MovimentacaoInput) =>
    request<MovimentacaoRegistrada>(r.registrar, { body: dados }),
}
