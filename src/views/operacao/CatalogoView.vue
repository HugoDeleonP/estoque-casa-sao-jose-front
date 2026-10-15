<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SaldoBadge from '@/components/SaldoBadge.vue'
import { useCategorias } from '@/composables/useCategorias'
import { produtoService } from '@/services'
import type { Produto } from '@/types/api'
import { mensagemDeErro } from '@/utils/erros'
import { formatarNumero } from '@/utils/format'

const { categorias } = useCategorias()

const produtos = ref<Produto[]>([])
const carregando = ref(true)
const erro = ref('')

const busca = ref('')
const categoriaId = ref<number | ''>('')
const soNegativos = ref(false)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    // Filtro de categoria é feito na API; busca textual é local (lista pequena)
    produtos.value = await produtoService.listar(categoriaId.value || undefined)
  } catch (e) {
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}
watch(categoriaId, carregar, { immediate: true })

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const filtrados = computed(() => {
  const termo = normalizar(busca.value.trim())
  return produtos.value.filter(
    (p) =>
      (!soNegativos.value || p.saldo < 0) &&
      (!termo || normalizar([p.nome, p.marca, p.codigo_barras].join(' ')).includes(termo)),
  )
})

const totalNegativos = computed(() => produtos.value.filter((p) => p.saldo < 0).length)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Catálogo</h1>
        <p>{{ formatarNumero(produtos.length) }} produtos ativos · saldo em embalagens</p>
      </div>
      <RouterLink :to="{ name: 'produto-novo' }" class="btn btn-primary">+ Cadastrar produto</RouterLink>
    </header>

    <div class="card filtros">
      <label class="field busca">
        <span>Buscar</span>
        <input v-model="busca" type="search" placeholder="Nome, marca ou código" />
      </label>
      <label class="field">
        <span>Categoria</span>
        <select v-model="categoriaId">
          <option value="">Todas</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="soNegativos" type="checkbox" />
        Só saldo negativo ({{ totalNegativos }})
      </label>
    </div>

    <p v-if="erro" class="alert alert-danger">
      {{ erro }} <button class="btn btn-sm" @click="carregar">Tentar novamente</button>
    </p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Produto</th>
            <th>Unidade</th>
            <th>Categoria</th>
            <th class="num">Saldo</th>
            <th><span class="sr">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="carregando">
            <td colspan="6" class="vazio">Carregando…</td>
          </tr>
          <tr v-else-if="!filtrados.length">
            <td colspan="6" class="vazio">Nenhum produto encontrado.</td>
          </tr>
          <tr v-for="p in filtrados" v-else :key="p.id">
            <td class="mono small">{{ p.codigo_barras ?? '—' }}</td>
            <td>
              <strong>{{ p.nome }}</strong>
              <span v-if="p.marca" class="muted"> · {{ p.marca }}</span>
            </td>
            <td class="muted">{{ p.unidade ?? '—' }}</td>
            <td>{{ p.categoria.nome }}</td>
            <td class="num"><SaldoBadge :saldo="p.saldo" /></td>
            <td>
              <div class="acoes">
                <RouterLink :to="{ name: 'movimentacoes', query: { produto_id: p.id } }" class="btn btn-sm btn-link">
                  Histórico
                </RouterLink>
                <RouterLink :to="{ name: 'produto-editar', params: { id: p.id } }" class="btn btn-sm">
                  Editar
                </RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filtros {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 12px;
  align-items: end;
}
@media (max-width: 720px) {
  .filtros {
    grid-template-columns: 1fr;
  }
}
</style>
