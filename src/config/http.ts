/**
 * Cliente HTTP único. Services chamam `request(API_ROUTES.x.y, {...})` e recebem
 * o corpo já tipado, ou uma ApiError com o formato padrão do backend (ErroResposta).
 */
import type { CampoInvalido, ErroResposta } from '@/types/api'
import type { Endpoint } from './api-routes'
import { env } from './env'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  params?: Record<string, string | number>
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly campos: CampoInvalido[]
  readonly caminho?: string

  constructor(status: number, mensagem: string, campos: CampoInvalido[] = [], caminho?: string) {
    super(mensagem)
    this.name = 'ApiError'
    this.status = status
    this.campos = campos
    this.caminho = caminho
  }

  /** Mensagem do campo (ex.: "codigo_barras"), para exibir ao lado do input. */
  campo(nome: string): string | undefined {
    return this.campos.find((c) => c.campo === nome || c.campo.endsWith(`.${nome}`))?.mensagem
  }

  get naoEncontrado() {
    return this.status === 404
  }
  get conflito() {
    return this.status === 409
  }
  get semConexao() {
    return this.status === 0
  }
}

export function montarCaminho(path: string, params: RequestOptions['params'] = {}): string {
  return path.replace(/:(\w+)/g, (_, nome: string) => {
    if (!(nome in params)) throw new Error(`Parâmetro de rota ausente: ${nome} em ${path}`)
    return encodeURIComponent(String(params[nome]))
  })
}

function montarQuery(query: RequestOptions['query'] = {}): string {
  const qs = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && valor !== '') qs.append(chave, String(valor))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function request<T>(endpoint: Endpoint, opts: RequestOptions = {}): Promise<T> {
  if (env.useMock) {
    // Import dinâmico: o mock não entra no bundle de produção
    const { mockRequest } = await import('@/mocks/adapter')
    return mockRequest<T>(endpoint, opts)
  }

  const url = env.apiBaseUrl + montarCaminho(endpoint.path, opts.params) + montarQuery(opts.query)
  const timeout = AbortSignal.timeout(env.timeoutMs)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout

  let resposta: Response
  try {
    resposta = await fetch(url, {
      method: endpoint.method,
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal,
      // Pós-MVP (RF06): sessão via cookie HttpOnly — nada a mudar além disto
      credentials: 'same-origin',
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ApiError(0, 'A API demorou demais para responder. Tente novamente.')
    }
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se o servidor está ligado.')
  }

  if (resposta.status === 204) return undefined as T

  const corpo: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const erro = corpo as Partial<ErroResposta> | null
    throw new ApiError(
      resposta.status,
      erro?.mensagem ?? `Erro ${resposta.status} ao acessar a API`,
      erro?.campos ?? [],
      erro?.caminho,
    )
  }
  return corpo as T
}
