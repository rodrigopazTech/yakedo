import { ErrorDeNegocio } from "../negocio/dominio/operaciones.ts"
import { ErrorPey, type ClientePey } from "../negocio/dominio/pey.ts"
import type { RepositorioNegocio } from "../negocio/dominio/repositorio.ts"
import type { CobroGuardado, PedidoParaCobro } from "./modelo.ts"
import { VIGENCIA_MS } from "./reloj.ts"
import type { PagoQr, QrConsultado } from "./pey-qr.ts"

export interface QrListo {
  cobroId: string
  codiQrId: string
  qrString: string
  creadoEn: number
  venceEn: number
  horaServidor: number
  otroCobro: boolean
  total: number
  numero: number
}

function vigente(pedido: PedidoParaCobro, ahora: number): boolean {
  if (!pedido.cobroActivoId) return false
  const cobro = pedido.cobros.find((item) => item.id === pedido.cobroActivoId)
  return Boolean(cobro && cobro.estado !== "pagado" && cobro.venceEn > ahora)
}

export async function crearCobroQr(
  uid: string,
  pedidoId: string,
  repo: RepositorioNegocio,
  pey: ClientePey,
  reloj: () => number,
): Promise<QrListo> {
  const pedido = await repo.leerPedidoCobro(uid, pedidoId)
  if (!pedido) throw new ErrorDeNegocio("sin-pedido", "No encontramos el pedido.")
  if (pedido.estado !== "Pendiente") {
    throw new ErrorDeNegocio("cerrado", "Este pedido ya no está pendiente.")
  }
  if (pedido.total <= 0) throw new ErrorDeNegocio("datos", "El pedido no tiene total.")
  const bankAccountId = await repo.bankAccountActivo(uid)
  if (!bankAccountId) {
    throw new ErrorDeNegocio("sin-cuenta", "CoDi se activa cuando tu cuenta quede lista.")
  }
  const cobroId = crypto.randomUUID()
  const otroCobro = vigente(pedido, reloj())
  let creado
  try {
    creado = await pey.crearQr({
      totalCentavos: pedido.total,
      bankAccountId,
      metadata: { negocioId: uid, pedidoId, cobroId },
    })
  } catch (error) {
    if (error instanceof ErrorPey || error instanceof ErrorDeNegocio) {
      throw new ErrorDeNegocio("pey", "No se pudo crear el cobro. Puedes reintentar o cobrar en efectivo.")
    }
    throw new ErrorDeNegocio("pey", "No se pudo crear el cobro. Puedes reintentar o cobrar en efectivo.")
  }
  const creadoEn = reloj()
  const venceEn = creadoEn + VIGENCIA_MS
  await repo.guardarCobroQr({
    uid,
    pedidoId,
    numero: pedido.numero,
    cobroId,
    codiQrId: creado.codiQrId,
    qrString: creado.qrString,
    monto: pedido.total,
    creadoEn,
    venceEn,
    seguirActivo: true,
  })
  return {
    cobroId,
    codiQrId: creado.codiQrId,
    qrString: creado.qrString,
    creadoEn,
    venceEn,
    horaServidor: creadoEn,
    otroCobro,
    total: pedido.total,
    numero: pedido.numero,
  }
}

function pagoDeConsulta(consulta: QrConsultado, cobro: CobroGuardado, uid: string): PagoQr {
  return {
    codiQrId: cobro.codiQrId,
    amountCentavos: consulta.amountCentavos ?? cobro.monto,
    bankAccountId: null,
    datePaidMs: consulta.datePaidMs,
    transactionId: consulta.transactionId,
    numRef: null,
    concept: null,
    metadata: { negocioId: uid, pedidoId: cobro.pedidoId, cobroId: cobro.id },
  }
}

/**
 * Consulta de respaldo. No es callable y no hay botón «Revisar pago»:
 * la usa el reloj de Yakedo al llegar a cero.
 */
export async function consultarCobro(
  uid: string,
  cobro: CobroGuardado,
  repo: RepositorioNegocio,
  pey: ClientePey,
  ahora: number,
): Promise<"pagado" | "vencido" | "duplicado" | "no-esperado"> {
  let consulta: QrConsultado
  try {
    consulta = await pey.consultarQr(cobro.codiQrId)
  } catch {
    await repo.marcarCobroVencido(uid, cobro.pedidoId, cobro.id)
    return "vencido"
  }
  if (consulta.status === "PAID") {
    const resultado = await repo.resolverPagoQr(
      `respaldo_${cobro.codiQrId}`,
      pagoDeConsulta(consulta, cobro, uid),
      ahora,
    )
    if (resultado === "normal" || resultado === "ya-aplicado" || resultado === "repetido") return "pagado"
    if (resultado === "duplicado") return "duplicado"
    if (resultado === "no-esperado") return "no-esperado"
  }
  await repo.marcarCobroVencido(uid, cobro.pedidoId, cobro.id)
  return "vencido"
}

export async function vencerReloj(
  uid: string,
  pedidoId: string,
  cobroId: string,
  repo: RepositorioNegocio,
  pey: ClientePey,
  ahora: number,
): Promise<{ estado: "activo" | "pagado" | "vencido" | "duplicado" | "no-esperado"; venceEn: number | null }> {
  const cobro = await repo.leerCobroQr(uid, pedidoId, cobroId)
  if (!cobro) throw new ErrorDeNegocio("sin-pedido", "No encontramos el cobro.")
  if (cobro.estado === "pagado") return { estado: "pagado", venceEn: cobro.venceEn }
  if (ahora < cobro.venceEn) return { estado: "activo", venceEn: cobro.venceEn }
  const estado = await consultarCobro(uid, cobro, repo, pey, ahora)
  return { estado, venceEn: cobro.venceEn }
}
