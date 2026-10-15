/**
 * Contrato de rotas da API — ÚNICO lugar onde caminhos HTTP são escritos.
 *
 * - `path` é relativo a `env.apiBaseUrl` (padrão `/api`).
 * - Segmentos `:nome` são substituídos por `params` em http.request().
 * - `pendente: true` marca rotas que o front já usa, mas o backend ainda não expõe.
 *   Funcionam no modo mock; com a API real, retornam 404 até serem implementadas.
 *
 * Separação por nível de permissão (decisão do MVP, seção 9.3 da modelagem):
 *   operação (bancada, catálogo, cadastro) · administração (editar, excluir, ajustar) · dashboard.
 * Quando o RBAC entrar, basta proteger o grupo — os caminhos não mudam.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface Endpoint {
  readonly method: HttpMethod
  readonly path: string
  readonly pendente?: true
}

const rota = <M extends HttpMethod, P extends string>(method: M, path: P, pendente?: true) =>
  ({ method, path, ...(pendente && { pendente }) }) as const satisfies Endpoint

export const API_ROUTES = {
  health: rota('GET', '/health'),

  categorias: {
    listar: rota('GET', '/categorias'),
    buscar: rota('GET', '/categorias/:id'),
    criar: rota('POST', '/categorias'),
    atualizar: rota('PUT', '/categorias/:id'),
    excluir: rota('DELETE', '/categorias/:id'),
  },

  produtos: {
    /** ?categoria_id= */
    listar: rota('GET', '/produtos'),
    buscar: rota('GET', '/produtos/:id'),
    /** Chamado a cada bip. 404 → produto novo (ou excluído, ver abaixo). */
    buscarPorCodigo: rota('GET', '/produtos/codigo/:codigo'),
    cadastrar: rota('POST', '/produtos'),
    atualizar: rota('PUT', '/produtos/:id'),
    /** Soft delete. 409 se saldo ≠ 0. */
    excluir: rota('DELETE', '/produtos/:id'),
    /** RF08/RN09: produto excluído com este código (para oferecer reativação). */
    buscarExcluidoPorCodigo: rota('GET', '/produtos/excluidos/codigo/:codigo', true),
    /** RF08/RN09: desfaz o soft delete. */
    reativar: rota('POST', '/produtos/:id/reativar', true),
  },

  movimentacoes: {
    /** ?produto_id= &tipo= &limite= (1–500). Mais recentes primeiro. */
    listar: rota('GET', '/movimentacoes'),
    buscar: rota('GET', '/movimentacoes/:id'),
    /** Retorna saldo_atual e alerta_saldo_negativo (RF09). */
    registrar: rota('POST', '/movimentacoes'),
  },

  dashboard: {
    /** ?categoria_id= &dias= — KPIs do RF04. */
    resumo: rota('GET', '/dashboard/resumo', true),
    /** ?categoria_id= — produtos com saldo negativo (RN07). */
    pendencias: rota('GET', '/dashboard/pendencias', true),
    /** ?categoria_id= &dias= — entradas e saídas por dia. */
    serie: rota('GET', '/dashboard/serie', true),
  },
} as const
