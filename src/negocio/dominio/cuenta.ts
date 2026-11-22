import type { TipoPersona } from "./alta.ts"

export type EstadoCuentaPey = "PENDING" | "PROCESSING" | "ACTIVE" | "ERROR"

export interface BloqueCuenta {
  bankAccountId: string
  estado: EstadoCuentaPey
  banco: string
  ultimos4: string
  claveBanco: string
}

export interface CuentaDocumento {
  actual: BloqueCuenta | null
  nueva: BloqueCuenta | null
  seguirConActual: boolean | null
}

export interface NegocioGuardado {
  nombre: string
  nombreLegal: string
  tipoPersona: TipoPersona
  correo: string | null
}

export interface Privado {
  clabeActual: string | null
  clabeNueva: string | null
}

export type AvisoCuenta = "primera-activa" | "nueva-activa" | "nueva-error" | "estado"

export interface TransicionCuenta {
  cuenta: CuentaDocumento
  privado: Privado
  liberarClabe: string | null
  borrarBankAccountId: string | null
  aviso: AvisoCuenta
}

export function codiDisponible(cuenta: CuentaDocumento | null): boolean {
  if (!cuenta?.actual || cuenta.actual.estado !== "ACTIVE") return false
  const nueva = cuenta.nueva
  if (nueva && (nueva.estado === "PENDING" || nueva.estado === "PROCESSING")) {
    return cuenta.seguirConActual === true
  }
  return true
}

export function tramiteAbierto(cuenta: CuentaDocumento | null): boolean {
  const estado = cuenta?.nueva?.estado
  return estado === "PENDING" || estado === "PROCESSING"
}

export function puedeCambiarClabe(
  cuenta: CuentaDocumento | null,
  hayCobroActivo: boolean,
): "ok" | "cobro" | "tramite" | "sin-activa" {
  if (hayCobroActivo) return "cobro"
  if (!cuenta?.actual || cuenta.actual.estado !== "ACTIVE") return "sin-activa"
  if (tramiteAbierto(cuenta)) return "tramite"
  return "ok"
}

export function motivoCobroApagado(cuenta: CuentaDocumento | null): "primera" | "tramite" | null {
  if (codiDisponible(cuenta)) return null
  if (cuenta?.actual?.estado === "ACTIVE" && tramiteAbierto(cuenta) && cuenta.seguirConActual === false) {
    return "tramite"
  }
  return "primera"
}

/**
 * Aplica un estado de Pey a la cuenta actual o a la nueva.
 * Al quedar ACTIVE la nueva, pasa a ser la actual.
 */
export function siguienteCuenta(
  cuenta: CuentaDocumento,
  privado: Privado,
  bankAccountId: string,
  estado: EstadoCuentaPey,
): TransicionCuenta | null {
  if (cuenta.nueva?.bankAccountId === bankAccountId) {
    const nueva = { ...cuenta.nueva, estado }
    if (estado === "ACTIVE") {
      return {
        cuenta: { actual: nueva, nueva: null, seguirConActual: null },
        privado: { clabeActual: privado.clabeNueva, clabeNueva: null },
        liberarClabe: privado.clabeActual,
        borrarBankAccountId: cuenta.actual?.bankAccountId ?? null,
        aviso: "nueva-activa",
      }
    }
    if (estado === "ERROR") {
      return {
        cuenta: { ...cuenta, nueva, seguirConActual: null },
        privado,
        liberarClabe: null,
        borrarBankAccountId: null,
        aviso: "nueva-error",
      }
    }
    return {
      cuenta: { ...cuenta, nueva },
      privado,
      liberarClabe: null,
      borrarBankAccountId: null,
      aviso: "estado",
    }
  }

  if (cuenta.actual?.bankAccountId === bankAccountId) {
    return {
      cuenta: { ...cuenta, actual: { ...cuenta.actual, estado } },
      privado,
      liberarClabe: null,
      borrarBankAccountId: null,
      aviso: estado === "ACTIVE" ? "primera-activa" : "estado",
    }
  }

  return null
}

export function esEstadoPey(valor: string): valor is EstadoCuentaPey {
  return valor === "PENDING" || valor === "PROCESSING" || valor === "ACTIVE" || valor === "ERROR"
}
