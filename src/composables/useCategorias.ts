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
      .catch(() => {
        // Sem sessão ainda (tela de login) ou sem rede: tenta de novo no próximo uso
        carregando = null
      })
  }
  return { categorias, pronto: carregando }
}
