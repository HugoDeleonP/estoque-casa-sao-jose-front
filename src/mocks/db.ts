/**
 * Banco em memória para o modo mock (VITE_API_MOCK=true).
 * Reinicia a cada recarga da página. Espelha as entidades do backend.
 */
import type { Categoria, Movimentacao, TipoMovimentacao } from '@/types/api'

export interface ProdutoRow {
  id: number
  codigo_barras: string | null
  nome: string
  marca: string | null
  unidade: string | null
  categoria_id: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MovimentacaoRow = Omit<Movimentacao, 'produto_nome'>

const categorias: Categoria[] = [
  'Arroz', 'Feijão', 'Óleo', 'Leite', 'Massas', 'Higiene', 'Limpeza', 'Outros',
].map((nome, i) => ({ id: i + 1, nome }))

const agora = Date.now()
const DIA = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()

const produtos: ProdutoRow[] = (
  [
    ['7896006716112', 'Arroz branco tipo 1', 'Camil', 'pacote 5 kg', 1],
    ['7893500018292', 'Arroz parboilizado', 'Tio João', 'pacote 1 kg', 1],
    ['7896006744115', 'Feijão carioca', 'Camil', 'pacote 1 kg', 2],
    ['7898080640017', 'Feijão preto', 'Kicaldo', 'pacote 1 kg', 2],
    ['7891107101621', 'Óleo de soja', 'Soya', 'garrafa 900 ml', 3],
    ['7891000100103', 'Leite em pó integral', 'Ninho', 'lata 400 g', 4],
    ['7896022200015', 'Leite UHT integral', 'Italac', 'caixa 1 L', 4],
    ['7896005800027', 'Macarrão espaguete', 'Renata', 'pacote 500 g', 5],
    ['7891150037601', 'Sabonete', 'Lux', 'unidade 85 g', 6],
    ['7891024134702', 'Creme dental', 'Colgate', 'tubo 90 g', 6],
    ['7891022100709', 'Detergente líquido', 'Ypê', 'frasco 500 ml', 7],
    ['7896004000015', 'Fubá mimoso', 'Yoki', 'pacote 1 kg', 8],
  ] as const
).map(([codigo_barras, nome, marca, unidade, categoria_id], i) => ({
  id: i + 1,
  codigo_barras,
  nome,
  marca,
  unidade,
  categoria_id,
  created_at: iso(agora - 40 * DIA),
  updated_at: iso(agora - 40 * DIA),
  deleted_at: null,
}))

// Produto excluído: bipar 7894900011517 demonstra a reativação (RF08)
produtos.push({
  id: 13,
  codigo_barras: '7894900011517',
  nome: 'Achocolatado em pó',
  marca: 'Toddy',
  unidade: 'lata 400 g',
  categoria_id: 8,
  created_at: iso(agora - 60 * DIA),
  updated_at: iso(agora - 20 * DIA),
  deleted_at: iso(agora - 20 * DIA),
})

// Histórico determinístico de 30 dias (gerador pseudoaleatório com semente fixa)
let semente = 42
const aleatorio = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646

const movimentacoes: MovimentacaoRow[] = []
let proximoMovId = 1
const mov = (produto_id: number, tipo: TipoMovimentacao, quantidade: number, ms: number, observacao: string | null = null) =>
  movimentacoes.push({ id: proximoMovId++, produto_id, tipo, quantidade, observacao, created_at: iso(ms) })

for (let d = 30; d >= 0; d--) {
  const base = agora - d * DIA - 6 * 3_600_000
  for (let p = 1; p <= 12; p++) {
    if (aleatorio() < 0.45) mov(p, 'ENTRADA', 1 + Math.floor(aleatorio() * 8), base + p * 60_000)
    if (aleatorio() < 0.35) mov(p, 'SAIDA', -(1 + Math.floor(aleatorio() * 5)), base + 3_600_000 + p * 60_000)
  }
}
mov(5, 'AJUSTE', -2, agora - 3 * DIA, 'Avaria: garrafas vazando')
mov(13, 'ENTRADA', 4, agora - 30 * DIA)
mov(13, 'AJUSTE', -4, agora - 21 * DIA, 'Vencimento')

// Garante pendências de saldo negativo para o dashboard (RN07).
// Datadas fora da janela de 30 dias para não distorcer o gráfico.
const saldoAtual = (id: number) =>
  movimentacoes.filter((m) => m.produto_id === id).reduce((s, m) => s + m.quantidade, 0)
for (const [id, alvo] of [[6, -2], [11, -1]] as const) {
  mov(id, 'SAIDA', Math.min(alvo - saldoAtual(id), -1), agora - 45 * DIA)
}
// Produto com saldo zero (pode ser excluído)
const s12 = saldoAtual(12)
if (s12 !== 0) mov(12, s12 > 0 ? 'SAIDA' : 'ENTRADA', -s12, agora - 45 * DIA)

export const db = {
  categorias,
  produtos,
  movimentacoes,
  seq: { categoria: categorias.length + 1, produto: produtos.length + 1, movimentacao: proximoMovId },
}
