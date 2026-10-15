import { ApiError } from '@/config/http'

/** Texto para o usuário a partir de qualquer erro lançado por um service. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) {
    // 422 de regra do model_validator vem sem campo e com prefixo do Pydantic
    const geral = e.campos.find((c) => !c.campo)?.mensagem.replace(/^Value error, /, '')
    return geral ?? e.message
  }
  return e instanceof Error ? e.message : 'Erro inesperado'
}

/** { campo: mensagem } para exibir ao lado de cada input. */
export function errosDeCampo(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {}
  return Object.fromEntries(
    e.campos.filter((c) => c.campo).map((c) => [c.campo.split('.').pop()!, c.mensagem]),
  )
}
