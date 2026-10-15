<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import KpiCard from '@/components/KpiCard.vue'
import SaldoBadge from '@/components/SaldoBadge.vue'
import { useCategorias } from '@/composables/useCategorias'
import { dashboardService } from '@/services'
import type { DashboardResumo, PendenciaSaldo, PontoSerie } from '@/types/api'
import { mensagemDeErro } from '@/utils/erros'
import { formatarHora, formatarNumero } from '@/utils/format'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

/** RF04 pede "tempo real": atualização periódica, leve o bastante para hardware fraco. */
const INTERVALO_MS = 30_000
const PERIODOS = [7, 30, 90]

const { categorias } = useCategorias()
const categoriaId = ref<number | ''>('')
const dias = ref(30)

const resumo = ref<DashboardResumo | null>(null)
const pendencias = ref<PendenciaSaldo[]>([])
const serie = ref<PontoSerie[]>([])
const erro = ref('')
const atualizadoEm = ref('')
const verTabela = ref(false)

const canvas = ref<HTMLCanvasElement>()
const grafico = shallowRef<Chart<'bar'>>()

async function carregar() {
  const filtro = { categoria_id: categoriaId.value || undefined, dias: dias.value }
  try {
    const [r, p, s] = await Promise.all([
      dashboardService.resumo(filtro),
      dashboardService.pendencias(filtro.categoria_id),
      dashboardService.serie(filtro),
    ])
    resumo.value = r
    pendencias.value = p
    serie.value = s
    erro.value = ''
    atualizadoEm.value = formatarHora(new Date().toISOString())
    desenhar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

watch([categoriaId, dias], carregar)

let timer: ReturnType<typeof setInterval> | undefined
const esquemaEscuro = window.matchMedia('(prefers-color-scheme: dark)')
const aoTrocarTema = () => {
  grafico.value?.destroy()
  grafico.value = undefined
  desenhar()
}

onMounted(() => {
  carregar()
  timer = setInterval(carregar, INTERVALO_MS)
  esquemaEscuro.addEventListener('change', aoTrocarTema)
})
onUnmounted(() => {
  clearInterval(timer)
  esquemaEscuro.removeEventListener('change', aoTrocarTema)
  grafico.value?.destroy()
})

const rotuloDia = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function desenhar() {
  if (!canvas.value) return
  const css = getComputedStyle(document.documentElement)
  const cor = (v: string) => css.getPropertyValue(v).trim()

  const labels = serie.value.map((p) => rotuloDia(p.data))
  const entradas = serie.value.map((p) => p.entradas)
  const saidas = serie.value.map((p) => p.saidas)

  if (grafico.value) {
    grafico.value.data.labels = labels
    grafico.value.data.datasets[0]!.data = entradas
    grafico.value.data.datasets[1]!.data = saidas
    grafico.value.update('none')
    return
  }

  const barra = { borderRadius: 4, borderSkipped: 'start' as const, barPercentage: 0.9, categoryPercentage: 0.8 }
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: entradas, backgroundColor: cor('--series-entrada'), ...barra },
        { label: 'Saídas', data: saidas, backgroundColor: cor('--series-saida'), ...barra },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: cor('--surface'),
          titleColor: cor('--text'),
          bodyColor: cor('--text-2'),
          borderColor: cor('--border-strong'),
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          callbacks: { label: (c) => ` ${c.dataset.label}: ${formatarNumero(c.parsed.y ?? 0)} embalagens` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: cor('--border-strong') },
          ticks: { color: cor('--text-3'), maxRotation: 0, autoSkipPadding: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: cor('--border') },
          border: { display: false },
          ticks: { color: cor('--text-3'), precision: 0 },
        },
      },
    },
  }
  grafico.value = new Chart(canvas.value, config)
}

const totaisSerie = computed(() => ({
  entradas: serie.value.reduce((s, p) => s + p.entradas, 0),
  saidas: serie.value.reduce((s, p) => s + p.saidas, 0),
}))
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Indicadores</h1>
        <p>
          Quantidades em itens/embalagens. Ajustes não entram em entradas e saídas.
          <span v-if="atualizadoEm">Atualizado às {{ atualizadoEm }}.</span>
        </p>
      </div>
      <div class="filtros">
        <label class="field">
          <span>Categoria</span>
          <select v-model="categoriaId">
            <option value="">Todas</option>
            <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
          </select>
        </label>
        <div class="field">
          <span>Período</span>
          <div class="segmentado" role="radiogroup" aria-label="Período">
            <button
              v-for="p in PERIODOS"
              :key="p"
              type="button"
              role="radio"
              :aria-checked="dias === p"
              @click="dias = p"
            >
              {{ p }} dias
            </button>
          </div>
        </div>
      </div>
    </header>

    <p v-if="erro" class="alert alert-danger">
      {{ erro }}
      <span class="small">(As rotas /api/dashboard/* ainda não existem no backend; use o modo mock.)</span>
    </p>

    <section v-if="resumo" class="kpis">
      <KpiCard
        rotulo="Saldo em estoque"
        :valor="formatarNumero(resumo.saldo_total)"
        :detalhe="`${resumo.total_produtos} produtos · ${resumo.produtos_saldo_negativo} com pendência`"
      />
      <KpiCard
        rotulo="Entradas (doações)"
        :valor="formatarNumero(resumo.total_entradas)"
        :detalhe="`últimos ${dias} dias`"
      />
      <KpiCard
        rotulo="Saídas (entregas)"
        :valor="formatarNumero(resumo.total_saidas)"
        :detalhe="`últimos ${dias} dias`"
      />
      <KpiCard
        rotulo="Produtos com saldo negativo"
        :valor="formatarNumero(resumo.produtos_saldo_negativo)"
        detalhe="entradas não registradas"
        :destaque="resumo.produtos_saldo_negativo > 0 ? 'perigo' : undefined"
      />
    </section>

    <section class="card">
      <div class="grafico-topo">
        <h2>Entradas e saídas por dia</h2>
        <div class="legenda" aria-hidden="true">
          <span><i class="cor entrada" /> Entradas</span>
          <span><i class="cor saida" /> Saídas</span>
        </div>
        <button type="button" class="btn btn-sm" @click="verTabela = !verTabela">
          {{ verTabela ? 'Ver gráfico' : 'Ver tabela' }}
        </button>
      </div>

      <div v-show="!verTabela" class="grafico">
        <canvas
          ref="canvas"
          role="img"
          :aria-label="`Entradas e saídas por dia, últimos ${dias} dias: ${totaisSerie.entradas} entradas e ${totaisSerie.saidas} saídas`"
        />
      </div>

      <div v-if="verTabela" class="table-wrap tabela-serie">
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th class="num">Entradas</th>
              <th class="num">Saídas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in [...serie].reverse()" :key="p.data">
              <td class="mono small">{{ rotuloDia(p.data) }}</td>
              <td class="num">{{ formatarNumero(p.entradas) }}</td>
              <td class="num">{{ formatarNumero(p.saidas) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Pendências: saldo negativo</h2>
      <p class="muted small">
        Saldo negativo indica entrada não registrada. Regularize com uma entrada na Bancada ou um ajuste.
      </p>
      <div v-if="pendencias.length" class="table-wrap pendencias">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th class="num">Saldo</th>
              <th><span class="sr">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pendencias" :key="p.produto_id">
              <td>
                <strong>{{ p.nome }}</strong>
                <span v-if="p.marca" class="muted"> · {{ p.marca }}</span>
              </td>
              <td>{{ p.categoria }}</td>
              <td class="num"><SaldoBadge :saldo="p.saldo" /></td>
              <td>
                <div class="acoes">
                  <RouterLink :to="{ name: 'movimentacoes', query: { produto_id: p.produto_id } }" class="btn btn-sm btn-link">
                    Histórico
                  </RouterLink>
                  <RouterLink :to="{ name: 'ajuste', query: { produto_id: p.produto_id } }" class="btn btn-sm">
                    Ajustar
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="resumo" class="vazio">Nenhuma pendência. ✓</p>
    </section>
  </div>
</template>

<style scoped>
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}
.filtros select {
  min-width: 180px;
}
.segmentado {
  display: inline-flex;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.segmentado button {
  font: inherit;
  font-size: 0.875rem;
  padding: 0 12px;
  min-height: 40px;
  border: none;
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
}
.segmentado button + button {
  border-left: 1px solid var(--border-strong);
}
.segmentado button[aria-checked='true'] {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.grafico-topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 12px;
}
.grafico-topo h2 {
  margin-right: auto;
}
.legenda {
  display: flex;
  gap: 14px;
  font-size: 0.875rem;
  color: var(--text-2);
}
.legenda span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cor {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.cor.entrada {
  background: var(--series-entrada);
}
.cor.saida {
  background: var(--series-saida);
}
.grafico {
  position: relative;
  height: 280px;
}
.tabela-serie {
  max-height: 320px;
  overflow-y: auto;
}
.pendencias {
  margin-top: 12px;
}
</style>
