import type { EstadoCuentaPey } from "./cuenta.ts"
import { esEstadoPey } from "./cuenta.ts"
import {
  cuerpoCrearQr,
  leerQrConsultado,
  leerQrCreado,
  type QrConsultado,
  type QrCreado,
  type SolicitudQr,
} from "../../cobro/pey-qr.ts"

export const PEY_BASE = "https://api.pey.mx"

export interface SolicitudCuenta {
  alias: string
  name: string
  clabe: string
  entity: "PERSON" | "BUSINESS"
}

export interface CuentaCreada {
  bankAccountId: string
  estado: EstadoCuentaPey | null
}

export interface CuentaConsultada {
  bankAccountId: string
  estado: EstadoCuentaPey
}

export class ErrorPey extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ErrorPey"
    this.status = status
  }
}

export interface ClientePey {
  crearCuenta(solicitud: SolicitudCuenta): Promise<CuentaCreada>
  consultarCuenta(bankAccountId: string): Promise<CuentaConsultada>
  crearQr(solicitud: SolicitudQr): Promise<QrCreado>
  consultarQr(codiQrId: string): Promise<QrConsultado>
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {}
  return valor as Record<string, unknown>
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

/** spike Pey 16 nov: POST /bank-account → {id, codiStatus} */
function leerEstadoPey(obj: Record<string, unknown>): EstadoCuentaPey | null {
  const crudo = texto(obj.codiStatus) ?? texto(obj.status)
  if (!crudo || !esEstadoPey(crudo)) return null
  return crudo
}

/**
 * POST /bank-account.
 * spike Pey 16 nov: POST /bank-account → {id, codiStatus}
 * `bankAccountId` queda solo como respaldo del `id`.
 */
export function leerCuentaCreada(json: unknown): CuentaCreada {
  const obj = comoObjeto(json)
  const id = texto(obj.id) ?? texto(obj.bankAccountId)
  if (!id) throw new ErrorPey(200, "Pey no devolvió bankAccountId.")
  return { bankAccountId: id, estado: leerEstadoPey(obj) }
}

/**
 * GET /bank-account/:id. El estado sale de `codiStatus` y, si no viene, de `status`.
 */
export function leerCuentaConsultada(json: unknown, idEsperado: string): CuentaConsultada {
  const obj = comoObjeto(json)
  const estado = leerEstadoPey(obj)
  if (!estado) throw new ErrorPey(200, "Pey no devolvió un estado de cuenta conocido.")
  return {
    bankAccountId: texto(obj.bankAccountId) ?? idEsperado,
    estado,
  }
}

/**
 * Mensaje de error de Pey. La spec no documenta el cuerpo de un rechazo:
 * si viene `message` o `error` como texto, se conserva solo para el registro interno.
 */
export function leerMensajePey(json: unknown): string | null {
  const obj = comoObjeto(json)
  return texto(obj.message) ?? texto(obj.error)
}

export interface EventoPey {
  tipo: string
  bankAccountId: string | null
  estado: EstadoCuentaPey | null
  datos: unknown
}

/**
 * Sobre del webhook. No está documentado el nombre del tipo ni el anidado:
 * se acepta `type` o `event`, y los datos en `data`, `payload` o la raíz.
 */
export function leerEventoPey(json: unknown): EventoPey {
  const obj = comoObjeto(json)
  const tipo = texto(obj.type) ?? texto(obj.event) ?? ""
  const anidado = obj.data ?? obj.payload
  const datos = anidado && typeof anidado === "object" ? comoObjeto(anidado) : obj
  return {
    tipo,
    bankAccountId: texto(datos.id) ?? texto(datos.bankAccountId),
    estado: leerEstadoPey(datos),
    datos,
  }
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const textoCrudo = await respuesta.text()
  if (!textoCrudo) return null
  try {
    return JSON.parse(textoCrudo) as unknown
  } catch {
    return null
  }
}

export function crearClientePey(opciones: {
  apiKey: string
  fetch: typeof fetch
  baseUrl?: string
}): ClientePey {
  const base = (opciones.baseUrl ?? PEY_BASE).replace(/\/$/, "")

  async function llamar(ruta: string, init: RequestInit): Promise<unknown> {
    const respuesta = await opciones.fetch(`${base}${ruta}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${opciones.apiKey}`,
        Accept: "application/json",
        ...init.headers,
      },
    })
    const json = await leerJson(respuesta)
    if (!respuesta.ok) {
      throw new ErrorPey(respuesta.status, leerMensajePey(json) ?? "Pey rechazó la llamada.")
    }
    return json
  }

  return {
    async crearCuenta(solicitud) {
      const json = await llamar("/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: solicitud.alias,
          name: solicitud.name,
          clabe: solicitud.clabe,
          entity: solicitud.entity,
        }),
      })
      return leerCuentaCreada(json)
    },
    async consultarCuenta(bankAccountId) {
      const json = await llamar(`/bank-account/${encodeURIComponent(bankAccountId)}`, { method: "GET" })
      return leerCuentaConsultada(json, bankAccountId)
    },
    async crearQr(solicitud) {
      const cuerpo = cuerpoCrearQr(solicitud)
      const json = await llamar("/codi/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      })
      const qr = leerQrCreado(json)
      if (!qr) throw new ErrorPey(200, "Pey no devolvió el QR.")
      return qr
    },
    async consultarQr(codiQrId) {
      const json = await llamar(`/transaction/codi/qr/${encodeURIComponent(codiQrId)}`, { method: "GET" })
      return leerQrConsultado(json)
    },
  }
}
