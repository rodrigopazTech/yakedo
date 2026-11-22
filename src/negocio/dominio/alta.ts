import { revisarClabe, type ClabeValida } from "./clabe.ts"

export const MAX_NOMBRE = 40
export const MAX_NOMBRE_LEGAL = 120

export const TEXTO_CLABE_REPETIDA = "Esta CLABE ya está registrada en Yakedo"
export const TEXTO_NOMBRE_VACIO = "Escribe el nombre de tu negocio."
export const TEXTO_NOMBRE_LIMITE = "40 de 40 · Ya no caben más letras."
export const TEXTO_ELIGE_PERSONA = "Elige una opción."
export const TEXTO_AYUDA_LEGAL = "Como aparece en tu banco."
export const TEXTO_CLABE_VACIA_CAMBIO = "18 números."

// UI PROVISIONAL: falta en Figma el texto de una CLABE de 18 números que no pasa el dígito o el banco.
export const TEXTO_CLABE_INVALIDA = "Esta CLABE no es válida. Revísala."

// UI PROVISIONAL: falta en Figma el texto cuando Pey rechaza el alta.
export const TEXTO_PEY_ALTA = "No pudimos registrar tu cuenta. Inténtalo otra vez."

// UI PROVISIONAL: falta en Figma el texto de la CLABE igual a la actual.
export const TEXTO_CLABE_IGUAL = "Esa es tu CLABE actual."

// UI PROVISIONAL: falta en Figma el bloqueo de un segundo cambio en trámite.
export const TEXTO_TRAMITE = "Hay una cuenta nueva en trámite. Espera a que quede activa o falle."

export type TipoPersona = "fisica" | "moral"

export interface CamposAlta {
  clabe: string
  nombre: string
  nombreLegal: string
  tipoPersona: TipoPersona | null
  intento: boolean
  clabeRepetida: boolean
}

export interface VistaAlta {
  ayudaClabe: string | null
  clabeOk: boolean
  clabeError: boolean
  ayudaNombre: string | null
  nombreError: boolean
  ayudaPersona: string | null
  personaError: boolean
  puedeContinuar: boolean
  clabe: ClabeValida | null
}

export function limitarNombre(valor: string): string {
  return Array.from(valor).slice(0, MAX_NOMBRE).join("")
}

export function ayudaNombre(nombre: string): string | null {
  const largo = Array.from(nombre).length
  if (largo === 0) return null
  if (largo >= MAX_NOMBRE) return TEXTO_NOMBRE_LIMITE
  return `${largo} de ${MAX_NOMBRE} · Así aparece en tus tickets.`
}

export function ayudaClabeIncompleta(escritos: number, faltan: number): string {
  if (faltan === 1) return `Falta 1 número (${escritos} de 18).`
  return `Faltan ${faltan} números (${escritos} de 18).`
}

export function ayudaClabeValida(banco: string): string {
  return `18 de 18 números · CLABE válida de ${banco}`
}

export function vistaAlta(campos: CamposAlta): VistaAlta {
  const revision = revisarClabe(campos.clabe)
  const nombre = campos.nombre.trim()
  const legal = campos.nombreLegal.trim()
  const clabeOk = revision.tipo === "valida" && !campos.clabeRepetida
  let ayudaClabe: string | null = null
  let clabeError = false
  if (campos.clabeRepetida) {
    ayudaClabe = TEXTO_CLABE_REPETIDA
    clabeError = true
  } else if (revision.tipo === "incompleta" && (campos.intento || revision.escritos > 0)) {
    ayudaClabe = ayudaClabeIncompleta(revision.escritos, revision.faltan)
    clabeError = campos.intento || revision.escritos >= 15
  } else if (revision.tipo === "invalida") {
    ayudaClabe = TEXTO_CLABE_INVALIDA
    clabeError = true
  } else if (revision.tipo === "valida") {
    ayudaClabe = ayudaClabeValida(revision.clabe.banco)
  } else if (campos.intento) {
    ayudaClabe = ayudaClabeIncompleta(0, 18)
    clabeError = true
  }

  const nombreError = campos.intento && nombre.length === 0
  const personaError = campos.intento && campos.tipoPersona === null
  const puedeContinuar =
    clabeOk && nombre.length > 0 && nombre.length <= MAX_NOMBRE && legal.length > 0 && legal.length <= MAX_NOMBRE_LEGAL && campos.tipoPersona !== null

  return {
    ayudaClabe,
    clabeOk,
    clabeError,
    ayudaNombre: nombreError ? TEXTO_NOMBRE_VACIO : ayudaNombre(campos.nombre),
    nombreError,
    ayudaPersona: personaError ? TEXTO_ELIGE_PERSONA : null,
    personaError,
    puedeContinuar,
    clabe: revision.tipo === "valida" ? revision.clabe : null,
  }
}

export function entidadPey(tipo: TipoPersona): "PERSON" | "BUSINESS" {
  return tipo === "moral" ? "BUSINESS" : "PERSON"
}

export function etiquetaPersona(tipo: TipoPersona): string {
  return tipo === "moral" ? "Persona moral" : "Persona física"
}
