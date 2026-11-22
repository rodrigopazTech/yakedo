import { fechaLista, lineaBancos, textoNoSirven, type ListaBancos } from "./bancos.ts"
import { textoCuenta } from "./reloj.ts"
import { formatoNumero, horaMexico, pesos, pesosFijos, reloj, textoPiezas, type PedidoLeido } from "../venta/dominio.ts"

export const TEXTO_ADVERTENCIA =
  "Un cobro CoDi no se puede anular: vence solo a los 6 minutos. La venta se cierra cuando CoDi confirma el pago."
export const TEXTO_INDICACION =
  "Pídele al cliente que abra la app de su banco y busque CoDi. La cámara del celular no lee este código."
export const TEXTO_MISMO = "Es el mismo QR: no se generó otro cobro."
export const TEXTO_OTRO = "Es otro cobro. Que pague solo uno."
export const TEXTO_QUE_BANCOS = "¿Qué bancos sirven?"
export const TEXTO_VER_TICKET = "Ver ticket"
export const TEXTO_DEVUELVE = "Devuélvelo desde la app de tu banco."

export function subtituloQr(numero: number, piezas: number, mismo: boolean, creadoEn: number, detalle?: string | null): string {
  if (mismo) return `Ticket ${formatoNumero(numero)} · el mismo QR de las ${horaMexico(creadoEn)}`
  if (detalle) return `Ticket ${formatoNumero(numero)} · ${detalle}`
  return `Ticket ${formatoNumero(numero)} · ${textoPiezas(piezas)}`
}

export function vistaQr(entrada: {
  numero: number
  piezas: number
  totalCentavos: number
  creadoEn: number
  venceEn: number
  restanteMs: number
  mismo: boolean
  otro: boolean
  destacados: string[]
  detalle?: string | null
}) {
  return {
    titulo: "Cobro con CoDi",
    verTicket: TEXTO_VER_TICKET,
    subtitulo: subtituloQr(entrada.numero, entrada.piezas, entrada.mismo, entrada.creadoEn, entrada.detalle),
    totalEtiqueta: "Total a pagar",
    total: pesosFijos(entrada.totalCentavos),
    linea: lineaBancos(entrada.destacados),
    bancos: TEXTO_QUE_BANCOS,
    indicacion: TEXTO_INDICACION,
    reloj: reloj(Math.max(0, entrada.restanteMs)),
    vence: horaMexico(entrada.venceEn),
    cuenta: textoCuenta(entrada.restanteMs, entrada.venceEn),
    advertencia: TEXTO_ADVERTENCIA,
    mismo: entrada.mismo ? TEXTO_MISMO : null,
    otro: entrada.otro ? TEXTO_OTRO : null,
    ayuda: "¿Su banco le dijo “Operación no realizada”?",
  }
}

export function vistaVencido(totalCentavos: number, numero: number) {
  return {
    titulo: "Cobro con CoDi",
    regresar: "Regresar al carrito",
    subtitulo: `Ticket ${formatoNumero(numero)} · ${pesosFijos(totalCentavos)}`,
    vencido: "El cobro venció",
    apoyo: `No llegó el pago de ${pesos(totalCentavos)}. La venta sigue abierta.`,
    reloj: "0:00",
    chip: "Cobro vencido · sin pago",
    otra: "Cobrar otra vez",
    efectivo: "Cobrar en efectivo",
    aviso: "¿Dice que ya pagó? Revisa tu banco antes de cobrar otra vez.",
  }
}

export function fraseQrActivo(restanteMs: number): string {
  return `El QR sigue activo ${reloj(Math.max(0, restanteMs))} min. Pídele que ya no lo escanee.`
}

export function vistaEfectivoActivo(restanteMs: number, venceEn: number) {
  return {
    titulo: "El cobro sigue activo",
    frase: fraseQrActivo(restanteMs),
    queEs: "¿Qué es esto?",
    vence: `Vence en ${reloj(Math.max(0, restanteMs))} · a las ${horaMexico(venceEn)}`,
    si: "Sí, cobrar en efectivo",
    seguir: "Seguir esperando",
    explicacion: [
      "Un cobro CoDi no se puede anular: vence solo a los 6 minutos.",
      "Si lo paga antes, queda en este ticket como pagado con CoDi.",
      "Si ya cobraste en efectivo, sale como Pago duplicado y lo devuelves desde tu banco.",
    ],
  }
}

export function vistaAyuda(restanteMs: number, venceEn: number) {
  return {
    titulo: "¿Su banco le dijo “Operación no realizada”?",
    intro: "A veces la app del banco falla. Eso no cancela el cobro: puede intentarlo otra vez.",
    sigue: `Este QR sigue activo: vence en ${reloj(Math.max(0, restanteMs))} (a las ${horaMexico(venceEn)})`,
    pasos: [
      "Que vuelva a escanear este mismo QR. No generes otro.",
      "Que revise su saldo y que su app esté actualizada.",
      "Si sigue fallando, cobra en efectivo.",
    ],
    nota: "Yakedo no recibe este error del banco. Solo te avisa cuando CoDi confirma el pago.",
    efectivo: "Mejor cobrar en efectivo",
    volver: "Volver al QR",
  }
}

export function vistaHoja(lista: ListaBancos) {
  return {
    titulo: "Estos bancos sí aceptan CoDi",
    intro: "Tu cliente paga desde la app de su banco, en la parte de CoDi o de Transferencias.",
    bancos: lista.siSirven,
    otras: "y otras más",
    aviso: textoNoSirven(lista.noSirven),
    pie: `Datos de Banxico. Actualizado el ${fechaLista(lista.actualizado)}.`,
    efectivo: "Mejor cobrar en efectivo",
    porConfirmar: lista.porConfirmar,
  }
}

export function vistaNoEsperado(numero: number, monto: number) {
  return {
    titulo: `Te llegó un pago no esperado del pedido ${formatoNumero(numero)} · ${pesos(monto)}`,
    apoyo: "El pedido estaba cancelado: no se reabre la venta. Devuélvelo desde la app de tu banco.",
    ver: "Ver pedido",
    entendido: "Entendido",
  }
}

export function vistaDuplicado() {
  return {
    titulo: "Pago duplicado",
    apoyo: TEXTO_DEVUELVE,
    entendido: "Entendido",
  }
}

export function primerAviso(pedidos: PedidoLeido[], vistos: ReadonlySet<string>) {
  for (const pedido of pedidos) {
    for (const cobro of pedido.cobros) {
      for (const pago of cobro.pagos) {
        if (pago.tipo !== "duplicado" && pago.tipo !== "no_esperado") continue
        if (vistos.has(pago.id)) continue
        return {
          clase: pago.tipo,
          numero: pedido.numero,
          monto: pago.monto,
          pedidoId: pedido.id,
          id: pago.id,
        }
      }
    }
  }
  return null
}

export function vistaFalloQr() {
  return {
    titulo: "No se pudo crear el cobro.",
    apoyo: "Puedes reintentar o cobrar en efectivo. El pedido sigue pendiente.",
    reintentar: "Reintentar",
    efectivo: "Cobrar en efectivo",
  }
}
