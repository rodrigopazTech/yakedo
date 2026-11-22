import { ESPERA_OTRO_CODIGO_MS, puedePedirOtroCodigo } from "./codigo.ts"
import { aE164, validarNumero } from "./numero.ts"
import { correoUtil, decisionDeCierre, normalizarCorreo } from "./sesion.ts"
import { TEXTO_CORREO_INVALIDO } from "./textos.ts"
import type { ResultadoCodigo, ResultadoCorreo, ResultadoGoogle, ServicioAuth } from "./tipos.ts"

export type PedidoCodigo =
  | { tipo: "incompleto"; error: string }
  | { tipo: "enviado"; verificacionId: string; esperaHasta: number }
  | { tipo: "espera"; esperaHasta: number }

export async function pedirCodigo(
  servicio: ServicioAuth,
  digitos: string,
  ahora: number,
): Promise<PedidoCodigo> {
  const error = validarNumero(digitos)
  if (error) return { tipo: "incompleto", error }
  const verificacionId = await servicio.enviarCodigo(aE164(digitos))
  return { tipo: "enviado", verificacionId, esperaHasta: ahora + ESPERA_OTRO_CODIGO_MS }
}

export async function pedirOtroCodigo(
  servicio: ServicioAuth,
  digitos: string,
  ahora: number,
  esperaHasta: number,
): Promise<PedidoCodigo> {
  if (!puedePedirOtroCodigo(ahora, esperaHasta)) {
    return { tipo: "espera", esperaHasta }
  }
  return pedirCodigo(servicio, digitos, ahora)
}

export function confirmarCodigo(
  servicio: ServicioAuth,
  verificacionId: string,
  codigo: string,
): Promise<ResultadoCodigo> {
  return servicio.confirmarCodigo(verificacionId, codigo)
}

export async function guardarCorreoEscrito(
  servicio: ServicioAuth,
  correo: string,
): Promise<ResultadoCorreo | { tipo: "invalido"; error: string }> {
  if (!correoUtil(correo)) return { tipo: "invalido", error: TEXTO_CORREO_INVALIDO }
  return servicio.guardarCorreo(normalizarCorreo(correo))
}

export function entrarConGoogle(servicio: ServicioAuth): Promise<ResultadoGoogle> {
  return servicio.entrarConGoogle()
}

export function intentarCerrarSesion(hayCobroActivo: boolean) {
  return decisionDeCierre(hayCobroActivo)
}
