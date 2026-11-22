import { doc, onSnapshot, updateDoc, type Firestore } from "firebase/firestore"
import { httpsCallable, type Functions } from "firebase/functions"
import { TEXTO_PEY_ALTA, type TipoPersona } from "./dominio/alta.ts"
import type { BloqueCuenta, CuentaDocumento, EstadoCuentaPey, NegocioGuardado } from "./dominio/cuenta.ts"

export interface DatosNegocio {
  negocio: NegocioGuardado | null
  cuenta: CuentaDocumento | null
}

const ESTADOS: readonly EstadoCuentaPey[] = ["PENDING", "PROCESSING", "ACTIVE", "ERROR"]

function esEstado(valor: unknown): valor is EstadoCuentaPey {
  return typeof valor === "string" && ESTADOS.includes(valor as EstadoCuentaPey)
}

function leerBloque(valor: unknown): BloqueCuenta | null {
  if (!valor || typeof valor !== "object") return null
  const bloque = valor as Record<string, unknown>
  if (!esEstado(bloque.estado)) return null
  return {
    bankAccountId: typeof bloque.bankAccountId === "string" ? bloque.bankAccountId : "",
    estado: bloque.estado,
    banco: typeof bloque.banco === "string" ? bloque.banco : "",
    ultimos4: typeof bloque.ultimos4 === "string" ? bloque.ultimos4 : "",
    claveBanco: typeof bloque.claveBanco === "string" ? bloque.claveBanco : "",
  }
}

function leerNegocio(datos: Record<string, unknown> | undefined): NegocioGuardado | null {
  if (!datos) return null
  const tipo = datos.tipoPersona
  if (tipo !== "fisica" && tipo !== "moral") return null
  return {
    nombre: typeof datos.nombre === "string" ? datos.nombre : "",
    nombreLegal: typeof datos.nombreLegal === "string" ? datos.nombreLegal : "",
    tipoPersona: tipo,
    correo: typeof datos.correo === "string" ? datos.correo : null,
  }
}

function leerCuenta(datos: Record<string, unknown> | undefined): CuentaDocumento | null {
  if (!datos) return null
  return {
    actual: leerBloque(datos.actual),
    nueva: leerBloque(datos.nueva),
    seguirConActual: typeof datos.seguirConActual === "boolean" ? datos.seguirConActual : null,
  }
}

export function escucharNegocio(db: Firestore, uid: string, alCambiar: (datos: DatosNegocio) => void): () => void {
  let negocio: NegocioGuardado | null = null
  let cuenta: CuentaDocumento | null = null
  let negocioListo = false
  let cuentaLista = false
  const emitir = () => {
    if (negocioListo && cuentaLista) alCambiar({ negocio, cuenta })
  }
  const soltarNegocio = onSnapshot(doc(db, "negocios", uid), (snap) => {
    negocio = snap.exists() ? leerNegocio(snap.data()) : null
    negocioListo = true
    emitir()
  })
  const soltarCuenta = onSnapshot(doc(db, "negocios", uid, "cuenta", "pey"), (snap) => {
    cuenta = snap.exists() ? leerCuenta(snap.data()) : null
    cuentaLista = true
    emitir()
  })
  return () => {
    soltarNegocio()
    soltarCuenta()
  }
}

export interface AltaRemota {
  nombre: string
  nombreLegal: string
  tipoPersona: TipoPersona
  clabe: string
}

export interface ServicioNegocio {
  registrar: (datos: AltaRemota) => Promise<void>
  consultar: () => Promise<void>
  cambiarClabe: (clabe: string) => Promise<void>
  elegirSeguir: (seguir: boolean) => Promise<void>
  guardarNombre: (uid: string, nombre: string) => Promise<void>
}

export function mensajeDeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const texto = error.message
    if (
      texto.includes("CLABE") ||
      texto.includes("cuenta") ||
      texto.includes("negocio") ||
      texto.includes("opción") ||
      texto.includes("nombre") ||
      texto.includes("cobro")
    ) {
      return texto
    }
  }
  return TEXTO_PEY_ALTA
}

export function crearServicioNegocio(functions: Functions, db: Firestore): ServicioNegocio {
  const registrar = httpsCallable(functions, "registrarNegocio")
  const consultar = httpsCallable(functions, "consultarCuenta")
  const cambiar = httpsCallable(functions, "cambiarClabe")
  const elegir = httpsCallable(functions, "elegirSeguirConActual")
  return {
    async registrar(datos) {
      await registrar(datos)
    },
    async consultar() {
      await consultar({})
    },
    async cambiarClabe(clabe) {
      await cambiar({ clabe })
    },
    async elegirSeguir(seguir) {
      await elegir({ seguir })
    },
    async guardarNombre(uid, nombre) {
      await updateDoc(doc(db, "negocios", uid), { nombre })
    },
  }
}
