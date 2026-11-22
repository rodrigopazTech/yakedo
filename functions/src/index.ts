import { initializeApp } from "firebase-admin/app"
import { onCall, onRequest, HttpsError, type CallableRequest } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import { setGlobalOptions } from "firebase-functions/v2"
import { almacenFirestore } from "./almacen.ts"
import {
  ErrorDeNegocio,
  cambiarClabe as cambiar,
  consultarCuenta as consultar,
  elegirSeguirConActual as elegir,
  recibirEvento,
  registrarNegocio as registrar,
  type EntradaAlta,
} from "../../src/negocio/dominio/operaciones.ts"
import { crearCobroQr as crearQr, vencerReloj } from "../../src/cobro/operaciones.ts"
import { crearClientePey } from "../../src/negocio/dominio/pey.ts"
import { verificarFirma } from "../../src/negocio/dominio/firma.ts"
import type { TipoPersona } from "../../src/negocio/dominio/alta.ts"

/**
 * Pey solo se llama desde aquí. PEY_API_KEY y PEY_WEBHOOK_SECRET
 * salen de Secret Manager (defineSecret). No están en el repositorio.
 * El webhook verifica la firma y, dentro de una transacción, resuelve
 * `codi.qr.payment_received`. No responde 200 si la firma falla.
 */
setGlobalOptions({ maxInstances: 10 })
initializeApp()

const peyApiKey = defineSecret("PEY_API_KEY")
const peyWebhookSecret = defineSecret("PEY_WEBHOOK_SECRET")

function cliente() {
  return crearClientePey({ apiKey: peyApiKey.value(), fetch: globalThis.fetch })
}

function traducir(error: unknown): HttpsError {
  if (error instanceof ErrorDeNegocio) {
    const codigo =
      error.codigo === "datos" || error.codigo === "clabe-igual"
        ? "invalid-argument"
        : error.codigo === "clabe-repetida" || error.codigo === "ya-hay-negocio"
          ? "already-exists"
          : error.codigo === "pey"
            ? "unavailable"
            : "failed-precondition"
    return new HttpsError(codigo, error.message)
  }
  return new HttpsError("internal", "No se pudo completar. Inténtalo otra vez.")
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : ""
}

function entradaAlta(request: CallableRequest<unknown>): EntradaAlta {
  if (!request.auth) throw new HttpsError("unauthenticated", "Entra para continuar.")
  const datos = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {}
  const tipo = datos.tipoPersona
  if (tipo !== "fisica" && tipo !== "moral") {
    throw new ErrorDeNegocio("datos", "Elige una opción.")
  }
  const correo = request.auth.token.email
  return {
    uid: request.auth.uid,
    correo: typeof correo === "string" ? correo : null,
    nombre: texto(datos.nombre),
    nombreLegal: texto(datos.nombreLegal),
    tipoPersona: tipo as TipoPersona,
    clabe: texto(datos.clabe),
  }
}

function uidDe(request: CallableRequest<unknown>): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "Entra para continuar.")
  return request.auth.uid
}

export const registrarNegocio = onCall({ secrets: [peyApiKey] }, async (request) => {
  try {
    const cuenta = await registrar(entradaAlta(request), almacenFirestore(), cliente())
    return { ok: true, estado: cuenta.actual?.estado ?? "PENDING" }
  } catch (error) {
    throw traducir(error)
  }
})

export const consultarCuenta = onCall({ secrets: [peyApiKey] }, async (request) => {
  try {
    const cuenta = await consultar(uidDe(request), almacenFirestore(), cliente())
    return { ok: true, cuenta }
  } catch (error) {
    throw traducir(error)
  }
})

export const cambiarClabe = onCall({ secrets: [peyApiKey] }, async (request) => {
  try {
    const datos = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {}
    const cuenta = await cambiar(
      { uid: uidDe(request), clabe: texto(datos.clabe) },
      almacenFirestore(),
      cliente(),
    )
    return { ok: true, cuenta }
  } catch (error) {
    throw traducir(error)
  }
})

export const crearCobroQr = onCall({ secrets: [peyApiKey] }, async (request) => {
  try {
    const datos = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {}
    const pedidoId = texto(datos.pedidoId)
    if (!pedidoId) throw new ErrorDeNegocio("datos", "Falta el pedido.")
    return await crearQr(uidDe(request), pedidoId, almacenFirestore(), cliente(), () => Date.now())
  } catch (error) {
    throw traducir(error)
  }
})

/** El reloj de la tablet lo llama al llegar a cero. No es un botón de revisar pago. */
export const vencerCobro = onCall({ secrets: [peyApiKey] }, async (request) => {
  try {
    const datos = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {}
    const pedidoId = texto(datos.pedidoId)
    const cobroId = texto(datos.cobroId)
    if (!pedidoId || !cobroId) throw new ErrorDeNegocio("datos", "Falta el cobro.")
    return await vencerReloj(uidDe(request), pedidoId, cobroId, almacenFirestore(), cliente(), Date.now())
  } catch (error) {
    throw traducir(error)
  }
})

export const elegirSeguirConActual = onCall(async (request) => {
  try {
    const datos = request.data && typeof request.data === "object" ? (request.data as Record<string, unknown>) : {}
    await elegir(uidDe(request), datos.seguir === true, almacenFirestore())
    return { ok: true }
  } catch (error) {
    throw traducir(error)
  }
})

export const webhookPey = onRequest({ secrets: [peyWebhookSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Método no permitido")
    return
  }
  const cuerpo = req.rawBody ? req.rawBody.toString("utf8") : ""
  const veredicto = await verificarFirma({
    id: req.header("webhook-id") ?? "",
    marca: req.header("webhook-timestamp") ?? "",
    firma: req.header("webhook-signature") ?? "",
    cuerpo,
    secreto: peyWebhookSecret.value(),
    ahora: Date.now(),
  })
  if (!veredicto.ok) {
    res.status(401).send("Firma inválida")
    return
  }
  const resultado = await recibirEvento(req.header("webhook-id") ?? "", cuerpo, almacenFirestore())
  if (resultado === "incompleto") {
    res.status(400).send("Evento incompleto")
    return
  }
  res.status(200).send("ok")
})
