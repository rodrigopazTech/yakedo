import { mensajeNumeroIncompleto } from "./textos.ts"

export const LARGO_NUMERO = 10
export const PREFIJO_PAIS = "+52"

export function soloNumeros(valor: string): string {
  return valor.replace(/\D/g, "")
}

export function limitarNumero(valor: string): string {
  return soloNumeros(valor).slice(0, LARGO_NUMERO)
}

/** 5512345678 → «55 1234 5678», como en el marco de Figma. */
export function formatearNumero(digitos: string): string {
  const numeros = limitarNumero(digitos)
  if (numeros.length <= 2) return numeros
  if (numeros.length <= 6) return `${numeros.slice(0, 2)} ${numeros.slice(2)}`
  return `${numeros.slice(0, 2)} ${numeros.slice(2, 6)} ${numeros.slice(6)}`
}

export function aE164(digitos: string): string {
  return `${PREFIJO_PAIS}${limitarNumero(digitos)}`
}

export function numeroCompleto(digitos: string): boolean {
  return limitarNumero(digitos).length === LARGO_NUMERO
}

/**
 * Devuelve el texto de error si todavía no hay 10 números.
 * El que llama no debe enviar el SMS cuando hay error.
 */
export function validarNumero(digitos: string): string | null {
  const numeros = limitarNumero(digitos)
  if (numeros.length === LARGO_NUMERO) return null
  return mensajeNumeroIncompleto(numeros.length)
}

export function formatearTelefonoVisible(telefono: string | null): string {
  if (!telefono) return ""
  const numeros = soloNumeros(telefono).replace(/^52/, "")
  return `${PREFIJO_PAIS} ${formatearNumero(numeros)}`
}
