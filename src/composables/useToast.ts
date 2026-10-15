import { reactive } from 'vue'

export type ToastTipo = 'sucesso' | 'aviso' | 'erro' | 'info'

export interface Toast {
  id: number
  tipo: ToastTipo
  mensagem: string
}

// Estado global: um único container de toasts no App.vue
const toasts = reactive<Toast[]>([])
let proximoId = 1

const DURACAO: Record<ToastTipo, number> = { sucesso: 3000, info: 4000, aviso: 7000, erro: 7000 }

function remover(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

function mostrar(tipo: ToastTipo, mensagem: string) {
  const id = proximoId++
  toasts.push({ id, tipo, mensagem })
  if (toasts.length > 5) toasts.shift()
  setTimeout(() => remover(id), DURACAO[tipo])
}

/** Alertas NÃO bloqueantes (RN06): nada de modal, que o Enter do leitor confirmaria. */
export function useToast() {
  return {
    toasts,
    remover,
    sucesso: (m: string) => mostrar('sucesso', m),
    aviso: (m: string) => mostrar('aviso', m),
    erro: (m: string) => mostrar('erro', m),
    info: (m: string) => mostrar('info', m),
  }
}
