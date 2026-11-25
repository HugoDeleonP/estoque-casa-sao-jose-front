import { ref } from 'vue'
import { unidadeService } from '@/services'
import type { Unidade } from '@/types/api'

// Mudam raramente: carregadas uma vez e compartilhadas; a tela de unidades chama recarregar()
const unidades = ref<Unidade[]>([])
let carregando: Promise<void> | null = null

function recarregar() {
  carregando = unidadeService
    .listar()
    .then((lista) => {
      unidades.value = lista
    })
    .catch((e) => {
      carregando = null
      throw e
    })
  return carregando
}

export function useUnidades() {
  if (!carregando) recarregar().catch(() => undefined)
  return { unidades, pronto: carregando!, recarregar }
}
