/** Catálogo, ticket, efectivo, estados e historial. Sin llamadas a Pey. */

export const ZONA = "America/Mexico_City"
export const LIMITE_NOMBRE = 40

export const TEXTO_NOMBRE_VACIO = "Escribe un nombre."
export const TEXTO_NOMBRE_LIMITE = "40 de 40 · Ya no caben más letras."
export const TEXTO_NOMBRE_AYUDA = "Como lo llamas en tu negocio."
export const TEXTO_PRECIO_CERO = "Ponle un precio."
export const TEXTO_PRECIO_AYUDA = "Toca para escribirlo."
export const TEXTO_GUARDANDO = "Guardando…"
export const TEXTO_GUARDAR = "Guardar producto"
export const TEXTO_GUARDAR_CAMBIOS = "Guardar cambios"
export const TEXTO_EJEMPLO_CATEGORIA = "Ejemplo: Café, Tamales, Bebidas."
export const TEXTO_CATEGORIA_APOYO = "Así se agrupan tus productos."
export const TEXTO_RENOMBRAR_APOYO = "Se actualiza en todos los productos."
export const TEXTO_TICKETS_VIEJOS = "Los tickets viejos no cambian."
export const TEXTO_AGOTADO_AYUDA = "Se ve apagado en la venta. Mañana vuelve solo."
export const TEXTO_AGOTADO = "Agotado hoy"
export const TEXTO_ARMA = "Arma tu catálogo"
export const TEXTO_ARMA_APOYO = "Agrega tu primer producto para vender más rápido."
export const TEXTO_AGREGAR = "Agregar producto"
export const TEXTO_TICKET_SIN_CATALOGO = "Aún no hay productos."
export const TEXTO_TICKET_COBRO_LIBRE = "Mientras, usa cobro libre."
export const TEXTO_TICKET_LISTO = "Todo listo para vender."
export const TEXTO_TICKET_TOCA = "Toca la foto de un producto para agregarlo. Toca otra vez para sumar uno más."
export const TEXTO_SIN_PRODUCTOS = "Sin productos"
export const TEXTO_EFECTIVO_AYUDA = "Captura cuánto te dan y te decimos el cambio."
export const TEXTO_CODI_AYUDA = "QR en pantalla o aviso al celular del cliente."
export const TEXTO_SIN_COMISION = "Sin comisión"
export const TEXTO_CODI_PRIMERA = "Se activa cuando tu cuenta quede lista."
export const TEXTO_CODI_TRAMITE = "CoDi sigue apagado hasta que tu cuenta nueva quede activa."
export const TEXTO_AVISO_PRIMERA = "Mientras la revisamos, cobra en efectivo."
export const TEXTO_AVISO_TRAMITE = "Mientras, solo puedes cobrar en efectivo"
export const TEXTO_CONFIRMAR_HISTORIAL = "Al confirmar se cierra la venta y se guarda en el historial."
export const TEXTO_YA_QUEDO = "¡Ya quedó!"
export const TEXTO_DETALLE_COBRO = "Detalle del cobro"
export const TEXTO_NUEVA_VENTA = "Nueva venta"
export const TEXTO_PENDIENTES_APOYO = "Ventas sin pagar. Se quedan hasta que las cobres o canceles."
export const TEXTO_CANCELAR_APOYO = "Sale de Pendientes. No se puede deshacer."
export const TEXTO_SI_CANCELAR = "Sí, cancelar pedido"
export const TEXTO_VOLVER = "Volver"
export const TEXTO_INTERNET = "Se necesita internet"
export const TEXTO_INTERNET_APOYO = "Para vender y cobrar, esta tablet tiene que estar conectada."
export const TEXTO_ENTENDIDO = "Entendido"
export const TEXTO_REVISION = "Cuenta en revisión: cobra en efectivo por ahora."
export const TEXTO_FOTO = "Foto opcional"
export const TEXTO_FOTO_AYUDA = "Se ve bien sin ella."
export const TEXTO_FOTO_TITULO = "Foto del producto"
export const TEXTO_FOTO_TOMA = "Tómala o elígela de la galería."
export const TEXTO_TOMAR = "Tomar foto"
export const TEXTO_GALERIA = "Elegir de la galería"
export const TEXTO_QUITAR = "Quitar producto"
export const TEXTO_SI_QUITAR = "Sí, quitar producto"
export const TEXTO_QUITAR_APOYO = "Sale del catálogo. Los tickets viejos no cambian."
export const TEXTO_SI_BORRAR = "Sí, borrar categoría"
export const TEXTO_CREAR_CATEGORIA = "Crear categoría"
export const TEXTO_GUARDAR_NOMBRE = "Guardar nombre"
export const TEXTO_RETOMAR = "Hay un cobro activo"
export const TEXTO_RETOMAR_APOYO = "Muestra el mismo QR. Si haces otro, serían dos cobros."
export const TEXTO_MISMO_QR = "Mostrar el mismo QR"
export const TEXTO_OTRO_METODO = "Elegir otro método"
/** El texto aprobado todavía no está en Figma. */
export const TEXTO_YA_PAGADO = "Este pedido ya estaba pagado."

const PARTICULAS = new Set(["de", "del", "la", "las", "el", "los", "y", "con", "a"])

export function limitarNombre(valor: string): string {
  return [...valor].slice(0, LIMITE_NOMBRE).join("")
}

export function ayudaNombre(nombre: string, intento: boolean): { texto: string; error: boolean } {
  const limpio = nombre.trim()
  if (limpio.length === 0 && intento) return { texto: TEXTO_NOMBRE_VACIO, error: true }
  if ([...nombre].length >= LIMITE_NOMBRE) return { texto: TEXTO_NOMBRE_LIMITE, error: false }
  return { texto: TEXTO_NOMBRE_AYUDA, error: false }
}

export function iniciales(nombre: string): string {
  const limpio = nombre.normalize("NFD").replace(/\p{M}/gu, "")
  const palabras = limpio
    .split(/\s+/)
    .map((parte) => parte.replace(/[^0-9a-zA-Z]/g, ""))
    .filter((parte) => parte.length > 0)
  const utiles = palabras.filter((parte) => !PARTICULAS.has(parte.toLowerCase()))
  const base = utiles.length > 0 ? utiles : palabras
  const primera = base[0]
  if (!primera) return ""
  const segunda = base[1]
  if (!segunda) return primera.slice(0, 2).toUpperCase()
  return `${primera[0] ?? ""}${segunda[0] ?? ""}`.toUpperCase()
}

export function fechaEnMexico(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms))
}

export function estaAgotado(agotadoEl: string | null, ahora: number): boolean {
  return agotadoEl !== null && agotadoEl === fechaEnMexico(ahora)
}

export function pesos(centavos: number): string {
  return moneda(centavos, false)
}

export function pesosFijos(centavos: number): string {
  return moneda(centavos, true)
}

function moneda(centavos: number, siempreCentavos: boolean): string {
  const negativo = centavos < 0
  const absoluto = Math.abs(Math.trunc(centavos))
  const entero = Math.floor(absoluto / 100)
  const fraccion = absoluto % 100
  const cuerpo =
    !siempreCentavos && fraccion === 0
      ? entero.toLocaleString("es-MX")
      : `${entero.toLocaleString("es-MX")}.${String(fraccion).padStart(2, "0")}`
  return `${negativo ? "-" : ""}$${cuerpo}`
}

export function centavosDeTeclado(texto: string): number {
  const limpio = texto.replace(/[^0-9.]/g, "")
  if (limpio === "" || limpio === ".") return 0
  const [enteros, fraccion = ""] = limpio.split(".")
  const pesosEnteros = Number(enteros || "0")
  const centavos = Number((fraccion + "00").slice(0, 2))
  if (!Number.isFinite(pesosEnteros) || !Number.isFinite(centavos)) return 0
  return pesosEnteros * 100 + centavos
}

export function escribirPrecio(actual: string, tecla: string): string {
  if (tecla === "borrar") return actual.slice(0, -1)
  if (tecla === "." || tecla === "·") {
    if (actual.includes(".")) return actual
    return actual === "" ? "0." : `${actual}.`
  }
  if (!/^\d$/.test(tecla)) return actual
  const punto = actual.indexOf(".")
  if (punto >= 0 && actual.length - punto > 2) return actual
  if (actual === "0") return tecla
  return `${actual}${tecla}`.slice(0, 10)
}

export function escribirEfectivo(actual: string, tecla: string): string {
  if (tecla === "borrar") return actual.slice(0, -1).replace(/^0+(?=\d)/, "")
  if (!/^\d+$/.test(tecla)) return actual
  const siguiente = `${actual}${tecla}`.replace(/^0+(?=\d)/, "")
  return siguiente.slice(0, 7)
}

export interface VistaProducto {
  ayudaNombre: string
  errorNombre: boolean
  ayudaPrecio: string
  errorPrecio: boolean
  puedeGuardar: boolean
  etiquetaGuardar: string
}

export function vistaProducto(entrada: {
  nombre: string
  precioCentavos: number
  intento: boolean
  guardando: boolean
  editando: boolean
}): VistaProducto {
  const nombre = ayudaNombre(entrada.nombre, entrada.intento)
  const precioEnCero = entrada.precioCentavos <= 0
  const errorPrecio = precioEnCero && entrada.intento
  return {
    ayudaNombre: nombre.texto,
    errorNombre: nombre.error,
    ayudaPrecio: errorPrecio ? TEXTO_PRECIO_CERO : precioEnCero ? TEXTO_PRECIO_AYUDA : "",
    errorPrecio,
    puedeGuardar: entrada.nombre.trim().length > 0 && !precioEnCero && !entrada.guardando,
    etiquetaGuardar: entrada.guardando ? TEXTO_GUARDANDO : entrada.editando ? TEXTO_GUARDAR_CAMBIOS : TEXTO_GUARDAR,
  }
}

export function textoBorrarCategoria(nombre: string, productos: number): { titulo: string; apoyo: string } {
  return {
    titulo: `¿Borrar ${nombre}?`,
    apoyo: `Los ${productos} productos pasan a Sin categoría.`,
  }
}

export function textoQuitarProducto(nombre: string): { titulo: string; apoyo: string } {
  return { titulo: `¿Quitar ${nombre}?`, apoyo: TEXTO_QUITAR_APOYO }
}

export interface LineaTicket {
  productoId: string | null
  nombre: string
  precioCentavos: number
  cantidad: number
}

export function totalLineas(lineas: LineaTicket[]): number {
  return lineas.reduce((suma, linea) => suma + linea.precioCentavos * linea.cantidad, 0)
}

export function piezas(lineas: LineaTicket[]): number {
  return lineas.reduce((suma, linea) => suma + linea.cantidad, 0)
}

export function agregarProducto(lineas: LineaTicket[], producto: { id: string; nombre: string; precioCentavos: number }, agotado: boolean): LineaTicket[] {
  if (agotado) return lineas
  const previa = lineas.find((linea) => linea.productoId === producto.id)
  if (!previa) {
    return [...lineas, { productoId: producto.id, nombre: producto.nombre, precioCentavos: producto.precioCentavos, cantidad: 1 }]
  }
  return lineas.map((linea) =>
    linea.productoId === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea,
  )
}

export function cambiarCantidad(lineas: LineaTicket[], productoId: string | null, delta: number): LineaTicket[] {
  return lineas.flatMap((linea) => {
    if (linea.productoId !== productoId) return [linea]
    const cantidad = linea.cantidad + delta
    return cantidad > 0 ? [{ ...linea, cantidad }] : []
  })
}

export function textoPiezas(cantidad: number): string {
  if (cantidad <= 0) return TEXTO_SIN_PRODUCTOS
  return cantidad === 1 ? "1 producto" : `${cantidad} productos`
}

export function etiquetaCobrar(total: number): string {
  return `Cobrar ${pesos(total)}`
}

export function etiquetaConfirmarEfectivo(total: number): string {
  return `Cobrar ${pesos(total)} en efectivo`
}

export interface CambioEfectivo {
  total: number
  recibido: number
  cambio: number
  alcanza: boolean
}

export function cambioEfectivo(total: number, recibido: number): CambioEfectivo {
  return { total, recibido, cambio: recibido - total, alcanza: recibido >= total }
}

export const ATAJOS_EFECTIVO = [
  { id: "exacto", etiqueta: "Exacto" },
  { id: "150", etiqueta: "$150" },
  { id: "200", etiqueta: "$200" },
  { id: "500", etiqueta: "$500" },
] as const

export function recibidoDeAtajo(id: string, total: number): number | null {
  if (id === "exacto") return total
  if (id === "150") return 15_000
  if (id === "200") return 20_000
  if (id === "500") return 50_000
  return null
}

export type EstadoPedido = "Pendiente" | "Pagado" | "Cancelado"
export type MetodoPago = "efectivo" | "codi"
export type TipoPago = "normal" | "duplicado" | "no_esperado"

export interface PagoLeido {
  id: string
  tipo: TipoPago
  monto: number
  datePaid: number
  transactionId: string | null
}

export interface CobroLeido {
  id: string
  creadoEn: number
  venceEn: number
  estado: "activo" | "vencido" | "pagado"
  pagos: PagoLeido[]
  qrString?: string | null
  codiQrId?: string | null
}

export interface PedidoLeido {
  id: string
  numero: number
  tipo: "venta" | "libre"
  concepto: string | null
  items: { productoId: string | null; nombre: string; precioCentavos: number; cantidad: number }[]
  total: number
  estado: EstadoPedido
  creadoEn: number
  pagadoEn: number | null
  canceladoEn: number | null
  metodo: MetodoPago | null
  efectivo: { recibido: number; cambio: number } | null
  cobroActivoId: string | null
  cobros: CobroLeido[]
}

export type EstadoVisible = "pendiente" | "cobrando" | "vencido" | "pagado" | "cancelado"

export function formatoNumero(numero: number): string {
  return `#${String(Math.trunc(numero)).padStart(4, "0")}`
}

export function cobroVigente(pedido: Pick<PedidoLeido, "cobroActivoId" | "cobros">, ahora: number): CobroLeido | null {
  if (!pedido.cobroActivoId) return null
  const cobro = pedido.cobros.find((item) => item.id === pedido.cobroActivoId)
  if (!cobro || cobro.venceEn <= ahora || cobro.estado === "pagado") return null
  return cobro
}

export function estadoVisible(pedido: PedidoLeido, ahora: number): EstadoVisible {
  if (pedido.estado === "Pagado") return "pagado"
  if (pedido.estado === "Cancelado") return "cancelado"
  if (cobroVigente(pedido, ahora)) return "cobrando"
  const cobro = pedido.cobroActivoId ? pedido.cobros.find((item) => item.id === pedido.cobroActivoId) : undefined
  if (cobro && pedido.estado === "Pendiente") return "vencido"
  return "pendiente"
}

export function reloj(restanteMs: number): string {
  const total = Math.max(0, Math.ceil(restanteMs / 1000))
  const minutos = Math.floor(total / 60)
  const segundos = total % 60
  return `${minutos}:${String(segundos).padStart(2, "0")}`
}

export function textoEstado(pedido: PedidoLeido, ahora: number): string {
  const visible = estadoVisible(pedido, ahora)
  if (visible === "pagado") return pedido.metodo === "efectivo" ? "Pagado en efectivo" : "Pagado"
  if (visible === "cancelado") return "Cancelado"
  if (visible === "vencido") return "Pendiente · cobro vencido"
  if (visible === "cobrando") {
    const cobro = cobroVigente(pedido, ahora)
    return `Cobrando ${reloj((cobro?.venceEn ?? ahora) - ahora)}`
  }
  return "Pendiente"
}

export function puedeCancelar(pedido: PedidoLeido, ahora: number): boolean {
  return pedido.estado === "Pendiente" && !cobroVigente(pedido, ahora)
}

export function textoBloqueoCancelar(pedido: PedidoLeido, ahora: number): string | null {
  const cobro = cobroVigente(pedido, ahora)
  if (!cobro) return null
  return `Hay un cobro activo. Espera a que venza (${reloj(cobro.venceEn - ahora)}) o cóbralo.`
}

export function textoCancelar(numero: number): string {
  return `¿Cancelar el pedido ${formatoNumero(numero)}?`
}

export function textoRetomar(pedido: PedidoLeido, ahora: number): { titulo: string; apoyo: string; vence: string } | null {
  const cobro = cobroVigente(pedido, ahora)
  if (!cobro) return null
  return {
    titulo: TEXTO_RETOMAR,
    apoyo: TEXTO_RETOMAR_APOYO,
    vence: `Vence en ${reloj(cobro.venceEn - ahora)} · a las ${horaMexico(cobro.venceEn)}`,
  }
}

export function horaMexico(ms: number): string {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))
  const hora = partes.find((parte) => parte.type === "hour")?.value ?? "00"
  const minuto = partes.find((parte) => parte.type === "minute")?.value ?? "00"
  return `${hora}:${minuto}`
}

export function horaCompleta(ms: number): string {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))
  const tomar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00"
  return `${tomar("hour")}:${tomar("minute")}:${tomar("second")}`
}

export function fechaCorta(ms: number): string {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(ms))
  const dia = partes.find((parte) => parte.type === "day")?.value ?? ""
  const mes = (partes.find((parte) => parte.type === "month")?.value ?? "").replace(".", "")
  return `${dia} ${mes}`
}

export function fechaLarga(ms: number): string {
  const texto = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(ms))
  return texto.replace(",", "")
}

export function fechaBarra(ms: number): string {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(ms))
  const tomar = (tipo: string) => (partes.find((parte) => parte.type === tipo)?.value ?? "").replace(".", "")
  const semana = tomar("weekday")
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${tomar("day")} ${tomar("month")}`
}

export function diaChip(ms: number): string {
  const partes = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
  }).formatToParts(new Date(ms))
  const semana = (partes.find((parte) => parte.type === "weekday")?.value ?? "").replace(".", "")
  const dia = partes.find((parte) => parte.type === "day")?.value ?? ""
  const limpio = semana.charAt(0).toUpperCase() + semana.slice(1)
  return `${limpio} ${dia}`
}

export function encabezadoDia(dia: string, ahora: number): string {
  const ms = instanteDelDia(dia)
  const texto = fechaLarga(ms)
  if (dia === fechaEnMexico(ahora)) return `Hoy · ${texto}`
  if (dia === fechaEnMexico(ahora - 86_400_000)) return `Ayer · ${texto}`
  return texto
}

export function instanteDelDia(dia: string): number {
  const [anio, mes, numero] = dia.split("-").map(Number)
  const utc = Date.UTC(anio ?? 1970, (mes ?? 1) - 1, numero ?? 1, 6, 0, 0)
  const clave = fechaEnMexico(utc)
  if (clave === dia) return utc
  return clave < dia ? utc + 86_400_000 : utc - 86_400_000
}

export interface TotalesDia {
  vendido: number
  tickets: number
  codi: number
  pagosCodi: number
  efectivo: number
  pagosEfectivo: number
  pendiente: number
  porDevolver: number
}

export function totalesDelDia(pedidos: PedidoLeido[], dia: string): TotalesDia {
  const totales: TotalesDia = {
    vendido: 0,
    tickets: 0,
    codi: 0,
    pagosCodi: 0,
    efectivo: 0,
    pagosEfectivo: 0,
    pendiente: 0,
    porDevolver: 0,
  }
  for (const pedido of pedidos) {
    if (pedido.estado === "Pendiente") totales.pendiente += pedido.total
    if (pedido.estado === "Pagado" && pedido.pagadoEn !== null && fechaEnMexico(pedido.pagadoEn) === dia) {
      totales.vendido += pedido.total
      totales.tickets += 1
      if (pedido.metodo === "efectivo") {
        totales.efectivo += pedido.total
        totales.pagosEfectivo += 1
      }
      if (pedido.metodo === "codi") {
        totales.codi += pedido.total
        totales.pagosCodi += 1
      }
    }
    for (const cobro of pedido.cobros) {
      for (const pago of cobro.pagos) {
        if (pago.tipo === "normal") continue
        if (fechaEnMexico(pago.datePaid) !== dia) continue
        totales.codi += pago.monto
        totales.porDevolver += pago.monto
      }
    }
  }
  return totales
}

export function notaPorDevolver(centavos: number): string | null {
  if (centavos <= 0) return null
  return `Incluye ${pesos(centavos)} por devolver`
}

export function notaPagoOtroDia(pedido: PedidoLeido): string | null {
  if (pedido.estado !== "Pagado" || pedido.pagadoEn === null) return null
  if (fechaEnMexico(pedido.creadoEn) === fechaEnMexico(pedido.pagadoEn)) return null
  const metodo = pedido.metodo === "efectivo" ? "efectivo" : "CoDi"
  return `Pedido ${fechaCorta(pedido.creadoEn)} ${horaMexico(pedido.creadoEn)} · Pagado ${fechaCorta(pedido.pagadoEn)} ${horaMexico(pedido.pagadoEn)} con ${metodo}`
}

export function etiquetaIntento(cobro: CobroLeido, ahora: number): string {
  const pago = cobro.pagos.find((item) => item.tipo === "normal") ?? cobro.pagos[0]
  if (pago?.tipo === "no_esperado") return "No esperado"
  if (pago?.tipo === "duplicado") return "Pago duplicado"
  if (pago) return `Pagado ${horaMexico(pago.datePaid)}`
  if (cobro.venceEn <= ahora || cobro.estado === "vencido") return `Venció ${horaMexico(cobro.venceEn)}`
  return `Vence ${horaMexico(cobro.venceEn)}`
}

export function pastillaIntento(cobro: CobroLeido, ahora: number): string {
  const pago = cobro.pagos.find((item) => item.tipo === "normal") ?? cobro.pagos[0]
  if (pago?.tipo === "no_esperado") return "No esperado"
  if (pago?.tipo === "duplicado" && !cobro.pagos.some((item) => item.tipo === "normal")) return "Pago duplicado"
  if (pago?.tipo === "normal" || cobro.estado === "pagado") return "Pagado"
  if (cobro.venceEn > ahora && cobro.estado !== "vencido") return "Cobrando"
  return "Pendiente"
}

export function pedidosDelDia(pedidos: PedidoLeido[], dia: string): PedidoLeido[] {
  return pedidos
    .filter((pedido) => {
      if (pedido.estado === "Pagado" && pedido.pagadoEn !== null) return fechaEnMexico(pedido.pagadoEn) === dia
      return fechaEnMexico(pedido.creadoEn) === dia
    })
    .sort((a, b) => (b.pagadoEn ?? b.creadoEn) - (a.pagadoEn ?? a.creadoEn))
}

export function resumenItems(pedido: PedidoLeido): string {
  if (pedido.tipo === "libre") return pedido.concepto?.trim() || "Cobro libre"
  const nombres = pedido.items.map((item) => item.nombre)
  if (nombres.length === 0) return "Sin productos"
  if (nombres.length <= 2) return nombres.join(", ")
  return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`
}

export function regresoEn(segundos: number): string {
  return `Regresando al catálogo en ${segundos} s`
}

export function motivoCoDi(motivo: "primera" | "tramite" | null): { ayuda: string; aviso: string | null; pastilla: string | null } {
  if (motivo === "tramite") {
    return { ayuda: TEXTO_CODI_TRAMITE, aviso: TEXTO_AVISO_TRAMITE, pastilla: "En revisión" }
  }
  if (motivo === "primera") {
    return { ayuda: TEXTO_CODI_PRIMERA, aviso: TEXTO_AVISO_PRIMERA, pastilla: "En revisión" }
  }
  return { ayuda: TEXTO_CODI_AYUDA, aviso: null, pastilla: TEXTO_SIN_COMISION }
}

export interface ChipCatalogo {
  id: string
  nombre: string
}

export function chipsVenta(categorias: ChipCatalogo[], haySinCategoria: boolean): ChipCatalogo[] {
  const chips = [...categorias]
  if (haySinCategoria) chips.push({ id: "sin", nombre: "Sin categoría" })
  return chips
}

export function chipsEdicion(categorias: ChipCatalogo[], haySinCategoria: boolean): ChipCatalogo[] {
  const chips: ChipCatalogo[] = [{ id: "todas", nombre: "Todas" }, ...categorias]
  if (haySinCategoria) chips.push({ id: "sin", nombre: "Sin categoría" })
  chips.push({ id: "nueva", nombre: "Nueva" })
  return chips
}

export function vistaTicket(lineas: LineaTicket[], hayProductos: boolean): {
  titulo: string
  piezas: string
  vacio: boolean
  mensaje: string
  apoyo: string
  total: number
  cobrar: string | null
  mostrarEditar: boolean
} {
  const cantidad = piezas(lineas)
  const total = totalLineas(lineas)
  const catalogoVacio = !hayProductos && cantidad === 0
  return {
    titulo: "Ticket actual",
    piezas: textoPiezas(cantidad),
    vacio: cantidad === 0,
    mensaje: catalogoVacio ? TEXTO_TICKET_SIN_CATALOGO : TEXTO_TICKET_LISTO,
    apoyo: catalogoVacio ? TEXTO_TICKET_COBRO_LIBRE : TEXTO_TICKET_TOCA,
    total,
    cobrar: cantidad > 0 ? etiquetaCobrar(total) : null,
    mostrarEditar: hayProductos,
  }
}

export function vistaCobrar(numero: number, cantidad: number, total: number, motivo: "primera" | "tramite" | null) {
  const codi = motivoCoDi(motivo)
  return {
    titulo: "Cobrar",
    subtitulo: `Ticket ${formatoNumero(numero)} · ${textoPiezas(cantidad)}`,
    totalEtiqueta: "Total a cobrar",
    total: pesosFijos(total),
    efectivo: "Efectivo",
    efectivoAyuda: TEXTO_EFECTIVO_AYUDA,
    codi: "CoDi",
    codiAyuda: codi.ayuda,
    codiPastilla: codi.pastilla,
    aviso: codi.aviso,
    codiHabilitado: motivo === null,
    dividir: false,
  }
}

export function filaConPagoNoEsperado(pedido: PedidoLeido): boolean {
  return pedido.cobros.some((cobro) => cobro.pagos.some((pago) => pago.tipo === "no_esperado"))
}
