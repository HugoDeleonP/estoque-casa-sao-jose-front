<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import ProdutoForm from '@/components/ProdutoForm.vue'
import SaldoBadge from '@/components/SaldoBadge.vue'
import TipoBadge from '@/components/TipoBadge.vue'
import { ApiError } from '@/config'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { movimentacaoService, produtoService } from '@/services'
import type { Produto, ProdutoExcluido, ProdutoInput } from '@/types/api'
import { codigoValido, normalizarCodigo } from '@/utils/codigoBarras'
import { errosDeCampo, mensagemDeErro } from '@/utils/erros'
import { descricaoProduto, formatarDataHora, formatarDelta, formatarHora, formatarSaldo } from '@/utils/format'

type Modo = 'ENTRADA' | 'SAIDA'

interface Leitura {
  modo: Modo
  quantidade: number
}

/** Bip que precisa de decisão do operador antes de virar movimentação. */
type Pendente =
  | ({ tipo: 'cadastro'; codigo: string } & Leitura)
  | ({ tipo: 'reativar'; produto: ProdutoExcluido } & Leitura)

interface RegistroSessao {
  id: number
  descricao: string
  modo: Modo
  quantidade: number
  saldo: number
  hora: string
}

const toast = useToast()
const { isAdmin } = useAuth()

/** F4.2: leitura idêntica repetida em menos disto é bip duplo do leitor → descartada. */
const JANELA_DUPLICADO_MS = 300
let ultimaLeitura = { codigo: '', em: -Infinity }

/** F4.3: falha visível até a próxima leitura bem-sucedida. */
const falha = ref<{ codigo: string; motivo: string } | null>(null)

/** F5.3 (RNF03): tempo do Enter do leitor até a linha aparecer na tela. */
const ultimoTempoMs = ref<number | null>(null)
const medicoes: number[] = []
;(window as unknown as { __medicoesBancada: number[] }).__medicoesBancada = medicoes

const modo = ref<Modo>('ENTRADA')
const quantidade = ref(1)
const codigo = ref('')
const campoLeitor = ref<HTMLInputElement>()
const leitorAtivo = ref(false)
const processando = ref(false)

const pendente = ref<Pendente | null>(null)
const errosForm = ref<Record<string, string>>({})
const enviando = ref(false)
const sessao = ref<RegistroSessao[]>([])

// Leituras em sequência rápida são processadas em ordem, uma de cada vez
let fila: Promise<void> = Promise.resolve()

/**
 * F4.1: o campo do leitor recupera o foco sozinho quando ninguém está digitando em outro
 * lugar (depois de toasts, cliques em área vazia, troca de janela...). O leitor HID
 * "digita" onde estiver o foco: sem isso, um bip se perderia.
 */
function editandoOutroCampo() {
  const el = document.activeElement
  return (
    el instanceof HTMLElement &&
    el !== campoLeitor.value &&
    el !== document.body &&
    el.matches('input, select, textarea, button, a, [contenteditable]')
  )
}
function garantirFoco() {
  if (!pendente.value && !editandoOutroCampo() && document.activeElement !== campoLeitor.value) {
    campoLeitor.value?.focus()
  }
}
let vigia: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  focarLeitor()
  vigia = setInterval(garantirFoco, 400)
  window.addEventListener('focus', garantirFoco)
})
onUnmounted(() => {
  clearInterval(vigia)
  window.removeEventListener('focus', garantirFoco)
})

function focarLeitor() {
  nextTick(() => campoLeitor.value?.focus())
}

/** O leitor HID "digita" o código e envia Enter. */
function aoLer() {
  const inicio = performance.now()
  const lido = normalizarCodigo(codigo.value)
  codigo.value = ''
  if (!lido) return
  if (lido === ultimaLeitura.codigo && inicio - ultimaLeitura.em < JANELA_DUPLICADO_MS) return
  ultimaLeitura = { codigo: lido, em: inicio }

  const leitura: Leitura = { modo: modo.value, quantidade: Math.max(1, Math.floor(quantidade.value || 1)) }
  quantidade.value = 1
  fila = fila.then(() => processar(lido, leitura, inicio))
}

async function processar(lido: string, leitura: Leitura, inicio: number) {
  if (!codigoValido(lido)) {
    falha.value = { codigo: lido, motivo: 'código inválido (esperado de 8 a 14 dígitos)' }
    toast.erro(`Código "${lido}" inválido. Esperado de 8 a 14 dígitos.`)
    return
  }
  processando.value = true
  try {
    const produto = await produtoService.buscarPorCodigo(lido)
    await registrar(produto, leitura)
    falha.value = null
    await nextTick()
    medir(inicio)
  } catch (e) {
    if (e instanceof ApiError && e.naoEncontrado) {
      falha.value = null
      await tratarNaoEncontrado(lido, leitura)
    } else if (!(e instanceof ApiError && e.naoAutenticado)) {
      // Nenhuma falha silenciosa: sem internet, timeout ou erro do servidor
      falha.value = { codigo: lido, motivo: mensagemDeErro(e) }
      toast.erro(`Não registrado — leia novamente. ${mensagemDeErro(e)}`)
    }
  } finally {
    processando.value = false
  }
}

function medir(inicio: number) {
  const ms = Math.round(performance.now() - inicio)
  ultimoTempoMs.value = ms
  medicoes.push(ms)
}

/** RN09: código de produto excluído oferece reativação, não novo cadastro. */
async function tratarNaoEncontrado(lido: string, leitura: Leitura) {
  errosForm.value = {}
  try {
    const excluido = await produtoService.buscarExcluidoPorCodigo(lido)
    pendente.value = { tipo: 'reativar', produto: excluido, ...leitura }
  } catch {
    pendente.value = { tipo: 'cadastro', codigo: lido, ...leitura }
  }
}

async function registrar(produto: Produto, { modo, quantidade }: Leitura) {
  const delta = modo === 'ENTRADA' ? quantidade : -quantidade
  const mov = await movimentacaoService.registrar({ produto_id: produto.id, tipo: modo, quantidade: delta })
  const descricao = descricaoProduto(produto)

  sessao.value.unshift({
    id: mov.id,
    descricao,
    modo,
    quantidade: delta,
    saldo: mov.saldo_atual,
    hora: formatarHora(mov.created_at),
  })
  sessao.value.splice(15)

  toast.sucesso(`${modo === 'ENTRADA' ? 'Entrada' : 'Saída'} ${formatarDelta(delta)} · ${descricao}`)
  if (mov.alerta_saldo_negativo) {
    // RN06: alerta não bloqueante
    toast.aviso(`${descricao} ficou com saldo ${formatarSaldo(mov.saldo_atual)}. Registre a entrada pendente.`)
  }
}

async function cadastrarERegistrar(dados: ProdutoInput) {
  const p = pendente.value
  if (p?.tipo !== 'cadastro') return
  enviando.value = true
  errosForm.value = {}
  try {
    const produto = await produtoService.cadastrar(dados)
    toast.info(`Produto cadastrado: ${descricaoProduto(produto)}`)
    await registrar(produto, p)
    pendente.value = null
    focarLeitor()
  } catch (e) {
    errosForm.value = errosDeCampo(e)
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}

async function reativarERegistrar() {
  const p = pendente.value
  if (p?.tipo !== 'reativar') return
  enviando.value = true
  try {
    const produto = await produtoService.reativar(p.produto.id)
    toast.info(`Produto reativado: ${descricaoProduto(produto)}`)
    await registrar(produto, p)
    pendente.value = null
    focarLeitor()
  } catch (e) {
    toast.erro(mensagemDeErro(e))
  } finally {
    enviando.value = false
  }
}

function descartar() {
  pendente.value = null
  focarLeitor()
}

function trocarModo(m: Modo) {
  modo.value = m
  focarLeitor()
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Bancada</h1>
        <p>Escolha Entrada ou Saída e passe o produto no leitor.</p>
      </div>
    </header>

    <section class="card leitor" :class="modo.toLowerCase()">
      <div class="modos" role="radiogroup" aria-label="Tipo de movimentação">
        <button
          type="button"
          role="radio"
          class="modo entrada"
          :aria-checked="modo === 'ENTRADA'"
          @click="trocarModo('ENTRADA')"
        >
          <span class="seta" aria-hidden="true">↓</span> Entrada
          <small>doação recebida</small>
        </button>
        <button
          type="button"
          role="radio"
          class="modo saida"
          :aria-checked="modo === 'SAIDA'"
          @click="trocarModo('SAIDA')"
        >
          <span class="seta" aria-hidden="true">↑</span> Saída
          <small>entregue às famílias</small>
        </button>
      </div>

      <!-- div, não form: com 2 campos e sem botão, o Enter não dispara submit implícito -->
      <div class="leitura">
        <label class="field codigo">
          <span>Código de barras</span>
          <input
            ref="campoLeitor"
            v-model="codigo"
            class="mono"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Aguardando leitura…"
            @keydown.enter.prevent="aoLer"
            @focus="leitorAtivo = true"
            @blur="leitorAtivo = false"
          />
        </label>
        <label class="field qtd">
          <span>Embalagens</span>
          <input v-model.number="quantidade" type="number" min="1" step="1" @keydown.enter.prevent="focarLeitor" />
        </label>
      </div>

      <p class="status" :class="{ ativo: leitorAtivo }" @click="focarLeitor">
        <template v-if="processando">Registrando…</template>
        <template v-else-if="leitorAtivo">● Leitor pronto · próxima leitura: {{ modo === 'ENTRADA' ? 'entrada' : 'saída' }} de {{ quantidade || 1 }}</template>
        <template v-else>○ Clique aqui para ativar o leitor</template>
      </p>
      <p v-if="falha" class="alert alert-danger falha" role="alert">
        <strong>Não registrado — leia novamente.</strong>
        Código <code>{{ falha.codigo }}</code>: {{ falha.motivo }}
      </p>
      <p class="small muted">
        A quantidade volta para 1 após cada leitura. Leu errado? Registre um ajuste.
        <span v-if="ultimoTempoMs !== null" class="tempo">Última leitura: {{ ultimoTempoMs }} ms</span>
      </p>
    </section>

    <!-- Produto excluído: reativar (RN09). Painel, não modal: o Enter do próximo bip não confirma nada. -->
    <section v-if="pendente?.tipo === 'reativar'" class="card pendente">
      <h2>Produto excluído do catálogo</h2>
      <p>
        <strong>{{ descricaoProduto(pendente.produto) }}</strong>
        (<code>{{ pendente.produto.codigo_barras }}</code>) foi excluído em
        {{ formatarDataHora(pendente.produto.deleted_at) }}.
      </p>
      <template v-if="isAdmin">
        <p class="muted">Reative para manter o histórico do mesmo item, em vez de cadastrar de novo.</p>
        <div class="row">
          <button type="button" class="btn btn-primary" :disabled="enviando" @click="reativarERegistrar">
            Reativar e registrar {{ pendente.modo === 'ENTRADA' ? 'entrada' : 'saída' }} de {{ pendente.quantidade }}
          </button>
          <button type="button" class="btn" @click="descartar">Descartar leitura</button>
        </div>
      </template>
      <template v-else>
        <p class="alert alert-warn">
          Só o voluntário chefe pode reativar produtos. Separe a embalagem e avise-o; a leitura não foi
          registrada.
        </p>
        <div>
          <button type="button" class="btn" @click="descartar">Entendi, descartar leitura</button>
        </div>
      </template>
    </section>

    <section v-else-if="pendente?.tipo === 'cadastro'" :key="pendente.codigo" class="card pendente">
      <h2>Produto novo</h2>
      <p class="muted">
        O código <code>{{ pendente.codigo }}</code> não está no catálogo. Cadastre para registrar a
        {{ pendente.modo === 'ENTRADA' ? 'entrada' : 'saída' }} de {{ pendente.quantidade }}.
      </p>
      <ProdutoForm
        :inicial="{ codigo_barras: pendente.codigo }"
        :erros="errosForm"
        :enviando="enviando"
        codigo-travado
        rotulo-enviar="Cadastrar e registrar"
        @enviar="cadastrarERegistrar"
        @cancelar="descartar"
      />
    </section>

    <section class="card">
      <h2>Leituras desta sessão</h2>
      <div v-if="sessao.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th class="num">Qtd.</th>
              <th class="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sessao" :key="r.id">
              <td class="mono small">{{ r.hora }}</td>
              <td><TipoBadge :tipo="r.modo" /></td>
              <td>{{ r.descricao }}</td>
              <td class="num">{{ formatarDelta(r.quantidade) }}</td>
              <td class="num"><SaldoBadge :saldo="r.saldo" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="vazio">Nenhuma leitura ainda.</p>
    </section>
  </div>
</template>

<style scoped>
.leitor {
  display: grid;
  gap: 16px;
  border-top: 4px solid var(--series-entrada);
}
.leitor.saida {
  border-top-color: var(--series-saida);
}
.modos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modo {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 16px 12px;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 600;
  border-radius: var(--radius);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
}
.modo small {
  font-size: 0.8125rem;
  font-weight: 500;
}
.seta {
  font-size: 1.5rem;
  line-height: 1;
}
.modo.entrada[aria-checked='true'] {
  border-color: var(--series-entrada);
  color: var(--series-entrada);
  background: color-mix(in srgb, var(--series-entrada) 10%, var(--surface));
}
.modo.saida[aria-checked='true'] {
  border-color: var(--series-saida);
  color: var(--series-saida);
  background: color-mix(in srgb, var(--series-saida) 10%, var(--surface));
}
.leitura {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
}
.codigo input {
  font-size: 1.5rem;
  min-height: 56px;
  letter-spacing: 0.05em;
}
.qtd input {
  font-size: 1.25rem;
  min-height: 56px;
  text-align: center;
}
.status {
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.status.ativo {
  color: var(--ok);
  background: var(--ok-bg);
}
.falha {
  font-size: 1.0625rem;
}
.tempo {
  margin-left: 8px;
  font-variant-numeric: tabular-nums;
}
.pendente {
  display: grid;
  gap: 12px;
  border: 2px solid var(--warn);
}
@media (max-width: 520px) {
  .leitura {
    grid-template-columns: 1fr;
  }
}
</style>
