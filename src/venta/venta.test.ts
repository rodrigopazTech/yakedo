import { describe, expect, it } from "vitest"
import {
  agregarProducto,
  ATAJOS_EFECTIVO,
  cambioEfectivo,
  chipsEdicion,
  chipsVenta,
  centavosDeTeclado,
  estaAgotado,
  estadoVisible,
  etiquetaCobrar,
  etiquetaConfirmarEfectivo,
  etiquetaIntento,
  fechaEnMexico,
  filaConPagoNoEsperado,
  formatoNumero,
  iniciales,
  limitarNombre,
  notaPagoOtroDia,
  notaPorDevolver,
  pedidosDelDia,
  datosCobroLibre,
  etiquetaLibre,
  pesos,
  pesosFijos,
  puedeCancelar,
  resumenItems,
  textoRegresoLibre,
  textoTicketGuardado,
  vistaCobroLibre,
  recibidoDeAtajo,
  regresoEn,
  textoBloqueoCancelar,
  textoBorrarCategoria,
  textoCancelar,
  textoEstado,
  textoQuitarProducto,
  totalesDelDia,
  vistaCobrar,
  vistaProducto,
  vistaTicket,
  escribirPrecio,
  type PedidoLeido,
} from "./dominio.ts"

const MEDIODIA = Date.parse("2026-11-16T18:00:00.000Z")
const DIA = "2026-11-16"

function pedido(parcial: Partial<PedidoLeido> & Pick<PedidoLeido, "estado" | "total">): PedidoLeido {
  return {
    id: parcial.id ?? "p",
    numero: parcial.numero ?? 43,
    tipo: "venta",
    concepto: null,
    items: [],
    creadoEn: MEDIODIA,
    pagadoEn: null,
    canceladoEn: null,
    metodo: null,
    efectivo: null,
    cobroActivoId: null,
    cobros: [],
    ...parcial,
  }
}

describe("catálogo", () => {
  it("arma iniciales y corta el nombre en 40", () => {
    expect(iniciales("Champurrado")).toBe("CH")
    expect(iniciales("Gordita de queso")).toBe("GQ")
    expect(iniciales("Concha")).toBe("CO")
    expect(iniciales("Café americano")).toBe("CA")
    expect(limitarNombre("A".repeat(50))).toHaveLength(40)
  })

  it("marca agotado solo el día guardado en Ciudad de México", () => {
    expect(estaAgotado("2026-11-16", MEDIODIA)).toBe(true)
    expect(estaAgotado("2026-11-16", Date.parse("2026-11-17T06:30:00.000Z"))).toBe(false)
    expect(fechaEnMexico(MEDIODIA)).toBe(DIA)
  })

  it("valida el producto antes de guardar", () => {
    const vacio = vistaProducto({ nombre: "", precioCentavos: 3500, intento: true, guardando: false, editando: false })
    expect(vacio.ayudaNombre).toBe("Escribe un nombre.")
    expect(vacio.puedeGuardar).toBe(false)
    const limite = vistaProducto({ nombre: "A".repeat(40), precioCentavos: 3850, intento: false, guardando: false, editando: false })
    expect(limite.ayudaNombre).toBe("40 de 40 · Ya no caben más letras.")
    const cero = vistaProducto({ nombre: "Café", precioCentavos: 0, intento: true, guardando: false, editando: false })
    expect(cero.ayudaPrecio).toBe("Ponle un precio.")
    expect(cero.puedeGuardar).toBe(false)
    const guardando = vistaProducto({ nombre: "Café", precioCentavos: 3850, intento: false, guardando: true, editando: false })
    expect(guardando.etiquetaGuardar).toBe("Guardando…")
    expect(guardando.puedeGuardar).toBe(false)
    expect(centavosDeTeclado("38.50")).toBe(3850)
    expect(escribirPrecio("38.", "5")).toBe("38.5")
  })

  it("confirma borrar categoría y quitar producto", () => {
    expect(textoBorrarCategoria("Café", 4)).toEqual({
      titulo: "¿Borrar Café?",
      apoyo: "Los 4 productos pasan a Sin categoría.",
    })
    expect(textoQuitarProducto("Café americano").titulo).toBe("¿Quitar Café americano?")
    expect(textoQuitarProducto("Café americano").apoyo).toContain("Los tickets viejos no cambian.")
  })

  it("no pone Todas en la venta y sí en editar", () => {
    const categorias = [{ id: "cafe", nombre: "Café" }]
    expect(chipsVenta(categorias, false).map((chip) => chip.nombre)).toEqual(["Café"])
    expect(chipsEdicion(categorias, true).map((chip) => chip.nombre)).toEqual(["Todas", "Café", "Sin categoría", "Nueva"])
  })
})

describe("ticket y efectivo", () => {
  it("suma al tocar y no agrega un agotado", () => {
    const cafe = { id: "cafe", nombre: "Café americano", precioCentavos: 3500 }
    const una = agregarProducto([], cafe, false)
    const dos = agregarProducto(una, cafe, true)
    const tres = agregarProducto(dos, cafe, false)
    expect(tres).toHaveLength(1)
    expect(tres[0]?.cantidad).toBe(2)
    expect(vistaTicket(tres, true).cobrar).toBe("Cobrar $70")
    expect(vistaTicket(tres, true).piezas).toBe("2 productos")
    const vacio = vistaTicket([], false)
    expect(vacio.mensaje).toBe("Aún no hay productos.")
    expect(vacio.apoyo).toBe("Mientras, usa cobro libre.")
    expect(vacio.mostrarEditar).toBe(false)
    expect(vistaTicket([], true).mensaje).toBe("Todo listo para vender.")
    expect(vistaTicket([], true).apoyo).toContain("Toca otra vez")
  })

  it("calcula el cambio y los atajos", () => {
    const cambio = cambioEfectivo(12200, 20000)
    expect(pesosFijos(cambio.total)).toBe("$122.00")
    expect(pesosFijos(cambio.recibido)).toBe("$200.00")
    expect(pesosFijos(cambio.cambio)).toBe("$78.00")
    expect(cambio.alcanza).toBe(true)
    expect(recibidoDeAtajo("exacto", 12200)).toBe(12200)
    expect(recibidoDeAtajo("150", 12200)).toBe(15000)
    expect(recibidoDeAtajo("500", 12200)).toBe(50000)
    expect(ATAJOS_EFECTIVO.map((atajo) => atajo.etiqueta)).toEqual(["Exacto", "$150", "$200", "$500"])
    expect(etiquetaConfirmarEfectivo(12200)).toBe("Cobrar $122 en efectivo")
    expect(etiquetaCobrar(12200)).toBe("Cobrar $122")
  })

  it("arma cobrar con CoDi según la cuenta y sin dividir", () => {
    const activo = vistaCobrar(43, 4, 12200, null)
    expect(activo.subtitulo).toBe("Ticket #0043 · 4 productos")
    expect(activo.total).toBe("$122.00")
    expect(activo.efectivoAyuda).toBe("Captura cuánto te dan y te decimos el cambio.")
    expect(activo.codiAyuda).toBe("QR en pantalla o aviso al celular del cliente.")
    expect(activo.codiPastilla).toBe("Sin comisión")
    expect(activo.codiHabilitado).toBe(true)
    expect(activo.dividir).toBe(false)
    const tramite = vistaCobrar(43, 4, 12200, "tramite")
    expect(tramite.codiHabilitado).toBe(false)
    expect(tramite.codiAyuda).toContain("cuenta nueva")
    expect(tramite.aviso).toBe("Mientras, solo puedes cobrar en efectivo")
    expect(vistaCobrar(43, 4, 12200, "primera").aviso).toBe("Mientras la revisamos, cobra en efectivo.")
    const libre = vistaCobrar(45, 0, 8500, null, { concepto: "Abono de Don Pepe" })
    expect(libre.subtitulo).toBe("Ticket #0045 · Cobro libre · Abono de Don Pepe")
    expect(libre.despues).toBe("Después eliges efectivo o CoDi, como en cualquier venta.")
  })
})

describe("cobro libre", () => {
  it("pide el monto, acepta centavos y corta el concepto en 40", () => {
    const vacio = vistaCobroLibre({ texto: "", concepto: "", productosGuardados: 0 })
    expect(vacio.monto).toBe("$0")
    expect(vacio.ayudaMonto).toBe("Escribe el monto con los números. Para centavos usa el punto.")
    expect(vacio.puedeCobrar).toBe(false)
    expect(vacio.cobrar).toBe("Cobrar")
    expect(vacio.apoyo).toBe("Cobra un monto sin elegir productos")

    const cero = vistaCobroLibre({ texto: "0.00", concepto: "", productosGuardados: 0 })
    expect(cero.monto).toBe("$0.00")
    expect(cero.ayudaMonto).toBe("El monto tiene que ser mayor a $0.")
    expect(cero.puedeCobrar).toBe(false)
    expect(datosCobroLibre("0", "")).toBeNull()

    const pesosEnteros = vistaCobroLibre({ texto: "85", concepto: "Abono de Don Pepe", productosGuardados: 0 })
    expect(pesosEnteros.monto).toBe("$85")
    expect(pesosEnteros.ayudaMonto).toBe("Son $85.00. Para centavos usa el punto.")
    expect(pesosEnteros.cobrar).toBe("Cobrar $85.00")
    expect(pesosEnteros.contador).toBe("17/40")
    expect(datosCobroLibre("85", "Abono de Don Pepe")).toEqual({ total: 8500, concepto: "Abono de Don Pepe", items: [] })

    const centavos = vistaCobroLibre({ texto: "85.50", concepto: "", productosGuardados: 0 })
    expect(centavos.monto).toBe("$85.50")
    expect(centavos.ayudaMonto).toBe("Son $85.50. Para centavos usa el punto.")
    expect(centavos.puedeCobrar).toBe(true)
    expect(datosCobroLibre("85.5", "  ")).toEqual({ total: 8550, concepto: null, items: [] })

    const concepto = "Abono de Don Pepe, pan y café del sábado"
    expect([...concepto]).toHaveLength(40)
    const limite = vistaCobroLibre({ texto: "85", concepto, productosGuardados: 0 })
    expect(limite.contador).toBe("40/40")
    expect(limite.ayudaConcepto).toBe("Máximo 40 letras. Ya no caben más.")
    expect(limite.puedeCobrar).toBe(true)
    expect(datosCobroLibre("85", `${concepto} extra`)?.concepto).toBe(concepto)
  })

  it("aparta un ticket de 4 productos y no lo mezcla con el cobro", () => {
    const lineas = [
      { productoId: "cafe", nombre: "Café americano", precioCentavos: 3500, cantidad: 2 },
      { productoId: "tamal", nombre: "Tamal verde", precioCentavos: 2200, cantidad: 1 },
      { productoId: "gordita", nombre: "Gordita de chicharrón", precioCentavos: 3000, cantidad: 1 },
    ]
    const vista = vistaCobroLibre({ texto: "85", concepto: "Abono de Don Pepe", productosGuardados: 4 })
    expect(vista.ticketGuardado).toBe("Tu ticket con 4 productos se queda guardado. Al terminar, vuelves a él.")
    expect(textoTicketGuardado(4)).toBe(vista.ticketGuardado)
    expect(textoRegresoLibre(4)).toBe("Cobro libre listo. Aquí sigue tu ticket con 4 productos.")
    const cobro = datosCobroLibre("85", "Abono de Don Pepe")
    expect(cobro?.items).toEqual([])
    expect(lineas).toHaveLength(3)
    expect(lineas.reduce((suma, linea) => suma + linea.cantidad, 0)).toBe(4)
  })

  it("suma el cobro libre en los totales y rechaza más de $1,000.00", () => {
    const pagado = pedido({
      id: "libre-pagado",
      numero: 45,
      tipo: "libre",
      concepto: "Abono de Don Pepe",
      estado: "Pagado",
      total: 8500,
      metodo: "codi",
      pagadoEn: MEDIODIA,
    })
    const pendiente = pedido({
      id: "libre-pendiente",
      numero: 46,
      tipo: "libre",
      concepto: "Doña Lupe",
      estado: "Pendiente",
      total: 6000,
      cobroActivoId: "c",
      cobros: [{ id: "c", creadoEn: MEDIODIA - 400_000, venceEn: MEDIODIA - 1_000, estado: "vencido", pagos: [] }],
    })
    const otro = pedido({ id: "venta-pendiente", estado: "Pendiente", total: 6500 })
    const totales = totalesDelDia([pagado, pendiente, otro], DIA)
    expect(totales.vendido).toBe(8500)
    expect(totales.tickets).toBe(1)
    expect(totales.codi).toBe(8500)
    expect(totales.pendiente).toBe(12_500)
    expect(resumenItems(pagado, MEDIODIA)).toBe("Cobro libre · Abono de Don Pepe")
    expect(etiquetaLibre(null)).toBe("Cobro libre")
    expect(resumenItems(pedido({ tipo: "libre", concepto: "   ", estado: "Pagado", total: 4000, metodo: "efectivo", pagadoEn: MEDIODIA }), MEDIODIA)).toBe("Cobro libre")
    expect(resumenItems(pendiente, MEDIODIA)).toBe("Cobro libre · Doña Lupe · cobro vencido")

    const tope = vistaCobroLibre({ texto: "1000", concepto: "", productosGuardados: 0 })
    expect(tope.puedeCobrar).toBe(true)
    expect(datosCobroLibre("1000.00", "")?.total).toBe(100_000)
    const arriba = vistaCobroLibre({ texto: "1000.01", concepto: "", productosGuardados: 0 })
    expect(arriba.puedeCobrar).toBe(false)
    expect(arriba.cobrar).toBe("Cobrar")
    expect(arriba.sobreMaximo).toBe(true)
    expect(arriba.ayudaMonto).toBe("El monto máximo por cobro es de $1,000.00.")
    expect(vistaCobroLibre({ texto: "15000", concepto: "", productosGuardados: 0 }).monto).toBe("$15,000")
    expect(datosCobroLibre("15000", "Abono")).toBeNull()
  })
})

describe("estados, pendientes e historial", () => {
  it("deriva cobrando, vencido, pagado y cancelado", () => {
    const ahora = MEDIODIA
    const cobrando = pedido({
      estado: "Pendiente",
      total: 12200,
      cobroActivoId: "c1",
      cobros: [{ id: "c1", creadoEn: ahora, venceEn: ahora + 220_000, estado: "activo", pagos: [] }],
    })
    expect(estadoVisible(cobrando, ahora)).toBe("cobrando")
    expect(textoEstado(cobrando, ahora)).toBe("Cobrando 3:40")
    expect(puedeCancelar(cobrando, ahora)).toBe(false)
    expect(textoBloqueoCancelar(cobrando, ahora)).toBe("Hay un cobro activo. Espera a que venza (3:40) o cóbralo.")
    const vencido = pedido({
      estado: "Pendiente",
      total: 1000,
      cobroActivoId: "c1",
      cobros: [{ id: "c1", creadoEn: ahora - 400_000, venceEn: ahora - 40_000, estado: "vencido", pagos: [] }],
    })
    expect(textoEstado(vencido, ahora)).toBe("Pendiente · cobro vencido")
    expect(puedeCancelar(vencido, ahora)).toBe(true)
    expect(textoCancelar(37)).toBe("¿Cancelar el pedido #0037?")
    expect(formatoNumero(45)).toBe("#0045")
    expect(textoEstado(pedido({ estado: "Pagado", total: 100, metodo: "efectivo" }), ahora)).toBe("Pagado en efectivo")
    expect(estadoVisible(pedido({ estado: "Cancelado", total: 100 }), ahora)).toBe("cancelado")
    expect(regresoEn(5)).toBe("Regresando al catálogo en 5 s")
  })

  it("suma los ejemplos de vendido, CoDi, efectivo y por devolver", () => {
    const pagado = (parcial: Partial<PedidoLeido> & Pick<PedidoLeido, "total" | "metodo">) =>
      pedido({ estado: "Pagado", pagadoEn: MEDIODIA, ...parcial })
    const dia = [
      pagado({ id: "a", total: 10000, metodo: "codi" }),
      pagado({ id: "b", total: 11700, metodo: "codi" }),
      pagado({ id: "c", total: 5000, metodo: "efectivo" }),
      pagado({ id: "d", total: 5700, metodo: "efectivo" }),
      pedido({ id: "e", estado: "Pendiente", total: 4000 }),
      pedido({ id: "f", estado: "Cancelado", total: 9000 }),
    ]
    const normal = totalesDelDia(dia, DIA)
    expect(pesos(normal.vendido)).toBe("$324")
    expect(normal.tickets).toBe(4)
    expect(pesos(normal.codi)).toBe("$217")
    expect(normal.pagosCodi).toBe(2)
    expect(pesos(normal.efectivo)).toBe("$107")
    expect(normal.pendiente).toBe(4000)
    expect(normal.porDevolver).toBe(0)

    const base = [
      pagado({ id: "c1", total: 38100, metodo: "codi", cobros: [{ id: "q", creadoEn: MEDIODIA, venceEn: MEDIODIA, estado: "pagado", pagos: [{ id: "x", tipo: "duplicado", monto: 9500, datePaid: MEDIODIA, transactionId: null }] }] }),
      pagado({ id: "e1", total: 10700, metodo: "efectivo" }),
    ]
    const duplicado = totalesDelDia(base, DIA)
    expect(pesos(duplicado.vendido)).toBe("$488")
    expect(pesos(duplicado.codi)).toBe("$476")
    expect(notaPorDevolver(duplicado.porDevolver)).toBe("Incluye $95 por devolver")

    const mixto = totalesDelDia(
      [
        pagado({
          total: 5000,
          metodo: "efectivo",
          cobros: [{ id: "q", creadoEn: MEDIODIA, venceEn: MEDIODIA, estado: "pagado", pagos: [{ id: "x", tipo: "duplicado", monto: 5000, datePaid: MEDIODIA, transactionId: null }] }],
        }),
      ],
      DIA,
    )
    expect(mixto.vendido).toBe(5000)
    expect(notaPorDevolver(mixto.porDevolver)).toBe("Incluye $50 por devolver")
    expect(mixto.codi).toBe(5000)

    const cancelado = pedido({
      estado: "Cancelado",
      total: 6500,
      cobros: [{ id: "q", creadoEn: MEDIODIA, venceEn: MEDIODIA, estado: "vencido", pagos: [{ id: "x", tipo: "no_esperado", monto: 6500, datePaid: MEDIODIA, transactionId: null }] }],
    })
    const noEsperado = totalesDelDia([cancelado], DIA)
    expect(noEsperado.vendido).toBe(0)
    expect(notaPorDevolver(noEsperado.porDevolver)).toBe("Incluye $65 por devolver")
    expect(filaConPagoNoEsperado(cancelado)).toBe(true)
    expect(etiquetaIntento(cancelado.cobros[0]!, MEDIODIA)).toBe("No esperado")
  })

  it("cuenta la venta el día del pago en Ciudad de México", () => {
    const creado = Date.parse("2026-11-16T18:20:00.000Z")
    const pagado = Date.parse("2026-11-17T16:32:00.000Z")
    const orden = pedido({
      estado: "Pagado",
      total: 12200,
      metodo: "codi",
      creadoEn: creado,
      pagadoEn: pagado,
      numero: 41,
    })
    expect(pedidosDelDia([orden], "2026-11-16")).toHaveLength(0)
    expect(pedidosDelDia([orden], "2026-11-17")).toHaveLength(1)
    expect(notaPagoOtroDia(orden)).toBe("Pedido 16 nov 12:20 · Pagado 17 nov 10:32 con CoDi")
    const mismoDia = totalesDelDia([orden], "2026-11-17")
    expect(mismoDia.vendido).toBe(12200)
    expect(totalesDelDia([orden], "2026-11-16").vendido).toBe(0)
  })
})
