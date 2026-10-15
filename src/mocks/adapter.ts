/**
 * Responde às rotas de API_ROUTES em memória, com as MESMAS regras e status do backend
 * (404, 409, 422 com `campos`). Trocar para a API real = VITE_API_MOCK=false; nada mais muda.
 */
import { API_ROUTES, type Endpoint } from '@/config/api-routes'
import { ApiError, type RequestOptions } from '@/config/http'
import type {
  CategoriaInput,
  DashboardResumo,
  Movimentacao,
  MovimentacaoInput,
  MovimentacaoRegistrada,
  PendenciaSaldo,
  PontoSerie,
  Produto,
  ProdutoExcluido,
  ProdutoInput,
  TipoMovimentacao,
} from '@/types/api'
import { codigoValido } from '@/utils/codigoBarras'
import { diaLocal } from '@/utils/format'
import { db, type MovimentacaoRow, type ProdutoRow } from './db'

const LATENCIA_MS = 180

type Handler = (opts: RequestOptions) => unknown
const handlers = new Map<Endpoint, Handler>()
const on = (endpoint: Endpoint, handler: Handler) => handlers.set(endpoint, handler)

export async function mockRequest<T>(endpoint: Endpoint, opts: RequestOptions): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCIA_MS))
  const handler = handlers.get(endpoint)
  if (!handler) {
    throw new ApiError(404, `Mock sem handler para ${endpoint.method} ${endpoint.path}`)
  }
  // Cópia profunda: a tela nunca altera o "banco" por referência
  const resultado = handler(opts)
  return (resultado === undefined ? undefined : structuredClone(resultado)) as T
}

// ---------- auxiliares ----------
const agoraIso = () => new Date().toISOString()
const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v))
const vazioParaNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)

function invalido(campos: { campo: string; mensagem: string }[]): never {
  throw new ApiError(422, 'Dados inválidos', campos)
}

const saldo = (produtoId: number) =>
  db.movimentacoes.filter((m) => m.produto_id === produtoId).reduce((s, m) => s + m.quantidade, 0)

const categoria = (id: number) => {
  const c = db.categorias.find((c) => c.id === id)
  if (!c) throw new ApiError(404, `Categoria ${id} não encontrada`)
  return c
}

const ativo = (id: number) => {
  const p = db.produtos.find((p) => p.id === id && !p.deleted_at)
  if (!p) throw new ApiError(404, `Produto ${id} não encontrado`)
  return p
}

const paraSaida = (p: ProdutoRow): Produto => ({
  id: p.id,
  codigo_barras: p.codigo_barras,
  nome: p.nome,
  marca: p.marca,
  unidade: p.unidade,
  categoria: categoria(p.categoria_id),
  saldo: saldo(p.id),
  created_at: p.created_at,
  updated_at: p.updated_at,
})

const movSaida = (m: MovimentacaoRow): Movimentacao => ({
  ...m,
  produto_nome: db.produtos.find((p) => p.id === m.produto_id)?.nome ?? '?',
})

function validarProduto(dados: ProdutoInput, idAtual?: number) {
  const campos = []
  const codigo = vazioParaNull(dados.codigo_barras)
  if (codigo && !codigoValido(codigo)) {
    campos.push({ campo: 'codigo_barras', mensagem: 'Use apenas dígitos (8 a 14)' })
  }
  if (!dados.nome || dados.nome.trim().length < 2) {
    campos.push({ campo: 'nome', mensagem: 'Informe ao menos 2 caracteres' })
  }
  if (!dados.categoria_id) campos.push({ campo: 'categoria_id', mensagem: 'Selecione uma categoria' })
  if (campos.length) invalido(campos)
  categoria(dados.categoria_id)
  if (codigo && db.produtos.some((p) => p.codigo_barras === codigo && !p.deleted_at && p.id !== idAtual)) {
    throw new ApiError(409, `Já existe um produto ativo com o código ${codigo}`)
  }
  return {
    codigo_barras: codigo,
    nome: dados.nome.trim(),
    marca: vazioParaNull(dados.marca),
    unidade: vazioParaNull(dados.unidade),
    categoria_id: dados.categoria_id,
  }
}

// ---------- infra ----------
on(API_ROUTES.health, () => ({ status: 'ok', db: { foreign_keys: true, journal_mode: 'mock' } }))

// ---------- categorias ----------
const rc = API_ROUTES.categorias
on(rc.listar, () => [...db.categorias].sort((a, b) => a.nome.localeCompare(b.nome)))
on(rc.buscar, ({ params }) => categoria(Number(params!.id)))
on(rc.criar, ({ body }) => {
  const nome = (body as CategoriaInput).nome?.trim() ?? ''
  if (nome.length < 2) invalido([{ campo: 'nome', mensagem: 'Informe ao menos 2 caracteres' }])
  if (db.categorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
    throw new ApiError(409, `Categoria "${nome}" já existe`)
  }
  const nova = { id: db.seq.categoria++, nome }
  db.categorias.push(nova)
  return nova
})
on(rc.atualizar, ({ params, body }) => {
  const c = categoria(Number(params!.id))
  c.nome = (body as CategoriaInput).nome.trim()
  return c
})
on(rc.excluir, ({ params }) => {
  const id = Number(params!.id)
  categoria(id)
  if (db.produtos.some((p) => p.categoria_id === id)) {
    throw new ApiError(409, 'Categoria possui produtos vinculados')
  }
  db.categorias.splice(db.categorias.findIndex((c) => c.id === id), 1)
})

// ---------- produtos ----------
const rp = API_ROUTES.produtos
on(rp.listar, ({ query }) => {
  const categoriaId = num(query?.categoria_id)
  return db.produtos
    .filter((p) => !p.deleted_at && (categoriaId === undefined || p.categoria_id === categoriaId))
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(paraSaida)
})
on(rp.buscar, ({ params }) => paraSaida(ativo(Number(params!.id))))
on(rp.buscarPorCodigo, ({ params }) => {
  const codigo = String(params!.codigo)
  if (!codigoValido(codigo)) {
    invalido([{ campo: 'codigo_barras', mensagem: 'Código de barras inválido (8 a 14 dígitos)' }])
  }
  const p = db.produtos.find((p) => p.codigo_barras === codigo && !p.deleted_at)
  if (!p) throw new ApiError(404, `Produto com código ${codigo} não encontrado`)
  return paraSaida(p)
})
on(rp.buscarExcluidoPorCodigo, ({ params }): ProdutoExcluido => {
  const p = db.produtos.find((p) => p.codigo_barras === params!.codigo && p.deleted_at)
  if (!p) throw new ApiError(404, 'Nenhum produto excluído com este código')
  return { ...paraSaida(p), deleted_at: p.deleted_at! }
})
on(rp.cadastrar, ({ body }) => {
  const dados = validarProduto(body as ProdutoInput)
  const novo: ProdutoRow = {
    id: db.seq.produto++,
    ...dados,
    created_at: agoraIso(),
    updated_at: agoraIso(),
    deleted_at: null,
  }
  db.produtos.push(novo)
  return paraSaida(novo)
})
on(rp.atualizar, ({ params, body }) => {
  const p = ativo(Number(params!.id))
  Object.assign(p, validarProduto(body as ProdutoInput, p.id), { updated_at: agoraIso() })
  return paraSaida(p)
})
on(rp.excluir, ({ params }) => {
  const p = ativo(Number(params!.id))
  const s = saldo(p.id)
  if (s !== 0) {
    throw new ApiError(409, `Produto ${p.id} tem saldo ${s}; zere com um AJUSTE antes de excluir`)
  }
  p.deleted_at = agoraIso()
})
on(rp.reativar, ({ params }) => {
  const p = db.produtos.find((p) => p.id === Number(params!.id) && p.deleted_at)
  if (!p) throw new ApiError(404, 'Produto excluído não encontrado')
  if (db.produtos.some((o) => o.codigo_barras === p.codigo_barras && !o.deleted_at)) {
    throw new ApiError(409, 'Já existe um produto ativo com este código')
  }
  p.deleted_at = null
  p.updated_at = agoraIso()
  return paraSaida(p)
})

// ---------- movimentações ----------
const rm = API_ROUTES.movimentacoes
on(rm.listar, ({ query }) => {
  const produtoId = num(query?.produto_id)
  const tipo = query?.tipo as TipoMovimentacao | undefined
  const limite = Math.min(Math.max(num(query?.limite) ?? 100, 1), 500)
  return db.movimentacoes
    .filter((m) => (produtoId === undefined || m.produto_id === produtoId) && (!tipo || m.tipo === tipo))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .slice(0, limite)
    .map(movSaida)
})
on(rm.buscar, ({ params }) => {
  const m = db.movimentacoes.find((m) => m.id === Number(params!.id))
  if (!m) throw new ApiError(404, `Movimentação ${params!.id} não encontrada`)
  return movSaida(m)
})
on(rm.registrar, ({ body }): MovimentacaoRegistrada => {
  const d = body as MovimentacaoInput
  const observacao = vazioParaNull(d.observacao)
  const regra =
    d.tipo === 'ENTRADA' && d.quantidade <= 0 ? 'ENTRADA exige quantidade positiva'
    : d.tipo === 'SAIDA' && d.quantidade >= 0 ? 'SAIDA exige quantidade negativa'
    : d.tipo === 'AJUSTE' && d.quantidade === 0 ? 'AJUSTE não pode ter quantidade zero'
    : d.tipo === 'AJUSTE' && !observacao ? 'AJUSTE exige observação (motivo da correção)'
    : null
  if (!Number.isInteger(d.quantidade)) invalido([{ campo: 'quantidade', mensagem: 'Deve ser inteiro' }])
  if (regra) invalido([{ campo: '', mensagem: `Value error, ${regra}` }])
  ativo(d.produto_id)
  const row: MovimentacaoRow = {
    id: db.seq.movimentacao++,
    produto_id: d.produto_id,
    tipo: d.tipo,
    quantidade: d.quantidade,
    observacao,
    created_at: agoraIso(),
  }
  db.movimentacoes.push(row)
  const s = saldo(d.produto_id)
  return { ...movSaida(row), saldo_atual: s, alerta_saldo_negativo: s < 0 }
})

// ---------- dashboard ----------
const rd = API_ROUTES.dashboard
const produtosDaCategoria = (categoriaId?: number) =>
  db.produtos.filter((p) => !p.deleted_at && (categoriaId === undefined || p.categoria_id === categoriaId))

const movsNaJanela = (categoriaId: number | undefined, dias: number) => {
  const ids = new Set(produtosDaCategoria(categoriaId).map((p) => p.id))
  const desde = Date.now() - dias * 86_400_000
  return db.movimentacoes.filter((m) => ids.has(m.produto_id) && Date.parse(m.created_at) >= desde)
}

on(rd.resumo, ({ query }): DashboardResumo => {
  const categoriaId = num(query?.categoria_id)
  const dias = num(query?.dias) ?? 30
  const produtos = produtosDaCategoria(categoriaId)
  const saldos = produtos.map((p) => saldo(p.id))
  const janela = movsNaJanela(categoriaId, dias)
  return {
    saldo_total: saldos.reduce((a, b) => a + b, 0),
    total_entradas: janela.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + m.quantidade, 0),
    total_saidas: -janela.filter((m) => m.tipo === 'SAIDA').reduce((s, m) => s + m.quantidade, 0),
    produtos_saldo_negativo: saldos.filter((s) => s < 0).length,
    total_produtos: produtos.length,
  }
})
on(rd.pendencias, ({ query }): PendenciaSaldo[] =>
  produtosDaCategoria(num(query?.categoria_id))
    .map((p) => ({
      produto_id: p.id,
      nome: p.nome,
      marca: p.marca,
      categoria: categoria(p.categoria_id).nome,
      saldo: saldo(p.id),
    }))
    .filter((p) => p.saldo < 0)
    .sort((a, b) => a.saldo - b.saldo),
)
on(rd.serie, ({ query }): PontoSerie[] => {
  const dias = num(query?.dias) ?? 30
  const pontos = new Map<string, PontoSerie>()
  for (let i = dias - 1; i >= 0; i--) {
    const data = diaLocal(new Date(Date.now() - i * 86_400_000))
    pontos.set(data, { data, entradas: 0, saidas: 0 })
  }
  for (const m of movsNaJanela(num(query?.categoria_id), dias)) {
    const ponto = pontos.get(diaLocal(m.created_at))
    if (!ponto) continue
    if (m.tipo === 'ENTRADA') ponto.entradas += m.quantidade
    if (m.tipo === 'SAIDA') ponto.saidas -= m.quantidade
  }
  return [...pontos.values()]
})

// Falha cedo se uma rota do contrato ficar sem handler (evita "mock incompleto" silencioso)
const todas = Object.values(API_ROUTES).flatMap((g) => ('method' in g ? [g] : Object.values(g)))
for (const e of todas) {
  if (!handlers.has(e)) console.warn(`[mock] sem handler: ${e.method} ${e.path}`)
}
