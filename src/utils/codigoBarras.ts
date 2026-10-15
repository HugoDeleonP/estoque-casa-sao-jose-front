/** Mesma regra da API (shared/validation/tipos.py): EAN-8, UPC-A, EAN-13 e ITF-14. */
export const PADRAO_CODIGO_BARRAS = /^\d{8,14}$/

export const normalizarCodigo = (bruto: string) => bruto.replace(/\s+/g, '')
export const codigoValido = (codigo: string) => PADRAO_CODIGO_BARRAS.test(codigo)
