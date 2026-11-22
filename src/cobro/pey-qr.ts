/**
 * Campos de Pey que este código supone. Falta confirmarlos con la key real:
 * - POST /codi/qr pide `amount` (pesos, no centavos), `expiration`, `bankAccountId` y `metadata`.
 * - La respuesta trae `qrString`. El id se lee de `id` y, si no viene, de `codiQrId`
 *   (el spike del 16 nov devolvió `id`; el del 17 nov nombra `codiQrId`).
 * - El webhook trae los campos en la raíz o en `data`: amount, codiQrId, bankAccountId,
 *   datePaid (ISO, milisegundos o segundos), transactionId, numRef, concept, metadata.
 * - GET /transaction/codi/qr/:id se lee `status` y `datePaid`. `transactionId` y `amount`
 *   se usan solo si vienen; no están confirmados en esa respuesta.
 */

export const EXPIRACION_QR = 360

export interface MetaCobro {
  negocioId: string
  pedidoId: string
  cobroId: string
}

export interface SolicitudQr {
  totalCentavos: number
  bankAccountId: string
  metadata: MetaCobro
}

export interface QrCreado {
  /** Pendiente de confirmar: hoy es `id`, con respaldo `codiQrId`. */
  codiQrId: string
  qrString: string
}

export interface QrConsultado {
  status: string | null
  datePaidMs: number | null
  transactionId: string | null
  amountCentavos: number | null
}

export interface PagoQr {
  codiQrId: string | null
  amountCentavos: number
  bankAccountId: string | null
  datePaidMs: number | null
  transactionId: string | null
  numRef: string | null
  concept: string | null
  metadata: { negocioId: string | null; pedidoId: string | null; cobroId: string | null }
}

export function pesosPey(centavos: number): number {
  return Number((Math.trunc(centavos) / 100).toFixed(2))
}

/** Cuerpo de POST /codi/qr. Sin qrImage, sin /codi/pn y sin campos de más. */
export function cuerpoCrearQr(solicitud: SolicitudQr): {
  amount: number
  expiration: number
  bankAccountId: string
  metadata: MetaCobro
} {
  return {
    amount: pesosPey(solicitud.totalCentavos),
    expiration: EXPIRACION_QR,
    bankAccountId: solicitud.bankAccountId,
    metadata: {
      negocioId: solicitud.metadata.negocioId,
      pedidoId: solicitud.metadata.pedidoId,
      cobroId: solicitud.metadata.cobroId,
    },
  }
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {}
  return valor as Record<string, unknown>
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

export function centavosDeAmount(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : Number.NaN
  if (!Number.isFinite(numero)) return null
  return Math.round(numero * 100)
}

/** ISO, milisegundos o segundos. El formato exacto de `datePaid` sigue pendiente. */
export function millisDePey(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    if (valor > 1e12) return Math.trunc(valor)
    if (valor > 1e9) return Math.trunc(valor * 1000)
    return null
  }
  if (typeof valor === "string" && valor.trim()) {
    const ms = Date.parse(valor)
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

export function leerQrCreado(json: unknown): QrCreado | null {
  const obj = objeto(json)
  const codiQrId = texto(obj.id) ?? texto(obj.codiQrId)
  const qrString = texto(obj.qrString)
  if (!codiQrId || !qrString) return null
  return { codiQrId, qrString }
}

export function leerQrConsultado(json: unknown): QrConsultado {
  const obj = objeto(json)
  const anidado = objeto(obj.data ?? obj.transaction ?? obj)
  const fuente = texto(anidado.status) || anidado.datePaid != null ? anidado : obj
  return {
    status: texto(fuente.status),
    datePaidMs: millisDePey(fuente.datePaid),
    transactionId: texto(fuente.transactionId),
    amountCentavos: centavosDeAmount(fuente.amount),
  }
}

function meta(valor: unknown): PagoQr["metadata"] {
  const obj = objeto(valor)
  return {
    negocioId: texto(obj.negocioId),
    pedidoId: texto(obj.pedidoId),
    cobroId: texto(obj.cobroId),
  }
}

export function leerPagoQr(json: unknown): PagoQr | null {
  const obj = objeto(json)
  const tipo = texto(obj.type) ?? texto(obj.event)
  if (tipo !== "codi.qr.payment_received") return null
  const anidado = objeto(obj.data ?? obj.payload)
  const fuente = Object.keys(anidado).length > 0 ? { ...obj, ...anidado } : obj
  return {
    codiQrId: texto(fuente.codiQrId),
    amountCentavos: centavosDeAmount(fuente.amount) ?? 0,
    bankAccountId: texto(fuente.bankAccountId),
    datePaidMs: millisDePey(fuente.datePaid),
    transactionId: texto(fuente.transactionId),
    numRef: texto(fuente.numRef),
    concept: texto(fuente.concept),
    metadata: meta(fuente.metadata),
  }
}
