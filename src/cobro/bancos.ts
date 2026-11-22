/**
 * Lista inicial del 17 de noviembre de 2026.
 * Fuentes: actualización de Banxico del 10 de julio de 2026 y codi.org.mx.
 * La hoja nombra los bancos de Figma. Dondé, Invex y BaBien no se nombran.
 * El Banco del Bienestar queda en porConfirmar y no se muestra como sí ni como no.
 */

export interface ListaBancos {
  actualizado: string
  fuente: string
  destacados: string[]
  siSirven: string[]
  porConfirmar: string[]
  noSirven: string[]
  notaOpcional: string | null
}

export const LISTA_INICIAL: ListaBancos = {
  actualizado: "2026-11-17",
  fuente: "https://www.banxico.org.mx/servicios/codi-cobro-digital.html",
  destacados: ["BBVA", "Banorte", "Santander", "Banamex", "HSBC", "Azteca"],
  siSirven: [
    "BBVA",
    "Banorte",
    "Santander",
    "Banamex",
    "HSBC",
    "Azteca",
    "BanCoppel",
    "Scotiabank",
    "Inbursa",
    "Afirme",
    "BanBajío",
    "Banregio",
    "Spin by OXXO",
  ],
  porConfirmar: ["Banco del Bienestar"],
  noSirven: ["Nu", "Mercado Pago", "Klar", "Stori", "Ualá"],
  notaOpcional: null,
}

function textos(valor: unknown, respaldo: string[]): string[] {
  if (!Array.isArray(valor) || !valor.every((item) => typeof item === "string")) return respaldo
  return valor
}

export function listaDe(datos: unknown): ListaBancos {
  const obj = datos && typeof datos === "object" ? (datos as Record<string, unknown>) : {}
  return {
    actualizado: typeof obj.actualizado === "string" && obj.actualizado ? obj.actualizado : LISTA_INICIAL.actualizado,
    fuente: typeof obj.fuente === "string" && obj.fuente ? obj.fuente : LISTA_INICIAL.fuente,
    destacados: textos(obj.destacados, LISTA_INICIAL.destacados),
    siSirven: textos(obj.siSirven, LISTA_INICIAL.siSirven),
    porConfirmar: textos(obj.porConfirmar, LISTA_INICIAL.porConfirmar),
    noSirven: textos(obj.noSirven, LISTA_INICIAL.noSirven),
    notaOpcional: typeof obj.notaOpcional === "string" ? obj.notaOpcional : null,
  }
}

export function fechaLista(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(anio ?? 2026, (mes ?? 1) - 1, dia ?? 1, 18, 0, 0)))
}

export function lineaBancos(destacados: string[]): string {
  const nombres = destacados.length > 0 ? destacados : LISTA_INICIAL.destacados
  return `Escanéalo con la app de tu banco: ${nombres.join(", ")} y más.`
}

export function textoNoSirven(nombres: string[]): string {
  if (nombres.length === 0) return ""
  const ultimo = nombres[nombres.length - 1] ?? ""
  const inicio = nombres.slice(0, -1).join(", ")
  const lista = inicio ? `${inicio} y ${ultimo}` : ultimo
  return `Aún no están en la lista de CoDi de Banxico: ${lista}. Si tu cliente usa una de estas, cóbrale en efectivo.`
}
