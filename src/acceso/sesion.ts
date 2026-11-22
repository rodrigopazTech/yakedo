import { formatearTelefonoVisible } from "./numero.ts"
import {
  TEXTO_CIERRE_GOOGLE,
  TEXTO_CIERRE_NUMERO,
  TEXTO_COBRO_ACTIVO,
} from "./textos.ts"
import type { MetodoEntrada, UsuarioSesion } from "./tipos.ts"

export type DestinoTrasEntrar = "correo" | "dentro"

export interface DecisionCierre {
  permitido: boolean
  aviso: string | null
}

/** El teléfono sin correo todavía no puede seguir: hay que escribirlo. */
export function destinoTrasTelefono(usuario: UsuarioSesion): DestinoTrasEntrar {
  if (!usuario.correo) return "correo"
  return "dentro"
}

export function mismoNegocio(uidA: string, uidB: string): boolean {
  return uidA === uidB
}

/**
 * Google se enlaza solo si el correo ya está guardado, confirmado
 * y es el mismo de la credencial pendiente.
 */
export function debeEnlazarGoogle(
  usuario: UsuarioSesion,
  correoPendiente: string | null,
): boolean {
  if (!usuario.correo || !usuario.correoVerificado) return false
  if (!correoPendiente) return true
  return usuario.correo.toLowerCase() === correoPendiente.toLowerCase()
}

export function inferirMetodo(usuario: UsuarioSesion): MetodoEntrada {
  if (usuario.proveedores.length === 1) return usuario.proveedores[0]
  if (!usuario.telefono && usuario.proveedores.includes("google")) return "google"
  if (usuario.telefono) return "telefono"
  return "google"
}

/**
 * Con Google se muestra el correo. La miniatura 185:4962 pone un teléfono
 * en «Entraste con»; ese valor está mal en el archivo.
 */
export function textoEntrasteCon(usuario: UsuarioSesion, metodo: MetodoEntrada): string {
  if (metodo === "google") return usuario.correo ?? ""
  return formatearTelefonoVisible(usuario.telefono) || usuario.correo || ""
}

export function textoDeCierre(metodo: MetodoEntrada): string {
  if (metodo === "google") return TEXTO_CIERRE_GOOGLE
  return TEXTO_CIERRE_NUMERO
}

/** Bandera inyectable mientras el cobro CoDi no existe. `?cobroActivo=1` la prende. */
export function leerCobroActivo(busqueda: string): boolean {
  return new URLSearchParams(busqueda).get("cobroActivo") === "1"
}

export function decisionDeCierre(hayCobroActivo: boolean): DecisionCierre {
  if (hayCobroActivo) {
    return { permitido: false, aviso: TEXTO_COBRO_ACTIVO }
  }
  return { permitido: true, aviso: null }
}

export function correoUtil(valor: string): boolean {
  const correo = valor.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
}

export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase()
}
