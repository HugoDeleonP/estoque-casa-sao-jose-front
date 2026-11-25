import { computed, ref } from 'vue'

/** automatico = segue o sistema operacional (prefers-color-scheme). */
export type Tema = 'automatico' | 'claro' | 'escuro'

const CHAVE = 'csj.tema'
const ORDEM: Tema[] = ['automatico', 'claro', 'escuro']
const midiaEscura = window.matchMedia('(prefers-color-scheme: dark)')

function lerSalvo(): Tema {
  try {
    const v = localStorage.getItem(CHAVE)
    return ORDEM.includes(v as Tema) ? (v as Tema) : 'automatico'
  } catch {
    return 'automatico'
  }
}

// Estado global: um tema para o app inteiro
const tema = ref<Tema>(lerSalvo())
const sistemaEscuro = ref(midiaEscura.matches)
midiaEscura.addEventListener('change', (e) => (sistemaEscuro.value = e.matches))

const escuro = computed(() => tema.value === 'escuro' || (tema.value === 'automatico' && sistemaEscuro.value))

/** Os tokens de cor (style.css) reagem a data-theme="light" | "dark" no <html>. */
function aplicar() {
  const raiz = document.documentElement
  if (tema.value === 'automatico') delete raiz.dataset.theme
  else raiz.dataset.theme = tema.value === 'escuro' ? 'dark' : 'light'
}

function definir(novo: Tema) {
  tema.value = novo
  aplicar()
  try {
    localStorage.setItem(CHAVE, novo)
  } catch {
    // armazenamento indisponível: o tema vale só nesta aba
  }
}

export function useTema() {
  return {
    tema,
    escuro,
    definir,
    /** Automático → Claro → Escuro → Automático */
    alternar: () => definir(ORDEM[(ORDEM.indexOf(tema.value) + 1) % ORDEM.length]!),
  }
}
