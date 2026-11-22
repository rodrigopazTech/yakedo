import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  runTransaction,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from "firebase/storage"
import type { CobroLeido, EstadoPedido, MetodoPago, PagoLeido, PedidoLeido } from "./dominio.ts"

export interface CategoriaGuardada {
  id: string
  nombre: string
}

export interface ProductoGuardado {
  id: string
  nombre: string
  precioCentavos: number
  categoriaId: string | null
  agotadoEl: string | null
  tieneFoto: boolean
}

export interface ItemNuevo {
  productoId: string | null
  nombre: string
  precioCentavos: number
  cantidad: number
}

export type ResultadoEfectivo = "pagado" | "ya-pagado" | "cancelado" | "insuficiente"
export type ResultadoCancelar = "cancelado" | "cobro" | "cerrado"

function texto(valor: unknown, respaldo = ""): string {
  return typeof valor === "string" ? valor : respaldo
}

function entero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.trunc(valor) : 0
}

function millis(valor: unknown): number {
  if (typeof valor === "number") return valor
  if (valor && typeof valor === "object" && "toMillis" in valor && typeof (valor as { toMillis: () => number }).toMillis === "function") {
    return (valor as { toMillis: () => number }).toMillis()
  }
  return 0
}

function negocio(db: Firestore, uid: string) {
  return doc(db, "negocios", uid)
}

export async function leerCatalogo(db: Firestore, uid: string): Promise<{ categorias: CategoriaGuardada[]; productos: ProductoGuardado[] }> {
  const raiz = negocio(db, uid)
  const [categoriasSnap, productosSnap] = await Promise.all([
    getDocs(collection(raiz, "categorias")),
    getDocs(collection(raiz, "productos")),
  ])
  const categorias = categoriasSnap.docs
    .map((item) => ({ id: item.id, nombre: texto(item.data().nombre) }))
    .filter((item) => item.nombre.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  const productos = productosSnap.docs
    .map((item) => {
      const datos = item.data()
      return {
        id: item.id,
        nombre: texto(datos.nombre),
        precioCentavos: entero(datos.precioCentavos),
        categoriaId: typeof datos.categoriaId === "string" ? datos.categoriaId : null,
        agotadoEl: typeof datos.agotadoEl === "string" ? datos.agotadoEl : null,
        tieneFoto: datos.tieneFoto === true,
      }
    })
    .filter((item) => item.nombre.length > 0 && item.precioCentavos > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return { categorias, productos }
}

export async function crearCategoria(db: Firestore, uid: string, nombre: string): Promise<string> {
  const referencia = doc(collection(negocio(db, uid), "categorias"))
  await runTransaction(db, async (tx) => {
    tx.set(referencia, { nombre: nombre.trim() })
  })
  return referencia.id
}

export async function renombrarCategoria(db: Firestore, uid: string, id: string, nombre: string): Promise<void> {
  await updateDoc(doc(negocio(db, uid), "categorias", id), { nombre: nombre.trim() })
}

export async function borrarCategoria(db: Firestore, uid: string, id: string): Promise<void> {
  const raiz = negocio(db, uid)
  const productos = await getDocs(collection(raiz, "productos"))
  const lote = writeBatch(db)
  for (const producto of productos.docs) {
    if (producto.data().categoriaId === id) lote.update(producto.ref, { categoriaId: null })
  }
  lote.delete(doc(raiz, "categorias", id))
  await lote.commit()
}

export interface DatosProducto {
  nombre: string
  precioCentavos: number
  categoriaId: string | null
  agotadoEl: string | null
  tieneFoto: boolean
}

function cuerpoProducto(datos: DatosProducto) {
  return {
    nombre: datos.nombre.trim(),
    precioCentavos: datos.precioCentavos,
    categoriaId: datos.categoriaId,
    agotadoEl: datos.agotadoEl,
    tieneFoto: datos.tieneFoto,
  }
}

export async function crearProducto(db: Firestore, uid: string, datos: DatosProducto): Promise<string> {
  const referencia = doc(collection(negocio(db, uid), "productos"))
  await runTransaction(db, async (tx) => {
    tx.set(referencia, cuerpoProducto(datos))
  })
  return referencia.id
}

export async function guardarProducto(db: Firestore, uid: string, id: string, datos: DatosProducto): Promise<void> {
  await updateDoc(doc(negocio(db, uid), "productos", id), cuerpoProducto(datos))
}

export async function quitarProducto(db: Firestore, uid: string, id: string): Promise<void> {
  await deleteDoc(doc(negocio(db, uid), "productos", id))
}

export function rutaFoto(uid: string, productoId: string): string {
  return `negocios/${uid}/productos/${productoId}/foto`
}

export async function subirFoto(storage: FirebaseStorage, uid: string, productoId: string, archivo: Blob): Promise<string> {
  const ruta = ref(storage, rutaFoto(uid, productoId))
  await uploadBytes(ruta, archivo, { contentType: archivo.type || "image/jpeg" })
  return getDownloadURL(ruta)
}

export async function leerFoto(storage: FirebaseStorage, uid: string, productoId: string): Promise<string | null> {
  try {
    return await getDownloadURL(ref(storage, rutaFoto(uid, productoId)))
  } catch {
    return null
  }
}

export async function crearPedido(db: Firestore, uid: string, items: ItemNuevo[]): Promise<{ id: string; numero: number }> {
  const total = items.reduce((suma, item) => suma + item.precioCentavos * item.cantidad, 0)
  const contador = doc(negocio(db, uid), "contadores", "pedidos")
  const pedido = doc(collection(negocio(db, uid), "pedidos"))
  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(contador)
    const siguiente = (snap.exists() ? entero(snap.data().valor) : 0) + 1
    tx.set(contador, { valor: siguiente })
    tx.set(pedido, {
      numero: siguiente,
      tipo: "venta",
      concepto: null,
      items: items.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        precioCentavos: item.precioCentavos,
        cantidad: item.cantidad,
      })),
      total,
      estado: "Pendiente",
      creadoEn: Timestamp.now(),
      pagadoEn: null,
      canceladoEn: null,
      metodo: null,
      efectivo: null,
      cobroActivoId: null,
    })
    return siguiente
  })
  return { id: pedido.id, numero }
}

export async function cobrarEfectivo(db: Firestore, uid: string, pedidoId: string, recibido: number): Promise<ResultadoEfectivo> {
  const referencia = doc(negocio(db, uid), "pedidos", pedidoId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(referencia)
    if (!snap.exists()) return "cancelado"
    const datos = snap.data()
    if (datos.estado === "Pagado") return "ya-pagado"
    if (datos.estado === "Cancelado") return "cancelado"
    const total = entero(datos.total)
    if (recibido < total) return "insuficiente"
    tx.update(referencia, {
      estado: "Pagado",
      metodo: "efectivo",
      pagadoEn: Timestamp.now(),
      efectivo: { recibido, cambio: recibido - total },
    })
    return "pagado"
  })
}

export async function cancelarPedido(db: Firestore, uid: string, pedidoId: string): Promise<ResultadoCancelar> {
  const referencia = doc(negocio(db, uid), "pedidos", pedidoId)
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(referencia)
      if (!snap.exists()) return "cerrado"
      const datos = snap.data()
      if (datos.estado !== "Pendiente") return "cerrado"
      if (typeof datos.cobroActivoId === "string" && datos.cobroActivoId.length > 0) {
        const cobro = await tx.get(doc(referencia, "cobros", datos.cobroActivoId))
        const vence = cobro.exists() ? millis(cobro.data().venceEn) : Number.POSITIVE_INFINITY
        if (vence > Date.now()) return "cobro"
      }
      tx.update(referencia, { estado: "Cancelado", canceladoEn: Timestamp.now() })
      return "cancelado"
    })
  } catch {
    return "cobro"
  }
}

function leerPago(id: string, datos: Record<string, unknown>): PagoLeido {
  const tipo = datos.tipo
  return {
    id,
    tipo: tipo === "duplicado" || tipo === "no_esperado" || tipo === "normal" ? tipo : "normal",
    monto: entero(datos.monto),
    datePaid: millis(datos.datePaid),
    transactionId: typeof datos.transactionId === "string" ? datos.transactionId : null,
  }
}

function estadoCobro(valor: unknown): CobroLeido["estado"] {
  return valor === "pagado" || valor === "vencido" || valor === "activo" ? valor : "activo"
}

function estadoPedido(valor: unknown): EstadoPedido {
  return valor === "Pagado" || valor === "Cancelado" || valor === "Pendiente" ? valor : "Pendiente"
}

function metodo(valor: unknown): MetodoPago | null {
  return valor === "efectivo" || valor === "codi" ? valor : null
}

export async function leerPedidos(db: Firestore, uid: string): Promise<PedidoLeido[]> {
  const snap = await getDocs(collection(negocio(db, uid), "pedidos"))
  const pedidos = await Promise.all(
    snap.docs.map(async (item) => {
      const datos = item.data()
      const cobrosSnap = await getDocs(collection(item.ref, "cobros"))
      const cobros: CobroLeido[] = await Promise.all(
        cobrosSnap.docs.map(async (cobro) => {
          const pagosSnap = await getDocs(collection(cobro.ref, "pagos"))
          const pagos: PagoLeido[] = pagosSnap.docs.map((pago) => leerPago(pago.id, pago.data()))
          const cuerpo = cobro.data()
          return {
            id: cobro.id,
            creadoEn: millis(cuerpo.creadoEn),
            venceEn: millis(cuerpo.venceEn),
            estado: estadoCobro(cuerpo.estado),
            pagos,
            qrString: typeof cuerpo.qrString === "string" ? cuerpo.qrString : null,
            codiQrId: typeof cuerpo.codiQrId === "string" ? cuerpo.codiQrId : null,
          }
        }),
      )
      const items = Array.isArray(datos.items)
        ? datos.items.map((linea: Record<string, unknown>) => ({
            productoId: typeof linea.productoId === "string" ? linea.productoId : null,
            nombre: texto(linea.nombre),
            precioCentavos: entero(linea.precioCentavos),
            cantidad: Math.max(1, entero(linea.cantidad)),
          }))
        : []
      const efectivo = datos.efectivo
      const efectivoLeido =
        efectivo && typeof efectivo === "object"
          ? { recibido: entero((efectivo as { recibido?: unknown }).recibido), cambio: entero((efectivo as { cambio?: unknown }).cambio) }
          : null
      return {
        id: item.id,
        numero: entero(datos.numero),
        tipo: datos.tipo === "libre" ? "libre" : "venta",
        concepto: typeof datos.concepto === "string" ? datos.concepto : null,
        items,
        total: entero(datos.total),
        estado: estadoPedido(datos.estado),
        creadoEn: millis(datos.creadoEn),
        pagadoEn: datos.pagadoEn ? millis(datos.pagadoEn) : null,
        canceladoEn: datos.canceladoEn ? millis(datos.canceladoEn) : null,
        metodo: metodo(datos.metodo),
        efectivo: efectivoLeido,
        cobroActivoId: typeof datos.cobroActivoId === "string" ? datos.cobroActivoId : null,
        cobros,
      } satisfies PedidoLeido
    }),
  )
  return pedidos.sort((a, b) => b.numero - a.numero)
}
