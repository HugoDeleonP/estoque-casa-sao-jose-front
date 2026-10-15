import { API_ROUTES, request } from '@/config'
import type { Produto, ProdutoExcluido, ProdutoInput } from '@/types/api'

const r = API_ROUTES.produtos

export const produtoService = {
  listar: (categoria_id?: number) => request<Produto[]>(r.listar, { query: { categoria_id } }),
  buscar: (id: number) => request<Produto>(r.buscar, { params: { id } }),
  buscarPorCodigo: (codigo: string) =>
    request<Produto>(r.buscarPorCodigo, { params: { codigo } }),
  cadastrar: (dados: ProdutoInput) => request<Produto>(r.cadastrar, { body: dados }),
  atualizar: (id: number, dados: ProdutoInput) =>
    request<Produto>(r.atualizar, { params: { id }, body: dados }),
  excluir: (id: number) => request<void>(r.excluir, { params: { id } }),
  buscarExcluidoPorCodigo: (codigo: string) =>
    request<ProdutoExcluido>(r.buscarExcluidoPorCodigo, { params: { codigo } }),
  reativar: (id: number) => request<Produto>(r.reativar, { params: { id } }),
}
