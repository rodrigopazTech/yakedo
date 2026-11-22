import { horaMexico, reloj } from "../venta/dominio.ts"

export const VIGENCIA_MS = 360_000

/** Diferencia para que un aparato con la hora mal no mueva el vencimiento. */
export function desfaseReloj(horaServidor: number, horaAparato: number): number {
  return horaServidor - horaAparato
}

export function ahoraCorregido(horaAparato: number, desfase: number): number {
  return horaAparato + desfase
}

export function restanteCobro(venceEn: number, horaAparato: number, desfase: number): number {
  return venceEn - ahoraCorregido(horaAparato, desfase)
}

export function textoCuenta(restanteMs: number, venceEn: number): string {
  return `${reloj(Math.max(0, restanteMs))} para pagar · vence ${horaMexico(venceEn)}`
}

/** La tablet solo se queda oyendo el cobro mientras el reloj sigue. */
export function debeEscuchar(vista: string, restanteMs: number): boolean {
  return vista === "qr" && restanteMs > 0
}
