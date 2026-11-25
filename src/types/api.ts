/**
 * Espelho dos DTOs do backend (estoque_doacoes/<modulo>/dto).
 * Datas trafegam como string ISO-8601 em UTC.
 */

// ---------- Usuário / autenticação ----------
export const ROLES = ['ADMIN', 'COMUM'] as const
export type Role = (typeof ROLES)[number]

export interface Usuario {
  id: number
  nome: string
  email: string
  role: Role
  created_at: string
}

export interface LoginInput {
  email: string
  senha: string
}

export interface UsuarioInput {
  nome: string
  email: string
  /** Mínimo de 8 caracteres. */
  senha: string
  role: Role
}

// ---------- Unidade de medida ----------
export const GRANDEZAS = ['MASSA', 'VOLUME', 'CONTAGEM'] as const
export type Grandeza = (typeof GRANDEZAS)[number]

export interface UnidadeResumo {
  id: number
  sigla: string
  nome: string
  grandeza: Grandeza
  /** Converte para a unidade base: kg (MASSA), L (VOLUME), un (CONTAGEM). */
  fator_base: number
}

export interface Unidade extends UnidadeResumo {
  /** Usada por algum produto: só o nome pode mudar. */
  em_uso: boolean
}

export interface UnidadeInput {
  sigla: string
  nome: string
  grandeza: Grandeza
  fator_base: number
}

// ---------- Categoria ----------
export interface Categoria {
  id: number
  nome: string
}

export interface CategoriaInput {
  nome: string
}

// ---------- Produto ----------
export interface Produto {
  id: number
  codigo_barras: string | null
  nome: string
  marca: string | null
  /** Conteúdo de UMA embalagem (ex.: 5 com unidade kg). O saldo conta embalagens. */
  conteudo_valor: number
  unidade_medida: UnidadeResumo
  categoria: Categoria
  /** Derivado: SUM(movimentacao.quantidade). Pode ser negativo (RF09). */
  saldo: number
  created_at: string
  updated_at: string
}

/** POST e PUT (o PUT substitui todos os campos editáveis). "" em opcional vira null na API. */
export interface ProdutoInput {
  codigo_barras: string | null
  nome: string
  marca: string | null
  /** > 0, obrigatório (D5). */
  conteudo_valor: number
  unidade_medida_id: number
  categoria_id: number
}

/** Produto com soft delete, para reativação (RN09). */
export interface ProdutoExcluido extends Produto {
  deleted_at: string
}

// ---------- Movimentação ----------
export const TIPOS_MOVIMENTACAO = ['ENTRADA', 'SAIDA', 'AJUSTE'] as const
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number]

export interface Movimentacao {
  id: number
  produto_id: number
  produto_nome: string
  tipo: TipoMovimentacao
  /** Delta com sinal: ENTRADA > 0, SAIDA < 0, AJUSTE ≠ 0. */
  quantidade: number
  observacao: string | null
  created_at: string
  /** Quem registrou (null em registros anteriores ao login). */
  usuario_nome: string | null
}

export interface MovimentacaoInput {
  produto_id: number
  tipo: TipoMovimentacao
  quantidade: number
  /** Obrigatória em AJUSTE. */
  observacao?: string | null
}

export interface MovimentacaoRegistrada extends Movimentacao {
  saldo_atual: number
  alerta_saldo_negativo: boolean
}

export interface MovimentacaoFiltro {
  produto_id?: number
  tipo?: TipoMovimentacao
  /** 1 a 500 (padrão 100). */
  limite?: number
}

// ---------- Dashboard (somente ADMIN) ----------
export interface DashboardFiltro {
  categoria_id?: number
  /** AAAA-MM-DD (fuso America/Sao_Paulo). Padrão da API: últimos 30 dias. */
  inicio?: string
  fim?: string
}

/** Cada grandeza na sua unidade base; nunca somadas entre si. */
export interface TotaisGrandeza {
  massa_kg: number
  volume_l: number
  contagem_un: number
}

export interface DashboardResumo {
  inicio: string
  fim: string
  /** Embalagens em estoque (subestimado enquanto houver saldo negativo). */
  saldo_total: number
  total_produtos: number
  produtos_saldo_negativo: number
  /** Embalagens no período; AJUSTE não entra. Saídas em valor absoluto. */
  total_entradas: number
  total_saidas: number
  estoque_grandeza: TotaisGrandeza
  entradas_grandeza: TotaisGrandeza
  saidas_grandeza: TotaisGrandeza
}

export interface PendenciaSaldo {
  produto_id: number
  nome: string
  marca: string | null
  categoria: string
  saldo: number
}

export interface PontoSerie {
  /** AAAA-MM-DD no fuso America/Sao_Paulo. */
  data: string
  entradas: number
  /** Valor absoluto (positivo). */
  saidas: number
}

// ---------- Infra ----------
export interface Health {
  status: 'ok'
  db: { foreign_keys: boolean; journal_mode: string }
}

/** Formato único de erro do backend (ErroDTO.py). */
export interface CampoInvalido {
  campo: string
  mensagem: string
}

export interface ErroResposta {
  timestamp: string
  status: number
  erro: string
  mensagem: string
  caminho: string
  campos?: CampoInvalido[]
}
