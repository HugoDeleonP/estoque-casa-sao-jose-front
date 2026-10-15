import { API_ROUTES, request } from '@/config'
import type { Categoria, CategoriaInput } from '@/types/api'

const r = API_ROUTES.categorias

export const categoriaService = {
  listar: () => request<Categoria[]>(r.listar),
  buscar: (id: number) => request<Categoria>(r.buscar, { params: { id } }),
  criar: (dados: CategoriaInput) => request<Categoria>(r.criar, { body: dados }),
  atualizar: (id: number, dados: CategoriaInput) =>
    request<Categoria>(r.atualizar, { params: { id }, body: dados }),
  excluir: (id: number) => request<void>(r.excluir, { params: { id } }),
}
