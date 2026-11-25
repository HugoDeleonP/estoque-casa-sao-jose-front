import { API_ROUTES, request } from '@/config'
import type { Unidade, UnidadeInput } from '@/types/api'

const r = API_ROUTES.unidades

export const unidadeService = {
  listar: () => request<Unidade[]>(r.listar),
  criar: (dados: UnidadeInput) => request<Unidade>(r.criar, { body: dados }),
  atualizar: (id: number, dados: UnidadeInput) =>
    request<Unidade>(r.atualizar, { params: { id }, body: dados }),
  excluir: (id: number) => request<void>(r.excluir, { params: { id } }),
}
