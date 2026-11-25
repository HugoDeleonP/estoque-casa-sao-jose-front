import { computed, ref } from 'vue'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'csj.tema'

/** Escolha salva; na primeira visita, o tema do sistema operacional. */
function inicial(): Tema {
  try {
    const v = localStorage.getItem(CHAVE)
    if (v === 'claro' || v === 'escuro') return v
  } catch {
    // armazenamento indisponível
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

// Estado global: um tema para o app inteiro
const tema = ref<Tema>(inicial())

/** Os tokens de cor (style.css) reagem a data-theme="light" | "dark" no <html>. */
function aplicar() {
  document.documentElement.dataset.theme = tema.value === 'escuro' ? 'dark' : 'light'
}
aplicar()

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
    escuro: computed(() => tema.value === 'escuro'),
    definir,
    alternar: () => definir(tema.value === 'escuro' ? 'claro' : 'escuro'),
  }
}
