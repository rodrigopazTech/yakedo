import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { hmacSha256, verificarFirma } from "../negocio/dominio/firma.ts"
import { MemoriaNegocio } from "../negocio/dominio/memoria.ts"
import { recibirEvento } from "../negocio/dominio/operaciones.ts"
import { crearClientePey, PEY_BASE } from "../negocio/dominio/pey.ts"
import { LISTA_INICIAL, fechaLista, lineaBancos, listaDe, textoNoSirven } from "./bancos.ts"
import { crearCobroQr, vencerReloj } from "./operaciones.ts"
import { cuerpoCrearQr, leerPagoQr, leerQrCreado, leerQrConsultado, type PagoQr } from "./pey-qr.ts"
import { debeEscuchar, desfaseReloj, restanteCobro, VIGENCIA_MS } from "./reloj.ts"
import {
  fraseQrActivo,
  primerAviso,
  subtituloQr,
  vistaAyuda,
  vistaDuplicado,
  vistaEfectivoActivo,
  vistaHoja,
  vistaNoEsperado,
  vistaQr,
  vistaVencido,
} from "./vistas.ts"
import type { PedidoLeido } from "../venta/dominio.ts"

const SECRETO = "whsec_" + btoa("secreto-de-prueba-yakedo")
const AHORA = Date.parse("2026-11-22T18:41:00.000Z")

function pedidoPendiente(repo: MemoriaNegocio, total = 12200) {
  repo.sembrarPedido("ana", "p1", {
    numero: 43,
    estado: "Pendiente",
    total,
    cobroActivoId: null,
  })
  repo.sembrarPedido("ana", "cuenta-marca", {})
}

async function cuentaActiva(repo: MemoriaNegocio) {
  await repo.guardarAlta({
    uid: "ana",
    negocio: { nombre: "La Esquina", nombreLegal: "Ana López", tipoPersona: "fisica", correo: null },
    cuenta: {
      actual: { bankAccountId: "ba_ana", estado: "ACTIVE", banco: "BBVA México", ultimos4: "7893", claveBanco: "012" },
      nueva: null,
      seguirConActual: null,
    },
    privado: { clabeActual: "012180001234567893", clabeNueva: null },
    clabe: "012180001234567893",
    bankAccountIdAnterior: null,
  })
}

function peyQr(opciones?: { status?: number; cuerpo?: unknown; consulta?: unknown }) {
  const llamadas: { url: string; body: unknown; method: string }[] = []
  const fetchMock: typeof fetch = async (entrada, init) => {
    const url = String(entrada)
    llamadas.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) as unknown : null,
    })
    if ((opciones?.status ?? 201) >= 400) return new Response("no", { status: opciones?.status ?? 500 })
    if (url.includes("/transaction/codi/qr/")) {
      return new Response(JSON.stringify(opciones?.consulta ?? { status: "PENDING" }))
    }
    return new Response(JSON.stringify(opciones?.cuerpo ?? { id: "qr_1", qrString: "cadena-qr" }), { status: 201 })
  }
  return {
    llamadas,
    cliente: crearClientePey({ apiKey: "llave-falsa", fetch: fetchMock, baseUrl: PEY_BASE }),
  }
}

function pago(parcial: Partial<PagoQr> = {}): PagoQr {
  return {
    codiQrId: "qr_1",
    amountCentavos: 12200,
    bankAccountId: "ba_ana",
    datePaidMs: AHORA + 60_000,
    transactionId: "tx_1",
    numRef: "1",
    concept: "Ticket 0043",
    metadata: { negocioId: "ana", pedidoId: "p1", cobroId: "c1" },
    ...parcial,
  }
}

async function firmado(cuerpo: string, id = "msg_1") {
  const marca = String(Math.floor(AHORA / 1000))
  const firma = await hmacSha256(SECRETO, `${id}.${marca}.${cuerpo}`)
  return { id, marca, firma: `v1,${firma}`, cuerpo }
}

describe("crear el QR", () => {
  it("manda expiration 360, la cuenta y el metadata, y no usa el monto del cliente", async () => {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo, 12200)
    await cuentaActiva(repo)
    const pey = peyQr()
    const listo = await crearCobroQr("ana", "p1", repo, pey.cliente, () => AHORA)
    const cuerpo = pey.llamadas[0]?.body as Record<string, unknown>
    expect(pey.llamadas[0]?.url).toBe("https://api.pey.mx/codi/qr")
    expect(pey.llamadas[0]?.method).toBe("POST")
    expect(Object.keys(cuerpo).sort()).toEqual(["amount", "bankAccountId", "expiration", "metadata"])
    expect(cuerpo).toEqual(cuerpoCrearQr({
      totalCentavos: 12200,
      bankAccountId: "ba_ana",
      metadata: { negocioId: "ana", pedidoId: "p1", cobroId: listo.cobroId },
    }))
    expect(cuerpo.expiration).toBe(360)
    expect(cuerpo.amount).toBe(122)
    expect(listo.qrString).toBe("cadena-qr")
    expect(listo.codiQrId).toBe("qr_1")
    expect(listo.venceEn - listo.creadoEn).toBe(VIGENCIA_MS)
    expect(repo.doc(`cobrosQr/qr_1`)).toMatchObject({ pedidoId: "p1", negocioId: "ana" })
    expect(repo.doc("negocios/ana/pedidos/p1")?.cobroActivoId).toBe(listo.cobroId)
  })

  it("lee el id de codiQrId si Pey no manda id", () => {
    expect(leerQrCreado({ codiQrId: "desde-respaldo", qrString: "abc" })?.codiQrId).toBe("desde-respaldo")
    expect(leerQrCreado({ id: "principal", codiQrId: "respaldo", qrString: "abc" })?.codiQrId).toBe("principal")
  })

  it("no dibuja un QR si Pey falla y el pedido sigue pendiente", async () => {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo)
    await cuentaActiva(repo)
    const pey = peyQr({ status: 500 })
    await expect(crearCobroQr("ana", "p1", repo, pey.cliente, () => AHORA)).rejects.toThrow(/reintentar o cobrar en efectivo/)
    expect(repo.doc("negocios/ana/pedidos/p1")?.estado).toBe("Pendiente")
    expect(repo.doc("negocios/ana/pedidos/p1")?.cobroActivoId).toBeNull()
  })

  it("no cobra con CoDi si la cuenta no está ACTIVE", async () => {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo)
    const pey = peyQr()
    await expect(crearCobroQr("ana", "p1", repo, pey.cliente, () => AHORA)).rejects.toThrow(/cuenta/)
    expect(pey.llamadas).toHaveLength(0)
  })
})

describe("reloj", () => {
  it("usa la hora del servidor aunque el aparato esté adelantado", () => {
    const horaServidor = AHORA
    const horaAparato = AHORA + 3_600_000
    const desfase = desfaseReloj(horaServidor, horaAparato)
    const venceEn = horaServidor + VIGENCIA_MS
    const despues = horaAparato + 10_000
    expect(restanteCobro(venceEn, despues, desfase)).toBe(VIGENCIA_MS - 10_000)
    expect(debeEscuchar("qr", restanteCobro(venceEn, despues, desfase))).toBe(true)
    expect(debeEscuchar("qr", 0)).toBe(false)
    expect(debeEscuchar("vencido", 10_000)).toBe(false)
  })
})

describe("webhook y resolución", () => {
  async function conQr() {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo)
    await cuentaActiva(repo)
    const pey = peyQr()
    const listo = await crearCobroQr("ana", "p1", repo, pey.cliente, () => AHORA)
    return { repo, listo }
  }

  it("acepta la firma cruda, rechaza la inválida y no procesa el reintento", async () => {
    const { repo, listo } = await conQr()
    const cuerpo = JSON.stringify({
      type: "codi.qr.payment_received",
      amount: 122,
      codiQrId: listo.codiQrId,
      transactionId: "tx_1",
      datePaid: "2026-11-22T12:42:00.000Z",
      metadata: { negocioId: "ana", pedidoId: "p1", cobroId: listo.cobroId },
    })
    const bueno = await firmado(cuerpo, "wh_1")
    expect(await verificarFirma({ ...bueno, secreto: SECRETO, ahora: AHORA })).toEqual({ ok: true })
    const tocado = cuerpo.replace("122", "1")
    expect((await verificarFirma({ ...bueno, cuerpo: tocado, secreto: SECRETO, ahora: AHORA })).ok).toBe(false)
    expect(await recibirEvento("wh_1", cuerpo, repo, AHORA + 1000)).toBe("normal")
    expect(await recibirEvento("wh_1", cuerpo, repo, AHORA + 1000)).toBe("repetido")
    expect(repo.doc("negocios/ana/pedidos/p1")?.estado).toBe("Pagado")
    expect(repo.doc(`negocios/ana/pedidos/p1/cobros/${listo.cobroId}/pagos/wh_1`)?.tipo).toBe("normal")
  })

  it("paga un QR que Yakedo ya dio por vencido si el pedido sigue pendiente", async () => {
    const { repo, listo } = await conQr()
    await repo.marcarCobroVencido("ana", "p1", listo.cobroId)
    const cuerpo = JSON.stringify({
      type: "codi.qr.payment_received",
      codiQrId: listo.codiQrId,
      amount: 122,
      transactionId: "tx_tarde",
      datePaid: AHORA + 400_000,
    })
    expect(await recibirEvento("wh_tarde", cuerpo, repo, AHORA + 400_000)).toBe("normal")
    expect(repo.doc("negocios/ana/pedidos/p1")?.metodo).toBe("codi")
  })

  it("marca duplicado si ya estaba pagado y no esperado si estaba cancelado", async () => {
    const { repo, listo } = await conQr()
    repo.sembrarPedido("ana", "p1", { numero: 43, estado: "Pagado", total: 12200, metodo: "efectivo", cobroActivoId: listo.cobroId })
    expect(await repo.resolverPagoQr("wh_dup", pago({ codiQrId: listo.codiQrId, transactionId: "tx_dup" }), AHORA)).toBe("duplicado")
    expect(repo.doc("negocios/ana/pedidos/p1")?.metodo).toBe("efectivo")
    repo.sembrarPedido("ana", "p1", { numero: 41, estado: "Cancelado", total: 6500, cobroActivoId: listo.cobroId })
    expect(await repo.resolverPagoQr("wh_ne", pago({
      codiQrId: listo.codiQrId,
      transactionId: "tx_ne",
      amountCentavos: 6500,
      metadata: { negocioId: "ana", pedidoId: "p1", cobroId: listo.cobroId },
    }), AHORA)).toBe("no-esperado")
    expect(repo.doc("negocios/ana/pedidos/p1")?.estado).toBe("Cancelado")
    expect(repo.doc(`negocios/ana/pedidos/p1/cobros/${listo.cobroId}/pagos/wh_ne`)?.tipo).toBe("no_esperado")
  })

  it("deja un solo pago normal si dos webhooks llegan juntos", async () => {
    const { repo, listo } = await conQr()
    const uno = pago({ codiQrId: listo.codiQrId, transactionId: "tx_a" })
    const dos = pago({ codiQrId: listo.codiQrId, transactionId: "tx_b" })
    const [a, b] = await Promise.all([
      repo.resolverPagoQr("wh_a", uno, AHORA),
      repo.resolverPagoQr("wh_b", dos, AHORA),
    ])
    expect([a, b].sort()).toEqual(["duplicado", "normal"])
    const resumen = repo.doc(`negocios/ana/pedidos/p1/cobros/${listo.cobroId}`)?.pagosResumen as { tipo: string }[]
    expect(resumen.filter((item) => item.tipo === "normal")).toHaveLength(1)
  })

  it("el efectivo y el webhook no cierran los dos la venta", async () => {
    const { repo, listo } = await conQr()
    const [efectivo, pagoRes] = await Promise.all([
      repo.cobrarEfectivoMemoria("ana", "p1", 12200, AHORA),
      repo.resolverPagoQr("wh_ef", pago({ codiQrId: listo.codiQrId, transactionId: "tx_ef" }), AHORA),
    ])
    const pedido = repo.doc("negocios/ana/pedidos/p1")
    expect(pedido?.estado).toBe("Pagado")
    const resumen = repo.doc(`negocios/ana/pedidos/p1/cobros/${listo.cobroId}`)?.pagosResumen as { tipo: string }[]
    const normales = resumen.filter((item) => item.tipo === "normal")
    expect(normales.length).toBeLessThanOrEqual(1)
    if (pedido?.metodo === "efectivo") {
      expect(efectivo).toBe("pagado")
      expect(pagoRes).toBe("duplicado")
    } else {
      expect(efectivo).toBe("ya-pagado")
      expect(pagoRes).toBe("normal")
      expect(normales).toHaveLength(1)
    }
  })

  it("guarda el pago sin asignar y liga por metadata si no hay índice", async () => {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo)
    expect(await repo.resolverPagoQr("wh_x", pago({ codiQrId: "nadie" }), AHORA)).toBe("sin-asignar")
    expect(repo.doc("pagosSinAsignar/wh_x")?.codiQrId).toBe("nadie")
    repo.sembrarPedido("ana", "p9", { numero: 9, estado: "Pendiente", total: 5000, cobroActivoId: "c9" })
    repo.sembrarPedido("ana", "marca", {})
    await repo.guardarCobroQr({
      uid: "ana",
      pedidoId: "p9",
      numero: 9,
      cobroId: "c9",
      codiQrId: "qr_meta",
      qrString: "qq",
      monto: 5000,
      creadoEn: AHORA,
      venceEn: AHORA + VIGENCIA_MS,
      seguirActivo: true,
    })
    expect(await repo.resolverPagoQr("wh_meta", pago({
      codiQrId: null,
      transactionId: "tx_meta",
      amountCentavos: 5000,
      metadata: { negocioId: "ana", pedidoId: "p9", cobroId: "c9" },
    }), AHORA)).toBe("normal")
  })

  it("la consulta de respaldo con PAID cierra la venta y no es un botón", async () => {
    const repo = new MemoriaNegocio()
    pedidoPendiente(repo)
    await cuentaActiva(repo)
    const pey = peyQr({ consulta: { status: "PAID", datePaid: "2026-11-22T12:47:00.000Z", transactionId: "tx_res" } })
    const listo = await crearCobroQr("ana", "p1", repo, pey.cliente, () => AHORA)
    const resultado = await vencerReloj("ana", "p1", listo.cobroId, repo, pey.cliente, AHORA + VIGENCIA_MS)
    expect(resultado.estado).toBe("pagado")
    expect(repo.doc("negocios/ana/pedidos/p1")?.estado).toBe("Pagado")
    const fuente = readFileSync(new URL("../venta/Nucleo.tsx", import.meta.url), "utf8")
    expect(fuente).toContain("onSnapshot")
    expect(fuente).toContain("debeEscuchar")
    expect(fuente).not.toContain("Revisar pago")
    expect(leerQrConsultado({ status: "PAID", datePaid: "2026-11-22T12:47:00.000Z" }).status).toBe("PAID")
    expect(leerPagoQr({ type: "otro" })).toBeNull()
  })
})

describe("pantallas", () => {
  const destacados = LISTA_INICIAL.destacados

  it("arma el QR, el vencido, el mismo QR y el otro cobro", () => {
    const qr = vistaQr({
      numero: 43,
      piezas: 4,
      totalCentavos: 12200,
      creadoEn: AHORA,
      venceEn: AHORA + VIGENCIA_MS,
      restanteMs: VIGENCIA_MS,
      mismo: false,
      otro: false,
      destacados,
    })
    expect(qr.titulo).toBe("Cobro con CoDi")
    expect(qr.total).toBe("$122.00")
    expect(qr.linea).toBe("Escanéalo con la app de tu banco: BBVA, Banorte, Santander, Banamex, HSBC, Azteca y más.")
    expect(qr.indicacion).toContain("La cámara del celular no lee este código.")
    expect(qr.cuenta).toContain("6:00 para pagar")
    expect(qr.advertencia).toContain("no se puede anular")
    expect(subtituloQr(43, 4, true, AHORA)).toContain("el mismo QR de las")
    expect(vistaQr({
      numero: 43, piezas: 4, totalCentavos: 12200, creadoEn: AHORA, venceEn: AHORA, restanteMs: 1, mismo: true, otro: true, destacados,
    }).otro).toBe("Es otro cobro. Que pague solo uno.")
    const vencido = vistaVencido(12200, 43)
    expect(vencido.vencido).toBe("El cobro venció")
    expect(vencido.apoyo).toBe("No llegó el pago de $122. La venta sigue abierta.")
    expect(vencido.otra).toBe("Cobrar otra vez")
    expect(vencido.efectivo).toBe("Cobrar en efectivo")
    expect(vencido.aviso).toContain("Revisa tu banco")
  })

  it("avisa el efectivo con QR activo, la ayuda y los pagos raros", () => {
    const activo = vistaEfectivoActivo(4 * 60_000 + 12_000, AHORA)
    expect(activo.frase).toBe(fraseQrActivo(4 * 60_000 + 12_000))
    expect(activo.frase).toBe("El QR sigue activo 4:12 min. Pídele que ya no lo escanee.")
    expect(activo.explicacion.join(" ")).toContain("Pago duplicado")
    const ayuda = vistaAyuda(220_000, AHORA)
    expect(ayuda.intro).toContain("no cancela el cobro")
    expect(ayuda.pasos[0]).toContain("este mismo QR")
    expect(ayuda.nota).toContain("Yakedo no recibe este error")
    const raro = vistaNoEsperado(41, 6500)
    expect(raro.titulo).toBe("Te llegó un pago no esperado del pedido #0041 · $65")
    expect(raro.apoyo).toContain("no se reabre la venta")
    expect(vistaDuplicado().apoyo).toBe("Devuélvelo desde la app de tu banco.")
    const pedido = {
      id: "p",
      numero: 41,
      tipo: "venta",
      concepto: null,
      items: [],
      total: 6500,
      estado: "Cancelado",
      creadoEn: AHORA,
      pagadoEn: null,
      canceladoEn: AHORA,
      metodo: null,
      efectivo: null,
      cobroActivoId: null,
      cobros: [{
        id: "c",
        creadoEn: AHORA,
        venceEn: AHORA,
        estado: "vencido",
        pagos: [{ id: "w", tipo: "no_esperado", monto: 6500, datePaid: AHORA, transactionId: null }],
      }],
    } as PedidoLeido
    expect(primerAviso([pedido], new Set())?.clase).toBe("no_esperado")
    expect(primerAviso([pedido], new Set(["w"]))).toBeNull()
  })
})

describe("bancos", () => {
  it("trae la lista del 17 de noviembre y no nombra los que faltan", () => {
    expect(Object.keys(LISTA_INICIAL).sort()).toEqual([
      "actualizado", "destacados", "fuente", "noSirven", "notaOpcional", "porConfirmar", "siSirven",
    ])
    expect(fechaLista(LISTA_INICIAL.actualizado)).toBe("17 de noviembre de 2026")
    expect(lineaBancos(LISTA_INICIAL.destacados)).toContain("Azteca y más.")
    const hoja = vistaHoja(LISTA_INICIAL)
    expect(hoja.titulo).toBe("Estos bancos sí aceptan CoDi")
    expect(hoja.aviso).toBe("Aún no están en la lista de CoDi de Banxico: Nu, Mercado Pago, Klar, Stori y Ualá. Si tu cliente usa una de estas, cóbrale en efectivo.")
    expect(hoja.pie).toBe("Datos de Banxico. Actualizado el 17 de noviembre de 2026.")
    expect(hoja.bancos.join(" ")).not.toContain("Bienestar")
    expect(hoja.aviso).not.toContain("Dondé")
    expect(textoNoSirven(LISTA_INICIAL.noSirven)).toContain("Ualá")
    expect(listaDe({ destacados: ["BBVA"] }).destacados).toEqual(["BBVA"])
    expect(listaDe(null).siSirven).toEqual(LISTA_INICIAL.siSirven)
  })
})
