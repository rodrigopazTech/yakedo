import { bancoDeClave } from "./bancos.ts"

export const LARGO_CLABE = 18

const PESOS = [3, 7, 1] as const

export interface ClabeValida {
  clabe: string
  banco: string
  claveBanco: string
  ultimos4: string
}

export type ResultadoClabe =
  | { tipo: "vacia" }
  | { tipo: "incompleta"; escritos: number; faltan: number }
  | { tipo: "invalida" }
  | { tipo: "valida"; clabe: ClabeValida }

export function soloNumeros(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, LARGO_CLABE)
}

/** Dígito de control público: (10 − (suma de (dígito × peso) mod 10)) mod 10. */
export function digitoControl(diecisiete: string): string {
  let suma = 0
  for (let i = 0; i < 17; i += 1) {
    suma += (Number(diecisiete[i]) * PESOS[i % 3]) % 10
  }
  return String((10 - (suma % 10)) % 10)
}

export function completarClabe(diecisiete: string): string {
  return `${diecisiete}${digitoControl(diecisiete)}`
}

export function revisarClabe(valor: string): ResultadoClabe {
  const clabe = soloNumeros(valor)
  if (clabe.length === 0) return { tipo: "vacia" }
  if (clabe.length < LARGO_CLABE) {
    return { tipo: "incompleta", escritos: clabe.length, faltan: LARGO_CLABE - clabe.length }
  }
  const cuerpo = clabe.slice(0, 17)
  if (digitoControl(cuerpo) !== clabe[17]) return { tipo: "invalida" }
  const banco = bancoDeClave(clabe.slice(0, 3))
  if (!banco) return { tipo: "invalida" }
  return {
    tipo: "valida",
    clabe: {
      clabe,
      banco,
      claveBanco: clabe.slice(0, 3),
      ultimos4: clabe.slice(-4),
    },
  }
}

/** Grupos 3-3-4-4-4, como en el campo de Figma. */
export function formatearClabe(valor: string): string {
  const clabe = soloNumeros(valor)
  const cortes = [3, 3, 4, 4, 4]
  const partes: string[] = []
  let inicio = 0
  for (const corte of cortes) {
    if (inicio >= clabe.length) break
    partes.push(clabe.slice(inicio, inicio + corte))
    inicio += corte
  }
  return partes.join(" ")
}

export function clabeEnmascarada(claveBanco: string, ultimos4: string): string {
  return `${claveBanco} ••• ••• ${ultimos4}`
}

export function cuentaVisible(banco: string, ultimos4: string): string {
  return `${banco} · CLABE •••• ${ultimos4}`
}

export function cuentaCorta(banco: string, ultimos4: string): string {
  return `${banco} · •••• ${ultimos4}`
}
