<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TipoBadge from '@/components/TipoBadge.vue'
import { movimentacaoService, produtoService } from '@/services'
import { TIPOS_MOVIMENTACAO, type Movimentacao, type Produto, type TipoMovimentacao } from '@/types/api'
import { mensagemDeErro } from '@/utils/erros'
import { descricaoProduto, formatarDataHora, formatarDelta } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const ROTULO_TIPO: Record<TipoMovimentacao, string> = { ENTRADA: 'Entradas', SAIDA: 'Saídas', AJUSTE: 'Ajustes' }
const LIMITES = [50, 100, 250, 500]

// Filtros espelhados na URL: o link "Histórico" do catálogo já abre filtrado
const produtoId = ref<number | ''>(Number(route.query.produto_id) || '')
const tipo = ref<TipoMovimentacao | ''>((route.query.tipo as TipoMovimentacao) || '')
const limite = ref(100)

const produtos = ref<Produto[]>([])
const movs = ref<Movimentacao[]>([])
const carregando = ref(true)
const erro = ref('')

onMounted(async () => {
  produtos.value = await produtoService.listar().catch(() => [])
})

async function carregar() {
  carregando.value = true
  erro.value = ''
  router.replace({ query: { produto_id: produtoId.value || undefined, tipo: tipo.value || undefined } })
  try {
    movs.value = await movimentacaoService.listar({
      produto_id: produtoId.value || undefined,
      tipo: tipo.value || undefined,
      limite: limite.value,
    })
  } catch (e) {
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}
watch([produtoId, tipo, limite], carregar, { immediate: true })

const produtoSelecionado = computed(() => produtos.value.find((p) => p.id === produtoId.value))
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Histórico de movimentações</h1>
        <p>Registros imutáveis, do mais recente para o mais antigo. Correções são feitas por ajuste.</p>
      </div>
      <RouterLink
        v-if="produtoSelecionado"
        :to="{ name: 'ajuste', query: { produto_id: produtoSelecionado.id } }"
        class="btn"
      >
        Ajustar este produto
      </RouterLink>
    </header>

    <div class="card filtros">
      <label class="field">
        <span>Produto</span>
        <select v-model="produtoId">
          <option value="">Todos</option>
          <option v-for="p in produtos" :key="p.id" :value="p.id">{{ descricaoProduto(p) }}</option>
        </select>
      </label>
      <label class="field">
        <span>Tipo</span>
        <select v-model="tipo">
          <option value="">Todos</option>
          <option v-for="t in TIPOS_MOVIMENTACAO" :key="t" :value="t">{{ ROTULO_TIPO[t] }}</option>
        </select>
      </label>
      <label class="field">
        <span>Mostrar</span>
        <select v-model.number="limite">
          <option v-for="l in LIMITES" :key="l" :value="l">Últimas {{ l }}</option>
        </select>
      </label>
    </div>

    <p v-if="erro" class="alert alert-danger">{{ erro }}</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data e hora</th>
            <th>Tipo</th>
            <th>Produto</th>
            <th class="num">Quantidade</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="carregando">
            <td colspan="5" class="vazio">Carregando…</td>
          </tr>
          <tr v-else-if="!movs.length">
            <td colspan="5" class="vazio">Nenhuma movimentação encontrada.</td>
          </tr>
          <tr v-for="m in movs" v-else :key="m.id">
            <td class="mono small">{{ formatarDataHora(m.created_at) }}</td>
            <td><TipoBadge :tipo="m.tipo" /></td>
            <td>{{ m.produto_nome }}</td>
            <td class="num">{{ formatarDelta(m.quantidade) }}</td>
            <td class="muted">{{ m.observacao ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filtros {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .filtros {
    grid-template-columns: 1fr;
  }
}
</style>
