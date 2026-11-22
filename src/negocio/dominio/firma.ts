const TOLERANCIA_MS = 5 * 60 * 1000

export interface FirmaWebhook {
  id: string
  marca: string
  firma: string
  cuerpo: string
  secreto: string
  ahora: number
}

export type VeredictoFirma = { ok: true } | { ok: false; motivo: "faltan-datos" | "vencida" | "no-coincide" }

function bytesUtf8(valor: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(valor))
}

function aBase64(bytes: ArrayBuffer): string {
  let binario = ""
  for (const byte of new Uint8Array(bytes)) binario += String.fromCharCode(byte)
  return btoa(binario)
}

function deBase64(valor: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(valor)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/**
 * Secreto Standard Webhooks: `whsec_` + base64. Si no trae el prefijo y no
 * decodifica como base64 redondo, se usa el texto tal cual (secreto de prueba).
 */
export function bytesDelSecreto(secreto: string): Uint8Array<ArrayBuffer> {
  const conPrefijo = secreto.startsWith("whsec_")
  const limpio = conPrefijo ? secreto.slice("whsec_".length) : secreto
  const decodificado = deBase64(limpio)
  if (conPrefijo && decodificado) return decodificado
  if (decodificado && aBase64(decodificado.buffer) === limpio) return decodificado
  return bytesUtf8(secreto)
}

export async function hmacSha256(secreto: string, contenido: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    bytesDelSecreto(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const firma = await crypto.subtle.sign("HMAC", clave, bytesUtf8(contenido))
  return aBase64(firma)
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i += 1) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

/** Firma sobre el cuerpo crudo: `webhook-id.webhook-timestamp.cuerpo`. */
export async function verificarFirma(entrada: FirmaWebhook): Promise<VeredictoFirma> {
  if (!entrada.id || !entrada.marca || !entrada.firma) return { ok: false, motivo: "faltan-datos" }
  const segundos = Number(entrada.marca)
  if (!Number.isFinite(segundos)) return { ok: false, motivo: "faltan-datos" }
  if (Math.abs(entrada.ahora - segundos * 1000) > TOLERANCIA_MS) return { ok: false, motivo: "vencida" }
  const esperada = await hmacSha256(entrada.secreto, `${entrada.id}.${entrada.marca}.${entrada.cuerpo}`)
  const firmas = entrada.firma.split(" ").map((parte) => parte.trim()).filter(Boolean)
  for (const parte of firmas) {
    const valor = parte.startsWith("v1,") ? parte.slice(3) : parte
    if (iguales(valor, esperada)) return { ok: true }
  }
  return { ok: false, motivo: "no-coincide" }
}
