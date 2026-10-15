/**
 * Espelho dos DTOs do backend (estoque_doacoes/<modulo>/dto).
 * Datas trafegam como string ISO-8601 em UTC.
 */

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
  unidade: string | null
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
  unidade: string | null
  categoria_id: number
}

/** Rota pendente no backend: produto com soft delete, para reativação. */
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

// ---------- Dashboard (rotas pendentes no backend) ----------
export interface DashboardFiltro {
  categoria_id?: number
  /** Janela de tempo para entradas/saídas e série. */
  dias?: number
}

export interface DashboardResumo {
  /** Itens/embalagens em estoque (subestimado enquanto houver saldo negativo). */
  saldo_total: number
  total_entradas: number
  total_saidas: number
  produtos_saldo_negativo: number
  total_produtos: number
}

export interface PendenciaSaldo {
  produto_id: number
  nome: string
  marca: string | null
  categoria: string
  saldo: number
}

export interface PontoSerie {
  /** YYYY-MM-DD no fuso America/Sao_Paulo. */
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
