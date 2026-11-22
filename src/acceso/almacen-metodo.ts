import type { MetodoEntrada } from "./tipos.ts"

const CLAVE = "yakedo.metodo-entrada"

export interface AlmacenClave {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
  removeItem(clave: string): void
}

export function guardarMetodoEntrada(
  almacen: AlmacenClave | null,
  uid: string,
  metodo: MetodoEntrada,
): void {
  almacen?.setItem(CLAVE, JSON.stringify({ uid, metodo }))
}

export function leerMetodoEntrada(
  almacen: AlmacenClave | null,
  uid: string,
): MetodoEntrada | null {
  const crudo = almacen?.getItem(CLAVE)
  if (!crudo) return null
  try {
    const dato: unknown = JSON.parse(crudo)
    if (!dato || typeof dato !== "object") return null
    const registro = dato as { uid?: unknown; metodo?: unknown }
    if (registro.uid !== uid) return null
    if (registro.metodo === "telefono" || registro.metodo === "google") {
      return registro.metodo
    }
    return null
  } catch {
    return null
  }
}

export function borrarMetodoEntrada(almacen: AlmacenClave | null): void {
  almacen?.removeItem(CLAVE)
}
