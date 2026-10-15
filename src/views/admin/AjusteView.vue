<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SaldoBadge from '@/components/SaldoBadge.vue'
import TipoBadge from '@/components/TipoBadge.vue'
import { useToast } from '@/composables/useToast'
import { movimentacaoService, produtoService } from '@/services'
import type { Movimentacao, Produto } from '@/types/api'
import { mensagemDeErro } from '@/utils/erros'
import { descricaoProduto, formatarDataHora, formatarDelta, formatarSaldo } from '@/utils/format'

const route = useRoute()
const toast = useToast()

const MOTIVOS = ['Vencimento', 'Avaria', 'Correção de contagem', 'Leitura errada na bancada']

const produtos = ref<Produto[]>([])
const produtoId = ref<number | ''>(Number(route.query.produto_id) || '')
/** contagem: informa quanto há fisicamente; delta: informa a diferença direto. */
const forma = ref<'contagem' | 'delta'>('contagem')
const contagem = ref<number | ''>('')
const deltaManual = ref<number | ''>('')
const observacao = ref('')
const enviando = ref(false)
const recentes = ref<Movimentacao[]>([])

const produto = computed(() => produtos.value.find((p) => p.id === produtoId.value))

const delta = computed(() => {
  if (!produto.value) return 0
  if (forma.value === 'contagem') return contagem.value === '' ? 0 : Math.floor(contagem.value) - produto.value.saldo
  return deltaManual.value === '' ? 0 : Math.floor(deltaManual.value)
})

const podeEnviar = computed(() => !!produto.value && delta.value !== 0 && observacao.value.trim().length > 0)

async function carregarProdutos() {
  produtos.value = await produtoService.listar()
}

async function carregarRecentes() {
  recentes.value = await movimentacaoService.listar({ tipo: 'AJUSTE', limite: 10 }).catch(() => [])
}

onMounted(async () => {
  try {
    await Promise.all([carregarProdutos(), carregarRecentes()])
  } catch (e) {
    toast.erro(mensagemDeErro(e))
  }
})

async function registrar() {
  if (!produto.value || !podeEnviar.value) return
  enviando.value = true
  try {
    const mov = await movimentacaoService.registrar({
      produto_id: produto.value.id,
      tipo: 'AJUSTE',
      quantidade: delta.value,
      observacao: observacao.value.trim(),
    })
    toast.sucesso(
      `Ajuste ${formatarDelta(mov.quantidade)} em ${descricaoProduto(produto.value)}. Saldo: ${formatarSaldo(mov.saldo_atual)}`,
    )
    contagem.value = ''
    deltaManual.value = ''
    observacao.value = ''
    await Promise.all([carregarProdutos(), carregarRecentes()])
  } catch (e) {
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Ajuste de estoque</h1>
        <p>Corrige o saldo sem contar como entrada ou saída nos indicadores. O motivo é obrigatório.</p>
      </div>
    </header>

    <form class="card stack" @submit.prevent="registrar">
      <label class="field">
        <span>Produto *</span>
        <select v-model="produtoId">
          <option value="" disabled>Selecione…</option>
          <option v-for="p in produtos" :key="p.id" :value="p.id">
            {{ descricaoProduto(p) }} (saldo {{ formatarSaldo(p.saldo) }})
          </option>
        </select>
      </label>

      <template v-if="produto">
        <p>Saldo no sistema: <SaldoBadge :saldo="produto.saldo" /></p>

        <div class="row" role="radiogroup" aria-label="Forma de ajuste">
          <label class="check"><input v-model="forma" type="radio" value="contagem" /> Informar contagem física</label>
          <label class="check"><input v-model="forma" type="radio" value="delta" /> Informar diferença</label>
        </div>

        <div class="grade">
          <label v-if="forma === 'contagem'" class="field">
            <span>Quantidade contada na prateleira</span>
            <input v-model.number="contagem" type="number" min="0" step="1" />
          </label>
          <label v-else class="field">
            <span>Diferença (+ acrescenta, − retira)</span>
            <input v-model.number="deltaManual" type="number" step="1" />
          </label>

          <div class="resultado" :class="{ neutro: delta === 0 }">
            <span class="muted small">Ajuste a registrar</span>
            <strong>{{ delta === 0 ? '—' : formatarDelta(delta) }}</strong>
            <span class="muted small">Novo saldo: {{ formatarSaldo(produto.saldo + delta) }}</span>
          </div>
        </div>

        <label class="field">
          <span>Motivo *</span>
          <div class="chips">
            <button v-for="m in MOTIVOS" :key="m" type="button" class="btn btn-sm" @click="observacao = m">{{ m }}</button>
          </div>
          <textarea v-model="observacao" maxlength="200" placeholder="Descreva o motivo do ajuste" />
          <small class="dica">{{ observacao.length }}/200</small>
        </label>

        <div>
          <button type="submit" class="btn btn-primary" :disabled="!podeEnviar || enviando">
            {{ enviando ? 'Registrando…' : 'Registrar ajuste' }}
          </button>
        </div>
      </template>
    </form>

    <section class="card">
      <h2>Ajustes recentes</h2>
      <div v-if="recentes.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th class="num">Qtd.</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in recentes" :key="m.id">
              <td class="mono small">{{ formatarDataHora(m.created_at) }}</td>
              <td><TipoBadge :tipo="m.tipo" /></td>
              <td>{{ m.produto_nome }}</td>
              <td class="num">{{ formatarDelta(m.quantidade) }}</td>
              <td class="muted">{{ m.observacao }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="vazio">Nenhum ajuste registrado.</p>
    </section>
  </div>
</template>

<style scoped>
.grade {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: end;
}
.resultado {
  display: grid;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-bg);
}
.resultado strong {
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}
.resultado.neutro {
  background: var(--surface-2);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
@media (max-width: 560px) {
  .grade {
    grid-template-columns: 1fr;
  }
}
</style>
