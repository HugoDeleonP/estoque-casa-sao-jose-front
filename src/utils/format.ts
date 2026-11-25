import { env } from '@/config/env'

/** O SQLite pode devolver datetime sem fuso; o backend grava sempre em UTC. */
export function parseUtc(iso: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)
}

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: env.timeZone,
  dateStyle: 'short',
  timeStyle: 'short',
})
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: env.timeZone, timeStyle: 'medium' })
const diaIso = new Intl.DateTimeFormat('en-CA', { timeZone: env.timeZone })
const numero = new Intl.NumberFormat('pt-BR')
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const medida = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const formatarDataHora = (iso: string) => dataHora.format(parseUtc(iso))
export const formatarHora = (iso: string) => hora.format(parseUtc(iso))
/** YYYY-MM-DD no fuso local da Casa São José. */
export const diaLocal = (data: Date | string) =>
  diaIso.format(typeof data === 'string' ? parseUtc(data) : data)
export const formatarNumero = (n: number) => numero.format(n)
/** "+3", "−2" (sinal de menos tipográfico). */
export const formatarDelta = (n: number) => (n > 0 ? `+${numero.format(n)}` : numero.format(n).replace('-', '−'))
export const formatarSaldo = (n: number) => numero.format(n).replace('-', '−')

export const formatarDecimal = (n: number) => decimal.format(n)
/** Totais do dashboard: "1.234,5" (uma casa decimal basta para kg e L). */
export const formatarMedida = (n: number) => medida.format(n).replace('-', '−')

interface ComConteudo {
  conteudo_valor?: number | null
  unidade_medida?: { sigla: string } | null
}

/** "5 kg", "0,5 L", "12 un" */
export function formatarConteudo(p: ComConteudo) {
  if (!p.conteudo_valor || !p.unidade_medida) return ''
  return `${decimal.format(p.conteudo_valor)} ${p.unidade_medida.sigla}`
}

/** "Feijão Camil 1 kg" */
export function descricaoProduto(p: { nome: string; marca?: string | null } & ComConteudo) {
  return [p.nome, p.marca, formatarConteudo(p)].filter(Boolean).join(' ')
}
