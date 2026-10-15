import { ref } from 'vue'
import { categoriaService } from '@/services'
import type { Categoria } from '@/types/api'

// Categorias mudam raramente (seed): carregadas uma vez e compartilhadas entre telas
const categorias = ref<Categoria[]>([])
let carregando: Promise<void> | null = null

export function useCategorias() {
  if (!carregando) {
    carregando = categoriaService
      .listar()
      .then((lista) => {
        categorias.value = lista
      })
      .catch((e) => {
        carregando = null
        throw e
      })
  }
  return { categorias, pronto: carregando }
}
