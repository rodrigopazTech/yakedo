import { TEXTO_CODIGO_INCORRECTO, TEXTO_CODIGO_VENCIDO, textoEsperaOtroCodigo } from "./textos.ts"

export const LARGO_CODIGO = 6

/** Espera visible antes de pedir otro SMS. P16: los tiempos reales los marca Firebase; 30 s es la cuenta que cabe en «0:24». */
export const ESPERA_OTRO_CODIGO_MS = 30_000

export type ErrorCodigo = "incorrecto" | "vencido"

export function limitarCodigo(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, LARGO_CODIGO)
}

export function codigoCompleto(codigo: string): boolean {
  return limitarCodigo(codigo).length === LARGO_CODIGO
}

export function textoDeErrorCodigo(error: ErrorCodigo): string {
  if (error === "vencido") return TEXTO_CODIGO_VENCIDO
  return TEXTO_CODIGO_INCORRECTO
}

export function puedePedirOtroCodigo(ahora: number, esperaHasta: number): boolean {
  return ahora >= esperaHasta
}

export function textoDeEspera(ahora: number, esperaHasta: number): string | null {
  const resta = esperaHasta - ahora
  if (resta <= 0) return null
  return textoEsperaOtroCodigo(resta)
}

export function clasificarErrorCodigo(codigoFirebase: string): ErrorCodigo | "otro" {
  if (
    codigoFirebase === "auth/invalid-verification-code" ||
    codigoFirebase === "auth/missing-verification-code" ||
    codigoFirebase === "auth/invalid-code"
  ) {
    return "incorrecto"
  }

  if (
    codigoFirebase === "auth/code-expired" ||
    codigoFirebase === "auth/session-expired" ||
    codigoFirebase === "auth/invalid-verification-id" ||
    codigoFirebase === "auth/missing-verification-id"
  ) {
    return "vencido"
  }

  return "otro"
}
