/**
 * Variáveis de ambiente lidas UMA vez e tipadas.
 * O restante do app importa daqui — nunca de `import.meta.env` diretamente.
 */
export const env = {
  /** Prefixo de todas as rotas da API (ver api-routes.ts). */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, ''),

  /** true → requisições respondidas por src/mocks, sem backend. */
  useMock: import.meta.env.VITE_API_MOCK === 'true',

  /** Tempo máximo por requisição (ms). */
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 8000,

  /** RNF06: datas chegam em UTC e são exibidas neste fuso. */
  timeZone: 'America/Sao_Paulo',
} as const
