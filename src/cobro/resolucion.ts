import type { PagoQr } from "./pey-qr.ts"

export type ResultadoPago = "repetido" | "sin-asignar" | "normal" | "duplicado" | "no-esperado" | "ya-aplicado"

export type Registro = Record<string, unknown>

export interface TxCobro {
  leer(ruta: string): Promise<Registro | null>
  escribir(ruta: string, datos: Registro): void
  fusionar(ruta: string, datos: Registro): void
}

interface ResumenPago {
  id: string
  tipo: string
  transactionId: string | null
  monto: number
  datePaid: number
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

function resumenDe(valor: unknown): ResumenPago[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const pago = item as Registro
    const tipo = texto(pago.tipo)
    if (tipo !== "normal" && tipo !== "duplicado" && tipo !== "no_esperado") return []
    return [{
      id: texto(pago.id) ?? "",
      tipo,
      transactionId: texto(pago.transactionId),
      monto: typeof pago.monto === "number" ? pago.monto : 0,
      datePaid: typeof pago.datePaid === "number" ? pago.datePaid : 0,
    }]
  })
}

function decidir(
  estado: string,
  resumen: ResumenPago[],
  pago: PagoQr,
): "normal" | "duplicado" | "no-esperado" | "ya-aplicado" {
  if (pago.transactionId && resumen.some((item) => item.transactionId === pago.transactionId)) {
    return "ya-aplicado"
  }
  const normal = resumen.find((item) => item.tipo === "normal")
  if (normal) {
    const otroPago = Boolean(
      pago.transactionId && normal.transactionId && pago.transactionId !== normal.transactionId,
    )
    if (!otroPago) return "ya-aplicado"
  }
  if (estado === "Cancelado") return "no-esperado"
  if (estado === "Pagado") return "duplicado"
  return "normal"
}

function tipoGuardado(decision: "normal" | "duplicado" | "no-esperado"): "normal" | "duplicado" | "no_esperado" {
  return decision === "no-esperado" ? "no_esperado" : decision
}

function dejarSinAsignar(tx: TxCobro, webhookId: string, pago: PagoQr, ahora: number): void {
  tx.escribir(`webhooks/${webhookId}`, { tipo: "codi.qr.payment_received", resultado: "sin-asignar" })
  tx.escribir(`pagosSinAsignar/${webhookId}`, {
    codiQrId: pago.codiQrId,
    amountCentavos: pago.amountCentavos,
    bankAccountId: pago.bankAccountId,
    datePaid: pago.datePaidMs ?? ahora,
    transactionId: pago.transactionId,
    numRef: pago.numRef,
    concept: pago.concept,
    metadata: pago.metadata,
    recibidoEn: ahora,
  })
}

/**
 * Una transacción decide la fila de la tabla de pagos.
 * El pedido Pendiente se paga aunque Yakedo ya haya dado el QR por vencido.
 */
export async function aplicarPago(
  tx: TxCobro,
  webhookId: string,
  pago: PagoQr,
  ahora: number,
): Promise<ResultadoPago> {
  if (await tx.leer(`webhooks/${webhookId}`)) return "repetido"

  let negocioId: string | null = null
  let pedidoId: string | null = null
  let cobroId: string | null = null
  if (pago.codiQrId) {
    const indice = await tx.leer(`cobrosQr/${pago.codiQrId}`)
    negocioId = texto(indice?.negocioId)
    pedidoId = texto(indice?.pedidoId)
    cobroId = texto(indice?.cobroId)
  }
  if (!negocioId || !pedidoId || !cobroId) {
    negocioId = pago.metadata.negocioId
    pedidoId = pago.metadata.pedidoId
    cobroId = pago.metadata.cobroId
  }
  if (!negocioId || !pedidoId || !cobroId) {
    dejarSinAsignar(tx, webhookId, pago, ahora)
    return "sin-asignar"
  }

  const rutaPedido = `negocios/${negocioId}/pedidos/${pedidoId}`
  const rutaCobro = `${rutaPedido}/cobros/${cobroId}`
  const pedido = await tx.leer(rutaPedido)
  const cobro = await tx.leer(rutaCobro)
  if (!pedido || !cobro) {
    dejarSinAsignar(tx, webhookId, pago, ahora)
    return "sin-asignar"
  }

  const estado = pedido.estado === "Pagado" || pedido.estado === "Cancelado" ? pedido.estado : "Pendiente"
  const decision = decidir(estado, resumenDe(cobro.pagosResumen), pago)
  tx.escribir(`webhooks/${webhookId}`, { tipo: "codi.qr.payment_received", resultado: decision })
  if (decision === "ya-aplicado") return decision

  const guardado = tipoGuardado(decision)
  const datePaid = pago.datePaidMs ?? ahora
  const entrada: ResumenPago = {
    id: webhookId,
    tipo: guardado,
    transactionId: pago.transactionId,
    monto: pago.amountCentavos,
    datePaid,
  }
  tx.escribir(`${rutaCobro}/pagos/${webhookId}`, {
    tipo: guardado,
    monto: pago.amountCentavos,
    datePaid,
    transactionId: pago.transactionId,
  })
  tx.fusionar(rutaCobro, {
    pagosResumen: [...resumenDe(cobro.pagosResumen), entrada],
    ...(decision === "normal" ? { estado: "pagado" } : {}),
  })
  if (decision === "normal") {
    tx.fusionar(rutaPedido, { estado: "Pagado", metodo: "codi", pagadoEn: ahora })
  }
  return decision
}
