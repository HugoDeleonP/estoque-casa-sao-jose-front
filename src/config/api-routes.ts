/**
 * Contrato de rotas da API — ÚNICO lugar onde caminhos HTTP são escritos.
 *
 * - `path` é relativo a `env.apiBaseUrl` (padrão `/api`).
 * - Segmentos `:nome` são substituídos por `params` em http.request().
 *
 * Permissões (D7–D9): operação (todos os perfis) · administração e dashboard (ADMIN).
 * O backend confere o perfil em toda rota; o front só esconde o que o perfil não usa.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface Endpoint {
  readonly method: HttpMethod
  readonly path: string
}

const rota = <M extends HttpMethod, P extends string>(method: M, path: P) =>
  ({ method, path }) as const satisfies Endpoint

export const API_ROUTES = {
  health: rota('GET', '/health'),

  auth: {
    login: rota('POST', '/auth/login'),
    logout: rota('POST', '/auth/logout'),
    me: rota('GET', '/auth/me'),
  },

  usuarios: {
    listar: rota('GET', '/usuarios'),
    criar: rota('POST', '/usuarios'),
    alterarPerfil: rota('PUT', '/usuarios/:id/perfil'),
    redefinirSenha: rota('PUT', '/usuarios/:id/senha'),
    desativar: rota('DELETE', '/usuarios/:id'),
  },

  categorias: {
    listar: rota('GET', '/categorias'),
    buscar: rota('GET', '/categorias/:id'),
    criar: rota('POST', '/categorias'),
    atualizar: rota('PUT', '/categorias/:id'),
    excluir: rota('DELETE', '/categorias/:id'),
  },

  unidades: {
    listar: rota('GET', '/unidades'),
    criar: rota('POST', '/unidades'),
    /** Em uso: só o nome muda (409 para sigla/grandeza/fator). */
    atualizar: rota('PUT', '/unidades/:id'),
    excluir: rota('DELETE', '/unidades/:id'),
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
    buscarExcluidoPorCodigo: rota('GET', '/produtos/excluidos/codigo/:codigo'),
    /** RF08/RN09: desfaz o soft delete (ADMIN). */
    reativar: rota('POST', '/produtos/:id/reativar'),
  },

  movimentacoes: {
    /** ?produto_id= &tipo= &limite= (1–500). Mais recentes primeiro. */
    listar: rota('GET', '/movimentacoes'),
    buscar: rota('GET', '/movimentacoes/:id'),
    /** Retorna saldo_atual e alerta_saldo_negativo (RF09). */
    registrar: rota('POST', '/movimentacoes'),
  },

  dashboard: {
    /** ?inicio= &fim= (AAAA-MM-DD) &categoria_id= */
    resumo: rota('GET', '/dashboard/resumo'),
    /** ?categoria_id= — produtos com saldo negativo (RN07). */
    pendencias: rota('GET', '/dashboard/pendencias'),
    /** ?inicio= &fim= &categoria_id= — entradas e saídas por dia. */
    series: rota('GET', '/dashboard/series'),
  },
} as const
