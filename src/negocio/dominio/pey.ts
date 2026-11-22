import type { EstadoCuentaPey } from "./cuenta.ts"
import { esEstadoPey } from "./cuenta.ts"

export const PEY_BASE = "https://api.pey.mx"

export interface SolicitudCuenta {
  alias: string
  name: string
  clabe: string
  entity: "PERSON" | "BUSINESS"
}

export interface CuentaCreada {
  bankAccountId: string
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
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {}
  return valor as Record<string, unknown>
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

/**
 * POST /bank-account. La spec nombra el identificador `bankAccountId`.
 * No se leen otros campos de la respuesta.
 */
export function leerCuentaCreada(json: unknown): CuentaCreada {
  const id = texto(comoObjeto(json).bankAccountId)
  if (!id) throw new ErrorPey(200, "Pey no devolvió bankAccountId.")
  return { bankAccountId: id }
}

/**
 * GET /bank-account/:id. Los estados documentados son PENDING, PROCESSING, ACTIVE y ERROR.
 * El nombre del campo no está en la spec: se prueba `status`, luego `state`, luego `estado`.
 */
export function leerCuentaConsultada(json: unknown, idEsperado: string): CuentaConsultada {
  const obj = comoObjeto(json)
  const crudo = texto(obj.status) ?? texto(obj.state) ?? texto(obj.estado)
  if (!crudo || !esEstadoPey(crudo)) {
    throw new ErrorPey(200, "Pey no devolvió un estado de cuenta conocido.")
  }
  return {
    bankAccountId: texto(obj.bankAccountId) ?? idEsperado,
    estado: crudo,
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
  const crudo = texto(datos.status) ?? texto(datos.state) ?? texto(datos.estado)
  return {
    tipo,
    bankAccountId: texto(datos.bankAccountId),
    estado: crudo && esEstadoPey(crudo) ? crudo : null,
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
  }
}
