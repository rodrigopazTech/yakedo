import { useEffect, useMemo, useRef, useState } from "react"
import { doc, getDoc, onSnapshot, type Firestore } from "firebase/firestore"
import { httpsCallable, type Functions } from "firebase/functions"
import type { FirebaseStorage } from "firebase/storage"
import { LISTA_INICIAL, listaDe, type ListaBancos } from "../cobro/bancos.ts"
import {
  DialogoAyuda,
  DialogoDuplicado,
  DialogoEfectivoActivo,
  DialogoFalloQr,
  DialogoNoEsperado,
  HojaBancos,
  HojaTicket,
  PantallaQr,
  PantallaVencido,
} from "../cobro/pantallas.tsx"
import { debeEscuchar, desfaseReloj, restanteCobro } from "../cobro/reloj.ts"
import { primerAviso } from "../cobro/vistas.ts"
import logo from "../acceso/activos/logo-yakedo.svg"
import iconoRegresar from "../acceso/activos/icono-regresar.svg"
import {
  agregarProducto,
  ATAJOS_EFECTIVO,
  cambiarCantidad,
  cambioEfectivo,
  chipsEdicion,
  chipsVenta,
  centavosDeTeclado,
  encabezadoDia,
  estaAgotado,
  datosCobroLibre,
  etiquetaConfirmarEfectivo,
  etiquetaIntento,
  etiquetaLibre,
  pastillaIntento,
  diaChip,
  fechaBarra,
  fechaEnMexico,
  filaConPagoNoEsperado,
  formatoNumero,
  horaCompleta,
  horaMexico,
  iniciales,
  limitarNombre,
  notaPagoOtroDia,
  notaPorDevolver,
  pedidosDelDia,
  pesos,
  pesosFijos,
  piezas,
  puedeCancelar,
  recibidoDeAtajo,
  regresoEn,
  resumenItems,
  textoBloqueoCancelar,
  textoBorrarCategoria,
  textoCancelar,
  textoEstado,
  textoQuitarProducto,
  textoRegresoLibre,
  totalesDelDia,
  vistaCobrar,
  vistaCobroLibre,
  vistaProducto,
  vistaTicket,
  escribirEfectivo,
  escribirPrecio,
  TEXTO_AGOTADO,
  TEXTO_AGOTADO_AYUDA,
  TEXTO_AGREGAR,
  TEXTO_ARMA,
  TEXTO_ARMA_APOYO,
  TEXTO_CANCELAR_APOYO,
  TEXTO_CATEGORIA_APOYO,
  TEXTO_CONFIRMAR_HISTORIAL,
  TEXTO_CREAR_CATEGORIA,
  TEXTO_DETALLE_COBRO,
  TEXTO_EJEMPLO_CATEGORIA,
  TEXTO_ENTENDIDO,
  TEXTO_FOTO,
  TEXTO_FOTO_AYUDA,
  TEXTO_FOTO_TITULO,
  TEXTO_FOTO_TOMA,
  TEXTO_GALERIA,
  TEXTO_GUARDAR_NOMBRE,
  TEXTO_INTERNET,
  TEXTO_INTERNET_APOYO,
  TEXTO_MISMO_QR,
  TEXTO_NUEVA_VENTA,
  TEXTO_OTRO_METODO,
  TEXTO_PENDIENTES_APOYO,
  TEXTO_QUITAR,
  TEXTO_RENOMBRAR_APOYO,
  TEXTO_REVISION,
  TEXTO_SI_BORRAR,
  TEXTO_SI_CANCELAR,
  TEXTO_SI_QUITAR,
  TEXTO_TICKETS_VIEJOS,
  TEXTO_TOMAR,
  TEXTO_VOLVER,
  TEXTO_YA_PAGADO,
  TEXTO_YA_QUEDO,
  type LineaTicket,
  type PedidoLeido,
} from "./dominio.ts"
import { Icono } from "./iconos.tsx"
import {
  borrarCategoria,
  cancelarPedido,
  cobrarEfectivo,
  crearCategoria,
  crearPedido,
  crearPedidoLibre,
  crearProducto,
  guardarProducto,
  leerCatalogo,
  leerFoto,
  leerPedidos,
  quitarProducto,
  renombrarCategoria,
  subirFoto,
  type CategoriaGuardada,
  type ProductoGuardado,
} from "./repositorio.ts"

type Motivo = "primera" | "tramite" | null
type Vista = "venta" | "editar" | "producto" | "cobrar" | "efectivo" | "yaquedo" | "historial" | "qr" | "vencido" | "libre"

interface CobroPantalla {
  pedidoId: string
  cobroId: string
  qrString: string
  creadoEn: number
  venceEn: number
  desfase: number
  mismo: boolean
  otro: boolean
}

interface AvisoPago {
  clase: "duplicado" | "no_esperado"
  numero: number
  monto: number
  pedidoId: string
  id: string
}

const CLAVE_RELOJ = "yakedo-reloj"

function guardarDesfase(cobroId: string, desfase: number) {
  try {
    const mapa = JSON.parse(sessionStorage.getItem(CLAVE_RELOJ) || "{}") as Record<string, number>
    mapa[cobroId] = desfase
    sessionStorage.setItem(CLAVE_RELOJ, JSON.stringify(mapa))
  } catch {
    // El reloj sigue en memoria si el navegador bloquea la sesión.
  }
}

function leerDesfase(cobroId: string): number {
  try {
    const mapa = JSON.parse(sessionStorage.getItem(CLAVE_RELOJ) || "{}") as Record<string, number>
    return typeof mapa[cobroId] === "number" ? mapa[cobroId] : 0
  } catch {
    return 0
  }
}

interface Forma {
  id: string | null
  nombre: string
  precioTexto: string
  categoriaId: string | null
  agotado: boolean
  tieneFoto: boolean
  archivo: File | null
  vistaLocal: string | null
  intento: boolean
  guardando: boolean
  teclado: boolean
}

function formaVacia(categoriaId: string | null): Forma {
  return {
    id: null,
    nombre: "",
    precioTexto: "",
    categoriaId,
    agotado: false,
    tieneFoto: false,
    archivo: null,
    vistaLocal: null,
    intento: false,
    guardando: false,
    teclado: false,
  }
}

function enLinea(): boolean {
  return typeof navigator === "undefined" || navigator.onLine
}

export function Nucleo({
  uid,
  nombre,
  db,
  storage,
  functions,
  motivo,
  avisoRevision,
  pedirEdicion,
  alEdicionAbierta,
  alAjustes,
  alEstado,
}: {
  uid: string
  nombre: string
  db: Firestore
  storage: FirebaseStorage
  functions: Functions
  motivo: Motivo
  avisoRevision: boolean
  pedirEdicion: boolean
  alEdicionAbierta: () => void
  alAjustes: () => void
  alEstado: () => void
}) {
  const [vista, setVista] = useState<Vista>("venta")
  const [categorias, setCategorias] = useState<CategoriaGuardada[]>([])
  const [productos, setProductos] = useState<ProductoGuardado[]>([])
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [lineas, setLineas] = useState<LineaTicket[]>([])
  const [libreTexto, setLibreTexto] = useState("")
  const [libreConcepto, setLibreConcepto] = useState("")
  const [avisoLibre, setAvisoLibre] = useState<string | null>(null)
  const cobroMeta = useRef<{ tipo: "venta" | "libre"; apartados: number }>({ tipo: "venta", apartados: 0 })
  const [pedidos, setPedidos] = useState<PedidoLeido[]>([])
  const [categoriaVenta, setCategoriaVenta] = useState<string | null>(null)
  const [categoriaEdicion, setCategoriaEdicion] = useState("todas")
  const [forma, setForma] = useState<Forma | null>(null)
  const [pedidoCobro, setPedidoCobro] = useState<PedidoLeido | null>(null)
  const [recibido, setRecibido] = useState(0)
  const [teclas, setTeclas] = useState("")
  const [panel, setPanel] = useState(false)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [dia, setDia] = useState(() => fechaEnMexico(Date.now()))
  const [segundos, setSegundos] = useState(5)
  const [internet, setInternet] = useState(false)
  const [yaPagado, setYaPagado] = useState(false)
  const [dialogoCategoria, setDialogoCategoria] = useState<{ modo: "nueva" | "renombrar"; id: string | null; nombre: string; intento: boolean } | null>(null)
  const [dialogoBorrar, setDialogoBorrar] = useState<{ id: string; nombre: string; productos: number } | null>(null)
  const [dialogoQuitar, setDialogoQuitar] = useState<{ id: string; nombre: string } | null>(null)
  const [dialogoCancelar, setDialogoCancelar] = useState<PedidoLeido | null>(null)
  const [retomar, setRetomar] = useState<PedidoLeido | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cobroUi, setCobroUi] = useState<CobroPantalla | null>(null)
  const [restante, setRestante] = useState(0)
  const [hojaBancos, setHojaBancos] = useState(false)
  const [listaBancos, setListaBancos] = useState<ListaBancos>(LISTA_INICIAL)
  const [ayudaBanco, setAyudaBanco] = useState(false)
  const [avisoEfectivo, setAvisoEfectivo] = useState(false)
  const [queEs, setQueEs] = useState(false)
  const [verTicket, setVerTicket] = useState(false)
  const [falloQr, setFalloQr] = useState(false)
  const [avisoPago, setAvisoPago] = useState<AvisoPago | null>(null)
  const vistos = useRef(new Set<string>())
  const consultado = useRef<string | null>(null)
  const crearQr = useMemo(() => httpsCallable(functions, "crearCobroQr"), [functions])
  const vencerQr = useMemo(() => httpsCallable(functions, "vencerCobro"), [functions])
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const ahora = Date.now()

  async function recargarCatalogo() {
    const datos = await leerCatalogo(db, uid)
    setCategorias(datos.categorias)
    setProductos(datos.productos)
    const siguientes: Record<string, string> = {}
    await Promise.all(
      datos.productos.filter((producto) => producto.tieneFoto).map(async (producto) => {
        const url = await leerFoto(storage, uid, producto.id)
        if (url) siguientes[producto.id] = url
      }),
    )
    setFotos(siguientes)
  }

  async function recargarPedidos() {
    const lista = await leerPedidos(db, uid)
    setPedidos(lista)
    const aviso = primerAviso(lista, vistos.current)
    if (aviso && !avisoPago) setAvisoPago(aviso)
  }

  async function cargarBancos() {
    try {
      const snap = await getDoc(doc(db, "config", "bancosCodi"))
      if (snap.exists()) setListaBancos(listaDe(snap.data()))
    } catch {
      setListaBancos(LISTA_INICIAL)
    }
  }

  useEffect(() => {
    void recargarCatalogo()
    void recargarPedidos()
    const alCaer = () => setInternet(true)
    window.addEventListener("offline", alCaer)
    return () => window.removeEventListener("offline", alCaer)
    // La carga inicial baja el catálogo al abrir la venta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  useEffect(() => {
    if (!pedirEdicion) return
    setVista("editar")
    alEdicionAbierta()
  }, [pedirEdicion, alEdicionAbierta])

  useEffect(() => {
    if (vista !== "yaquedo") return
    setSegundos(5)
    const id = window.setInterval(() => {
      setSegundos((valor) => (valor <= 1 ? 0 : valor - 1))
    }, 1000)
    const cierre = window.setTimeout(() => setVista("venta"), 5000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(cierre)
    }
  }, [vista, pedidoCobro?.id])

  useEffect(() => {
    if (!cobroUi || vista !== "qr") return
    const tick = () => {
      const queda = restanteCobro(cobroUi.venceEn, Date.now(), cobroUi.desfase)
      setRestante(queda)
      if (queda <= 0) setVista("vencido")
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [cobroUi, vista])

  useEffect(() => {
    if (!cobroUi || !debeEscuchar(vista, restanteCobro(cobroUi.venceEn, Date.now(), cobroUi.desfase))) return
    const referencia = doc(db, "negocios", uid, "pedidos", cobroUi.pedidoId, "cobros", cobroUi.cobroId)
    return onSnapshot(referencia, (snap) => {
      if (snap.get("estado") !== "pagado") return
      anotarLibreListo()
      setPedidoCobro((actual) => (actual ? { ...actual, estado: "Pagado", metodo: "codi", pagadoEn: Date.now() } : actual))
      setVista("yaquedo")
    })
  }, [cobroUi, vista, db, uid])

  useEffect(() => {
    if (vista !== "vencido" || !cobroUi || consultado.current === cobroUi.cobroId) return
    consultado.current = cobroUi.cobroId
    void vencerQr({ pedidoId: cobroUi.pedidoId, cobroId: cobroUi.cobroId })
      .then((resultado) => {
        const datos = resultado.data as { estado?: string }
        if (datos.estado === "pagado") {
          anotarLibreListo()
          setPedidoCobro((actual) => (actual ? { ...actual, estado: "Pagado", metodo: "codi", pagadoEn: Date.now() } : actual))
          setVista("yaquedo")
        } else if ((datos.estado === "duplicado" || datos.estado === "no-esperado") && pedidoCobro) {
          setAvisoPago({
            clase: datos.estado === "duplicado" ? "duplicado" : "no_esperado",
            numero: pedidoCobro.numero,
            monto: pedidoCobro.total,
            pedidoId: pedidoCobro.id,
            id: `respaldo_${cobroUi.cobroId}`,
          })
        }
        void recargarPedidos()
      })
      .catch(() => undefined)
    // La consulta de respaldo corre una vez por cobro, cuando el reloj llega a cero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, cobroUi])

  function exigirLinea(): boolean {
    if (enLinea()) return true
    setInternet(true)
    return false
  }

  const pendientes = pedidos.filter((pedido) => pedido.estado === "Pendiente")
  const ticket = vistaTicket(lineas, productos.length > 0)
  const chips = chipsVenta(
    categorias,
    productos.some((producto) => producto.categoriaId === null),
  )
  const chipActivo = chips.some((chip) => chip.id === categoriaVenta) ? categoriaVenta : (chips[0]?.id ?? null)
  const enVenta = productos.filter((producto) => (chipActivo === "sin" || chipActivo === null ? producto.categoriaId === null : producto.categoriaId === chipActivo))
  const chipsEditor = chipsEdicion(
    categorias,
    productos.some((producto) => producto.categoriaId === null),
  )
  const productosEditor = productos.filter((producto) => {
    if (categoriaEdicion === "todas") return true
    if (categoriaEdicion === "sin") return producto.categoriaId === null
    return producto.categoriaId === categoriaEdicion
  })
  const categoriaEditor = categorias.find((categoria) => categoria.id === categoriaEdicion) ?? null
  const cantidadEditor = productos.filter((producto) => (categoriaEditor ? producto.categoriaId === categoriaEditor.id : producto.categoriaId === null)).length

  function tocarProducto(producto: ProductoGuardado) {
    if (estaAgotado(producto.agotadoEl, Date.now())) return
    setLineas((actuales) => agregarProducto(actuales, { id: producto.id, nombre: producto.nombre, precioCentavos: producto.precioCentavos }, false))
  }

  async function cobrar() {
    if (!exigirLinea() || lineas.length === 0) return
    setError(null)
    try {
      cobroMeta.current = { tipo: "venta", apartados: 0 }
      const creado = await crearPedido(db, uid, lineas.map((linea) => ({ ...linea })))
      const pedido: PedidoLeido = {
        id: creado.id,
        numero: creado.numero,
        tipo: "venta",
        concepto: null,
        items: lineas.map((linea) => ({ ...linea, productoId: linea.productoId })),
        total: lineas.reduce((suma, linea) => suma + linea.precioCentavos * linea.cantidad, 0),
        estado: "Pendiente",
        creadoEn: Date.now(),
        pagadoEn: null,
        canceladoEn: null,
        metodo: null,
        efectivo: null,
        cobroActivoId: null,
        cobros: [],
      }
      setPedidoCobro(pedido)
      setLineas([])
      setVista("cobrar")
      void recargarPedidos()
    } catch {
      // UI PROVISIONAL: falta en Figma el fallo al crear el pedido.
      setError("No se pudo crear el pedido.")
    }
  }

  function abrirCobro(pedido: PedidoLeido) {
    cobroMeta.current = pedido.tipo === "libre" ? { tipo: "libre", apartados: piezas(lineas) } : { tipo: "venta", apartados: 0 }
    if (pedido.cobroActivoId && pedido.cobros.some((cobro) => cobro.id === pedido.cobroActivoId && cobro.venceEn > Date.now())) {
      setRetomar(pedido)
      return
    }
    setPedidoCobro(pedido)
    setPanel(false)
    setVista("cobrar")
  }

  async function confirmarEfectivo() {
    if (!pedidoCobro || !exigirLinea()) return
    const resultado = await cobrarEfectivo(db, uid, pedidoCobro.id, recibido)
    if (resultado === "ya-pagado") {
      setYaPagado(true)
      return
    }
    if (resultado !== "pagado") return
    anotarLibreListo()
    setPedidoCobro({
      ...pedidoCobro,
      estado: "Pagado",
      metodo: "efectivo",
      pagadoEn: Date.now(),
      efectivo: { recibido, cambio: recibido - pedidoCobro.total },
    })
    setVista("yaquedo")
    void recargarPedidos()
  }

  function anotarLibreListo() {
    if (cobroMeta.current.tipo === "libre" && cobroMeta.current.apartados > 0) {
      setAvisoLibre(textoRegresoLibre(cobroMeta.current.apartados))
    }
  }

  function abrirLibre() {
    setLibreTexto("")
    setLibreConcepto("")
    setAvisoLibre(null)
    setVista("libre")
  }

  async function confirmarLibre() {
    const datos = datosCobroLibre(libreTexto, libreConcepto)
    if (!datos || !exigirLinea()) return
    cobroMeta.current = { tipo: "libre", apartados: piezas(lineas) }
    try {
      const creado = await crearPedidoLibre(db, uid, datos.total, datos.concepto)
      if (!creado) return
      const pedido: PedidoLeido = {
        id: creado.id,
        numero: creado.numero,
        tipo: "libre",
        concepto: datos.concepto,
        items: [],
        total: datos.total,
        estado: "Pendiente",
        creadoEn: Date.now(),
        pagadoEn: null,
        canceladoEn: null,
        metodo: null,
        efectivo: null,
        cobroActivoId: null,
        cobros: [],
      }
      setPedidoCobro(pedido)
      setVista("cobrar")
      void recargarPedidos()
    } catch {
      // UI PROVISIONAL: falta en Figma el fallo al crear el cobro libre.
      setError("No se pudo crear el cobro libre.")
    }
  }

  function quedaQr(): number {
    if (!cobroUi) return 0
    return restanteCobro(cobroUi.venceEn, Date.now(), cobroUi.desfase)
  }

  function irAEfectivo() {
    if (quedaQr() > 0) {
      setAvisoEfectivo(true)
      setHojaBancos(false)
      setAyudaBanco(false)
      setQueEs(false)
      return
    }
    setRecibido(0)
    setTeclas("")
    setHojaBancos(false)
    setAyudaBanco(false)
    setFalloQr(false)
    setVista("efectivo")
  }

  function mostrarMismo(pedido: PedidoLeido) {
    const cobro = pedido.cobros.find((item) => item.id === pedido.cobroActivoId)
    if (!cobro?.qrString) return
    setCobroUi({
      pedidoId: pedido.id,
      cobroId: cobro.id,
      qrString: cobro.qrString,
      creadoEn: cobro.creadoEn,
      venceEn: cobro.venceEn,
      desfase: leerDesfase(cobro.id),
      mismo: true,
      otro: false,
    })
    setPedidoCobro(pedido)
    setRetomar(null)
    setPanel(false)
    setVista("qr")
  }

  async function elegirCodi() {
    if (!pedidoCobro || !exigirLinea() || motivo !== null) return
    setFalloQr(false)
    try {
      const resultado = await crearQr({ pedidoId: pedidoCobro.id })
      const datos = resultado.data as {
        cobroId: string
        qrString: string
        creadoEn: number
        venceEn: number
        horaServidor: number
        otroCobro: boolean
      }
      const aparato = Date.now()
      const desfase = desfaseReloj(datos.horaServidor, aparato)
      guardarDesfase(datos.cobroId, desfase)
      consultado.current = null
      setCobroUi({
        pedidoId: pedidoCobro.id,
        cobroId: datos.cobroId,
        qrString: datos.qrString,
        creadoEn: datos.creadoEn,
        venceEn: datos.venceEn,
        desfase,
        mismo: false,
        otro: datos.otroCobro,
      })
      setPedidoCobro({ ...pedidoCobro, cobroActivoId: datos.cobroId })
      setVista("qr")
      void recargarPedidos()
    } catch {
      setFalloQr(true)
    }
  }

  async function confirmarCancelar() {
    if (!dialogoCancelar || !exigirLinea()) return
    const resultado = await cancelarPedido(db, uid, dialogoCancelar.id)
    setDialogoCancelar(null)
    if (resultado === "cancelado") void recargarPedidos()
  }

  async function guardarForma() {
    if (!forma) return
    const vistaForma = vistaProducto({
      nombre: forma.nombre,
      precioCentavos: centavosDeTeclado(forma.precioTexto),
      intento: true,
      guardando: false,
      editando: forma.id !== null,
    })
    setForma({ ...forma, intento: true })
    if (!vistaForma.puedeGuardar || !exigirLinea()) return
    setForma({ ...forma, intento: true, guardando: true })
    const datos = {
      nombre: forma.nombre.trim(),
      precioCentavos: centavosDeTeclado(forma.precioTexto),
      categoriaId: forma.categoriaId,
      agotadoEl: forma.id && forma.agotado ? fechaEnMexico(Date.now()) : null,
      tieneFoto: forma.tieneFoto || Boolean(forma.archivo),
    }
    try {
      const id = forma.id ?? (await crearProducto(db, uid, { ...datos, tieneFoto: false }))
      if (forma.archivo) await subirFoto(storage, uid, id, forma.archivo)
      await guardarProducto(db, uid, id, { ...datos, tieneFoto: datos.tieneFoto })
      await recargarCatalogo()
      setForma(null)
      setVista("editar")
    } catch {
      setForma({ ...forma, guardando: false, intento: true })
      // UI PROVISIONAL: falta en Figma el fallo al guardar el producto.
      setError("No se pudo guardar el producto.")
    }
  }

  const cobrarVista = pedidoCobro
    ? vistaCobrar(
        pedidoCobro.numero,
        piezas(pedidoCobro.items),
        pedidoCobro.total,
        motivo,
        pedidoCobro.tipo === "libre" ? { concepto: pedidoCobro.concepto } : null,
      )
    : null
  const vistaLibre = vistaCobroLibre({ texto: libreTexto, concepto: libreConcepto, productosGuardados: piezas(lineas) })
  const cambio = pedidoCobro ? cambioEfectivo(pedidoCobro.total, recibido) : null
  const listaDia = pedidosDelDia(pedidos, dia)
  const totales = totalesDelDia(pedidos, dia)
  const detalle = pedidos.find((pedido) => pedido.id === detalleId) ?? listaDia[0] ?? null
  const formaVista = forma
    ? vistaProducto({
        nombre: forma.nombre,
        precioCentavos: centavosDeTeclado(forma.precioTexto),
        intento: forma.intento,
        guardando: forma.guardando,
        editando: forma.id !== null,
      })
    : null

  return (
    <div className="n-app">
      {vista === "venta" ? (
        <div className="n-venta">
          <section className="n-catalogo">
            <header className="n-barra">
              <img className="n-logo" src={logo} alt="yakedo" width={117} height={32} />
              <div className="n-negocio">
                <strong>{nombre}</strong>
                <span>{fechaBarra(ahora)}</span>
              </div>
              {pendientes.length > 0 ? (
                <button className="n-pendientes" type="button" onClick={() => { setPanel(true); void recargarPedidos() }}>
                  <Icono nombre="reloj" />
                  Pendientes
                  <em>{pendientes.length}</em>
                </button>
              ) : null}
              {/* UI PROVISIONAL: falta en Figma la pantalla de Buscar; el botón de la barra no abre otra vista. */}
              <button className="n-icono" type="button" aria-label="Buscar">
                <Icono nombre="buscar" />
              </button>
              <button className="n-historial" type="button" onClick={() => { setVista("historial"); setDia(fechaEnMexico(Date.now())); void recargarPedidos() }}>
                <Icono nombre="historial" />
                Historial
              </button>
              <button className="n-icono" type="button" aria-label="Ajustes" onClick={alAjustes}>
                <Icono nombre="ajustes" tamano={24} />
              </button>
            </header>
            {avisoRevision ? (
              <button className="n-banner" type="button" onClick={alEstado}>
                <Icono nombre="reloj" tamano={20} />
                <span>{TEXTO_REVISION}</span>
                <strong>Ver estado</strong>
              </button>
            ) : null}
            {productos.length === 0 ? (
              <div className="n-vacio-catalogo">
                <span className="n-vacio-icono"><Icono nombre="tienda" tamano={36} /></span>
                <h2>{TEXTO_ARMA}</h2>
                <p>{TEXTO_ARMA_APOYO}</p>
                <button className="boton-principal" type="button" onClick={() => { setForma(formaVacia(null)); setVista("producto") }}>
                  {TEXTO_AGREGAR}
                </button>
              </div>
            ) : (
              <>
                <div className="n-chips">
                  {chips.map((chip) => (
                    <button key={chip.id} className={chip.id === chipActivo ? "n-chip n-chip-activa" : "n-chip"} type="button" onClick={() => setCategoriaVenta(chip.id)}>
                      <span>{iniciales(chip.nombre)}</span>
                      {chip.nombre}
                    </button>
                  ))}
                  <button className="n-chip" type="button" onClick={() => setVista("editar")}>
                    <span><Icono nombre="lapiz" /></span>
                    Editar
                  </button>
                </div>
                <div className="n-grid">
                  {enVenta.map((producto) => {
                    const cantidad = lineas.find((linea) => linea.productoId === producto.id)?.cantidad ?? 0
                    const agotado = estaAgotado(producto.agotadoEl, ahora)
                    return (
                      <button
                        key={producto.id}
                        className={agotado ? "n-tarjeta n-tarjeta-agotada" : cantidad > 0 ? "n-tarjeta n-tarjeta-en" : "n-tarjeta"}
                        type="button"
                        disabled={agotado}
                        onClick={() => tocarProducto(producto)}
                      >
                        <Foto nombre={producto.nombre} url={fotos[producto.id] ?? null} />
                        {cantidad > 0 ? <em className="n-badge">{cantidad}</em> : null}
                        {agotado ? <em className="n-pastilla">{TEXTO_AGOTADO}</em> : null}
                        <strong>{producto.nombre}</strong>
                        <span>{pesos(producto.precioCentavos)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>
          <Ticket
            lineas={lineas}
            ticket={ticket}
            fotos={fotos}
            avisoLibre={avisoLibre}
            alVaciar={() => { setLineas([]); setAvisoLibre(null) }}
            alCantidad={(id, delta) => setLineas((actuales) => cambiarCantidad(actuales, id, delta))}
            alCobrar={() => void cobrar()}
            alLibre={abrirLibre}
          />
          {panel ? (
            <div className="n-velo">
              <aside className="n-panel" aria-label="Pendientes">
                <header>
                  <div>
                    <h2>Pendientes ({pendientes.length})</h2>
                    <p>{TEXTO_PENDIENTES_APOYO}</p>
                  </div>
                  <button type="button" aria-label="Cerrar" onClick={() => setPanel(false)}><Icono nombre="cerrar" /></button>
                </header>
                {pendientes.map((pedido) => {
                  const bloqueo = textoBloqueoCancelar(pedido, Date.now())
                  return (
                    <article key={pedido.id}>
                      <p>{horaMexico(pedido.creadoEn)} · {formatoNumero(pedido.numero)}</p>
                      <ul>
                        {pedido.tipo === "libre" ? (
                          <li>{etiquetaLibre(pedido.concepto)}</li>
                        ) : (
                          pedido.items.map((item) => (
                            <li key={`${pedido.id}-${item.nombre}`}>{item.cantidad}× {item.nombre}</li>
                          ))
                        )}
                      </ul>
                      <strong>{textoEstado(pedido, Date.now())}</strong>
                      <div>
                        <button type="button" disabled={!puedeCancelar(pedido, Date.now())} onClick={() => setDialogoCancelar(pedido)}>Cancelar pedido</button>
                        <button className="boton-principal" type="button" onClick={() => abrirCobro(pedido)}>Cobrar</button>
                      </div>
                      {bloqueo ? <small>{bloqueo}</small> : null}
                    </article>
                  )
                })}
              </aside>
            </div>
          ) : null}
        </div>
      ) : null}

      {vista === "editar" ? (
        <main className="n-editar">
          <header className="n-encabezado">
            <button className="boton-regresar" type="button" onClick={() => setVista("venta")}>
              <img src={iconoRegresar} alt="" width={22} height={22} />
              Catálogo
            </button>
            <div>
              <h1>Tu catálogo</h1>
              <p>{productos.length} productos · {categorias.length} categorías</p>
            </div>
          </header>
          <div className="n-chips">
            {chipsEditor.map((chip) => (
              <button
                key={chip.id}
                className={chip.id === categoriaEdicion ? "n-chip n-chip-activa" : "n-chip"}
                type="button"
                onClick={() => {
                  if (chip.id === "nueva") setDialogoCategoria({ modo: "nueva", id: null, nombre: "", intento: false })
                  else setCategoriaEdicion(chip.id)
                }}
              >
                <span>{chip.id === "nueva" ? <Icono nombre="mas" /> : iniciales(chip.nombre)}</span>
                {chip.nombre}
              </button>
            ))}
          </div>
          <div className="n-barra-cat">
            <strong>
              {categoriaEdicion === "todas"
                ? `Todas · ${productos.length} productos`
                : categoriaEditor
                  ? `${categoriaEditor.nombre} · ${cantidadEditor} productos`
                  : `Sin categoría · ${cantidadEditor} productos`}
            </strong>
            {categoriaEditor ? (
              <div>
                <button className="boton-secundario" type="button" onClick={() => setDialogoCategoria({ modo: "renombrar", id: categoriaEditor.id, nombre: categoriaEditor.nombre, intento: false })}>Renombrar</button>
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={() => {
                    if (!exigirLinea()) return
                    if (cantidadEditor === 0) {
                      void borrarCategoria(db, uid, categoriaEditor.id).then(() => recargarCatalogo())
                      setCategoriaEdicion("todas")
                      return
                    }
                    setDialogoBorrar({ id: categoriaEditor.id, nombre: categoriaEditor.nombre, productos: cantidadEditor })
                  }}
                >
                  Borrar
                </button>
              </div>
            ) : null}
          </div>
          <ul className="n-lista">
            {productosEditor.map((producto) => (
              <li key={producto.id}>
                <button
                  type="button"
                  onClick={() => {
                    setForma({
                      id: producto.id,
                      nombre: producto.nombre,
                      precioTexto: (producto.precioCentavos / 100).toFixed(2),
                      categoriaId: producto.categoriaId,
                      agotado: estaAgotado(producto.agotadoEl, Date.now()),
                      tieneFoto: producto.tieneFoto,
                      archivo: null,
                      vistaLocal: fotos[producto.id] ?? null,
                      intento: false,
                      guardando: false,
                      teclado: false,
                    })
                    setVista("producto")
                  }}
                >
                  <Foto nombre={producto.nombre} url={fotos[producto.id] ?? null} chica />
                  <span>{producto.nombre}</span>
                  <strong>{pesos(producto.precioCentavos)}</strong>
                  {estaAgotado(producto.agotadoEl, ahora) ? <em>{TEXTO_AGOTADO}</em> : null}
                </button>
              </li>
            ))}
          </ul>
          <footer className="n-pie">
            <button className="boton-secundario" type="button" onClick={() => setDialogoCategoria({ modo: "nueva", id: null, nombre: "", intento: false })}>Nueva categoría</button>
            <button className="boton-principal" type="button" onClick={() => { setForma(formaVacia(categoriaEditor?.id ?? null)); setVista("producto") }}>{TEXTO_AGREGAR}</button>
          </footer>
        </main>
      ) : null}

      {vista === "producto" && forma && formaVista ? (
        <main className="n-producto">
          <header className="n-encabezado">
            <button className="boton-regresar" type="button" onClick={() => setVista("editar")}>
              <img src={iconoRegresar} alt="" width={22} height={22} />
              Tu catálogo
            </button>
            <div>
              <h1>{forma.id ? "Editar producto" : "Producto nuevo"}</h1>
              {forma.id ? <p>{TEXTO_TICKETS_VIEJOS}</p> : null}
            </div>
          </header>
          <div className="n-forma">
            <label>
              Nombre
              <input value={forma.nombre} maxLength={40} onChange={(evento) => setForma({ ...forma, nombre: limitarNombre(evento.target.value) })} />
              <small className={formaVista.errorNombre ? "n-error" : ""}>{formaVista.ayudaNombre}</small>
            </label>
            <div className="n-precio">
              <span>Precio</span>
              <button type="button" onClick={() => setForma({ ...forma, teclado: true })}>
                ${forma.precioTexto || "0.00"}
              </button>
              {formaVista.ayudaPrecio ? <small className={formaVista.errorPrecio ? "n-error" : ""}>{formaVista.ayudaPrecio}</small> : null}
              {forma.teclado ? (
                <Teclado
                  punto
                  alTecla={(tecla) => setForma({ ...forma, precioTexto: escribirPrecio(forma.precioTexto, tecla), teclado: true })}
                />
              ) : null}
            </div>
            <div>
              <span>Categoría</span>
              <div className="n-chips">
                {categorias.map((categoria) => (
                  <button key={categoria.id} className={forma.categoriaId === categoria.id ? "n-chip n-chip-activa" : "n-chip"} type="button" onClick={() => setForma({ ...forma, categoriaId: categoria.id })}>
                    <span>{iniciales(categoria.nombre)}</span>
                    {categoria.nombre}
                  </button>
                ))}
                <button className={forma.categoriaId === null ? "n-chip n-chip-activa" : "n-chip"} type="button" onClick={() => setForma({ ...forma, categoriaId: null })}>
                  <span>SC</span>
                  Sin categoría
                </button>
              </div>
            </div>
            {forma.id ? (
              <label className="n-agotado">
                <span>
                  <strong>{TEXTO_AGOTADO}</strong>
                  <small>{TEXTO_AGOTADO_AYUDA}</small>
                </span>
                <input type="checkbox" checked={forma.agotado} onChange={(evento) => setForma({ ...forma, agotado: evento.target.checked })} />
              </label>
            ) : null}
            {forma.id ? (
              <button className="boton-secundario" type="button" onClick={() => setDialogoQuitar({ id: forma.id!, nombre: forma.nombre })}>{TEXTO_QUITAR}</button>
            ) : null}
          </div>
          <aside className="n-foto">
            <div>
              {forma.vistaLocal ? <img src={forma.vistaLocal} alt="" /> : <Icono nombre="tienda" tamano={40} />}
              <strong>{TEXTO_FOTO}</strong>
              <p>{TEXTO_FOTO_AYUDA}</p>
            </div>
            <p>{TEXTO_FOTO_TITULO}. {TEXTO_FOTO_TOMA}</p>
            <button className="boton-secundario" type="button" onClick={() => camara.current?.click()}>{TEXTO_TOMAR}</button>
            <button className="boton-secundario" type="button" onClick={() => galeria.current?.click()}>{TEXTO_GALERIA}</button>
            <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(evento) => elegirFoto(evento.target.files?.[0] ?? null)} />
            <input ref={galeria} type="file" accept="image/*" hidden onChange={(evento) => elegirFoto(evento.target.files?.[0] ?? null)} />
          </aside>
          <footer className="n-pie">
            <button className="boton-secundario" type="button" onClick={() => setVista("editar")}>Cancelar</button>
            <button className="boton-principal" type="button" disabled={!formaVista.puedeGuardar} onClick={() => void guardarForma()}>{formaVista.etiquetaGuardar}</button>
          </footer>
        </main>
      ) : null}

      {vista === "libre" ? (
        <main className="n-libre-pantalla">
          <header className="n-encabezado">
            <button className="boton-regresar" type="button" onClick={() => setVista("venta")}>
              <img src={iconoRegresar} alt="" width={22} height={22} />
              Catálogo
            </button>
            <div>
              <h1>{vistaLibre.titulo}</h1>
              <p>{vistaLibre.apoyo}</p>
            </div>
          </header>
          {vistaLibre.ticketGuardado ? <p className="n-libre-guardado">{vistaLibre.ticketGuardado}</p> : null}
          <div className="n-libre-cuerpo">
            <section>
              <h2>{vistaLibre.pregunta}</h2>
              <p className={vistaLibre.errorMonto ? "n-monto n-monto-error" : "n-monto"}>{vistaLibre.monto}</p>
              {vistaLibre.sobreMaximo ? (
                // UI PROVISIONAL: falta en Figma el texto final del monto máximo (el marco deja «$X»).
                <p className="n-libre-ayuda n-error">{vistaLibre.ayudaMonto}</p>
              ) : (
                <p className={vistaLibre.errorMonto ? "n-libre-ayuda n-error" : "n-libre-ayuda"}>{vistaLibre.ayudaMonto}</p>
              )}
              <label>
                {vistaLibre.conceptoEtiqueta}
                <input
                  value={libreConcepto}
                  placeholder={vistaLibre.conceptoPlaceholder}
                  onChange={(evento) => setLibreConcepto(limitarNombre(evento.target.value))}
                />
              </label>
              <p className="n-libre-concepto-ayuda">
                <span className={vistaLibre.alLimite ? "n-error" : ""}>{vistaLibre.ayudaConcepto}</span>
                <span>{vistaLibre.contador}</span>
              </p>
            </section>
            <aside>
              <Teclado punto alTecla={(tecla) => setLibreTexto((actual) => escribirPrecio(actual, tecla))} />
              <button className="boton-principal" type="button" disabled={!vistaLibre.puedeCobrar} onClick={() => void confirmarLibre()}>
                {vistaLibre.cobrar}
              </button>
              <p className="n-libre-despues">{vistaLibre.despues}</p>
            </aside>
          </div>
        </main>
      ) : null}

      {vista === "cobrar" && cobrarVista && pedidoCobro ? (
        <main className="n-cobrar">
          <header className="n-encabezado">
            <button className="boton-regresar" type="button" aria-label="Regresar al ticket" onClick={() => setVista("venta")}>
              <img src={iconoRegresar} alt="" width={22} height={22} />
            </button>
            <div>
              <h1>{cobrarVista.titulo}</h1>
              <p>{cobrarVista.subtitulo}</p>
              {cobrarVista.despues ? <p>{cobrarVista.despues}</p> : null}
            </div>
          </header>
          <p className="n-total-cobrar"><span>{cobrarVista.totalEtiqueta}</span><strong>{cobrarVista.total}</strong></p>
          <div className="n-metodos">
            <button className="n-metodo" type="button" onClick={() => { setRecibido(0); setTeclas(""); setVista("efectivo") }}>
              <Icono nombre="billete" tamano={40} />
              <strong>{cobrarVista.efectivo}</strong>
              <span>{cobrarVista.efectivoAyuda}</span>
            </button>
            <button className={cobrarVista.codiHabilitado ? "n-metodo" : "n-metodo n-metodo-apagado"} type="button" disabled={!cobrarVista.codiHabilitado} onClick={() => void elegirCodi()}>
              <Icono nombre="qr" tamano={40} />
              {cobrarVista.codiPastilla ? <em>{cobrarVista.codiPastilla}</em> : null}
              <strong>{cobrarVista.codi}</strong>
              <span>{cobrarVista.codiAyuda}</span>
            </button>
          </div>
          {cobrarVista.aviso ? (
            <div className="n-aviso-cuenta">
              <Icono nombre="reloj" tamano={22} />
              <p>{cobrarVista.aviso}</p>
              <em>Hasta 5 días hábiles</em>
              <button type="button" onClick={alEstado}>Ver estado</button>
            </div>
          ) : null}
        </main>
      ) : null}

      {vista === "efectivo" && pedidoCobro && cambio ? (
        <main className="n-efectivo">
          <section>
            <header className="n-encabezado">
              <button className="boton-regresar" type="button" onClick={() => setVista("cobrar")}>
                <img src={iconoRegresar} alt="" width={22} height={22} />
              </button>
              <div>
                <h1>Cobro en efectivo</h1>
                <p>Ticket {formatoNumero(pedidoCobro.numero)} · Total {pesosFijos(pedidoCobro.total)}</p>
              </div>
            </header>
            <h2>¿Cuánto te dio el cliente?</h2>
            <p className="n-monto">{pesos(recibido)} <small>MXN</small></p>
            <div className="n-atajos">
              {ATAJOS_EFECTIVO.map((atajo) => (
                <button key={atajo.id} type="button" onClick={() => {
                  const monto = recibidoDeAtajo(atajo.id, pedidoCobro.total) ?? 0
                  setRecibido(monto)
                  setTeclas(String(Math.trunc(monto / 100)))
                }}>{atajo.etiqueta}</button>
              ))}
            </div>
            <Teclado punto={false} alTecla={(tecla) => {
              const siguiente = escribirEfectivo(teclas, tecla)
              setTeclas(siguiente)
              setRecibido(Number(siguiente || "0") * 100)
            }} />
          </section>
          <aside>
            <p><span>Total</span><strong>{pesosFijos(cambio.total)}</strong></p>
            <p><span>Recibido</span><strong>{pesosFijos(cambio.recibido)}</strong></p>
            <div className="n-cambio">
              <span>Cambio a entregar</span>
              <strong>{pesosFijos(Math.max(0, cambio.cambio))}</strong>
            </div>
            <small>{TEXTO_CONFIRMAR_HISTORIAL}</small>
            <button className="boton-principal" type="button" disabled={!cambio.alcanza} onClick={() => void confirmarEfectivo()}>
              {etiquetaConfirmarEfectivo(pedidoCobro.total)}
            </button>
          </aside>
        </main>
      ) : null}

      {vista === "qr" && cobroUi && pedidoCobro ? (
        <PantallaQr
          numero={pedidoCobro.numero}
          piezas={piezas(pedidoCobro.items)}
          totalCentavos={pedidoCobro.total}
          creadoEn={cobroUi.creadoEn}
          venceEn={cobroUi.venceEn}
          restanteMs={restante}
          mismo={cobroUi.mismo}
          otro={cobroUi.otro}
          destacados={listaBancos.destacados}
          detalle={pedidoCobro.tipo === "libre" ? etiquetaLibre(pedidoCobro.concepto) : null}
          qrString={cobroUi.qrString}
          alVolver={() => setVerTicket(true)}
          alBancos={() => { setHojaBancos(true); void cargarBancos() }}
          alAyuda={() => setAyudaBanco(true)}
        />
      ) : null}

      {vista === "vencido" && pedidoCobro ? (
        <PantallaVencido
          numero={pedidoCobro.numero}
          totalCentavos={pedidoCobro.total}
          alCarrito={() => {
            if (cobroMeta.current.tipo !== "libre") setLineas([])
            setCobroUi(null)
            setVista("venta")
          }}
          alOtra={() => void elegirCodi()}
          alEfectivo={irAEfectivo}
        />
      ) : null}

      {vista === "yaquedo" && pedidoCobro ? (
        <main className="n-yaquedo">
          <img src={logo} alt="" width={128} height={36} />
          <h1>{TEXTO_YA_QUEDO}</h1>
          <p className="n-monto-grande">{pesosFijos(pedidoCobro.total)}</p>
          <p>{TEXTO_DETALLE_COBRO}</p>
          <button className="boton-principal" type="button" onClick={() => setVista("venta")}>
            <Icono nombre="mas" tamano={26} />
            {TEXTO_NUEVA_VENTA}
          </button>
          <small>{regresoEn(segundos)}</small>
        </main>
      ) : null}

      {vista === "historial" ? (
        <main className="n-historial">
          <section>
            <header className="n-encabezado">
              <button className="boton-regresar" type="button" onClick={() => setVista("venta")}>
                <img src={iconoRegresar} alt="" width={22} height={22} />
                Catálogo
              </button>
              <div>
                <h1>Historial</h1>
                <p>{nombre}</p>
              </div>
            </header>
            <div className="n-fechas">
              <button type="button" className={dia === fechaEnMexico(Date.now()) ? "n-fecha-activa" : ""} onClick={() => setDia(fechaEnMexico(Date.now()))}>Hoy</button>
              <button type="button" onClick={() => setDia(fechaEnMexico(Date.now() - 86_400_000))}>Ayer</button>
              <button type="button" onClick={() => setDia(fechaEnMexico(Date.now() - 2 * 86_400_000))}>{diaChip(Date.now() - 2 * 86_400_000)}</button>
              {/* UI PROVISIONAL: falta en Figma el calendario; se usa el del navegador. */}
              <label>
                Elegir fecha
                <input type="date" value={dia} onChange={(evento) => { if (evento.target.value) setDia(evento.target.value) }} />
              </label>
            </div>
            <div className="n-metricas">
              <article><span>Vendido hoy</span><strong>{pesos(totales.vendido)}</strong><small>{totales.tickets} tickets</small></article>
              <article>
                <span>CoDi</span>
                <strong>{pesos(totales.codi)}</strong>
                <small>{notaPorDevolver(totales.porDevolver) ?? `${totales.pagosCodi} pagos`}</small>
              </article>
              <article><span>Efectivo cobrado hoy</span><strong>{pesos(totales.efectivo)}</strong><small>{totales.pagosEfectivo} pagos</small></article>
              <article><span>Pendiente</span><strong>{pesos(totales.pendiente)}</strong></article>
            </div>
            <h2>{encabezadoDia(dia, Date.now())}</h2>
            <ul className="n-tickets">
              {listaDia.map((pedido) => (
                <li key={pedido.id}>
                  <button type="button" onClick={() => setDetalleId(pedido.id)}>
                    <span>{horaMexico(pedido.pagadoEn ?? pedido.creadoEn)}</span>
                    <span>
                      <strong>Ticket {formatoNumero(pedido.numero)}</strong>
                      <small>{resumenItems(pedido, Date.now())}</small>
                      {notaPagoOtroDia(pedido) ? <small>{notaPagoOtroDia(pedido)}</small> : null}
                    </span>
                    <em>{pedido.metodo === "codi" ? "CoDi" : pedido.metodo === "efectivo" ? "Efectivo" : ""}</em>
                    <strong>{pesos(pedido.total)}</strong>
                    <em>{filaConPagoNoEsperado(pedido) ? "pago no esperado" : textoEstado(pedido, Date.now())}</em>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {detalle ? <Detalle pedido={detalle} ahora={Date.now()} alCancelar={() => setDialogoCancelar(detalle)} /> : null}
        </main>
      ) : null}

      {internet ? (
        <div className="n-velo">
          <div className="n-dialogo" role="dialog" aria-labelledby="titulo-internet">
            <h2 id="titulo-internet">{TEXTO_INTERNET}</h2>
            <p>{TEXTO_INTERNET_APOYO}</p>
            <button className="boton-secundario" type="button" onClick={() => setInternet(false)}>{TEXTO_ENTENDIDO}</button>
          </div>
        </div>
      ) : null}
      {/* UI PROVISIONAL: falta en Figma el aviso de pedido ya pagado. */}
      {yaPagado ? (
        <div className="n-velo">
          <div className="n-dialogo" role="dialog">
            <h2>{TEXTO_YA_PAGADO}</h2>
            <button className="boton-secundario" type="button" onClick={() => { setYaPagado(false); setVista("venta") }}>{TEXTO_ENTENDIDO}</button>
          </div>
        </div>
      ) : null}
      {dialogoCategoria ? (
        <DialogoCategoria
          modo={dialogoCategoria.modo}
          nombre={dialogoCategoria.nombre}
          intento={dialogoCategoria.intento}
          alNombre={(valor) => setDialogoCategoria({ ...dialogoCategoria, nombre: limitarNombre(valor) })}
          alCerrar={() => setDialogoCategoria(null)}
          alGuardar={() => {
            const limpio = dialogoCategoria.nombre.trim()
            if (!limpio) {
              setDialogoCategoria({ ...dialogoCategoria, intento: true })
              return
            }
            if (!exigirLinea()) return
            const accion = dialogoCategoria.modo === "nueva"
              ? crearCategoria(db, uid, limpio)
              : renombrarCategoria(db, uid, dialogoCategoria.id ?? "", limpio)
            void accion.then(() => recargarCatalogo())
            setDialogoCategoria(null)
          }}
        />
      ) : null}
      {dialogoBorrar ? (
        <DialogoSimple
          titulo={textoBorrarCategoria(dialogoBorrar.nombre, dialogoBorrar.productos).titulo}
          apoyo={textoBorrarCategoria(dialogoBorrar.nombre, dialogoBorrar.productos).apoyo}
          confirmar={TEXTO_SI_BORRAR}
          alCerrar={() => setDialogoBorrar(null)}
          alConfirmar={() => {
            if (!exigirLinea()) return
            void borrarCategoria(db, uid, dialogoBorrar.id).then(() => recargarCatalogo())
            setCategoriaEdicion("todas")
            setDialogoBorrar(null)
          }}
        />
      ) : null}
      {dialogoQuitar ? (
        <DialogoSimple
          titulo={textoQuitarProducto(dialogoQuitar.nombre).titulo}
          apoyo={textoQuitarProducto(dialogoQuitar.nombre).apoyo}
          confirmar={TEXTO_SI_QUITAR}
          alCerrar={() => setDialogoQuitar(null)}
          alConfirmar={() => {
            if (!exigirLinea()) return
            void quitarProducto(db, uid, dialogoQuitar.id).then(() => recargarCatalogo())
            setDialogoQuitar(null)
            setVista("editar")
          }}
        />
      ) : null}
      {dialogoCancelar ? (
        <DialogoSimple
          titulo={textoCancelar(dialogoCancelar.numero)}
          apoyo={TEXTO_CANCELAR_APOYO}
          confirmar={TEXTO_SI_CANCELAR}
          alCerrar={() => setDialogoCancelar(null)}
          alConfirmar={() => void confirmarCancelar()}
        />
      ) : null}
      {retomar ? (
        <div className="n-velo">
          <div className="n-dialogo" role="dialog">
            <h2>Hay un cobro activo</h2>
            <p>Muestra el mismo QR. Si haces otro, serían dos cobros.</p>
            <p>Vence en {textoEstado(retomar, Date.now()).replace("Cobrando ", "")} · a las {horaMexico(retomar.cobros.find((cobro) => cobro.id === retomar.cobroActivoId)?.venceEn ?? Date.now())}</p>
            <button className="boton-secundario" type="button" onClick={() => { setPedidoCobro(retomar); setRetomar(null); setPanel(false); setVista("cobrar") }}>{TEXTO_OTRO_METODO}</button>
            <button className="boton-principal" type="button" onClick={() => mostrarMismo(retomar)}>{TEXTO_MISMO_QR}</button>
          </div>
        </div>
      ) : null}
      {hojaBancos ? (
        <HojaBancos
          lista={listaBancos}
          alCerrar={() => setHojaBancos(false)}
          alEfectivo={irAEfectivo}
        />
      ) : null}
      {ayudaBanco && cobroUi ? (
        <DialogoAyuda
          restanteMs={Math.max(0, quedaQr())}
          venceEn={cobroUi.venceEn}
          alEfectivo={irAEfectivo}
          alVolver={() => setAyudaBanco(false)}
        />
      ) : null}
      {avisoEfectivo && cobroUi ? (
        <DialogoEfectivoActivo
          restanteMs={Math.max(0, quedaQr())}
          venceEn={cobroUi.venceEn}
          queEs={queEs}
          alQueEs={() => setQueEs(true)}
          alSeguir={() => { setAvisoEfectivo(false); setQueEs(false) }}
          alConfirmar={() => {
            setAvisoEfectivo(false)
            setQueEs(false)
            setRecibido(0)
            setTeclas("")
            setVista("efectivo")
          }}
        />
      ) : null}
      {verTicket && pedidoCobro ? <HojaTicket pedido={pedidoCobro} alCerrar={() => setVerTicket(false)} /> : null}
      {falloQr ? (
        <DialogoFalloQr alReintentar={() => void elegirCodi()} alEfectivo={irAEfectivo} />
      ) : null}
      {avisoPago?.clase === "no_esperado" ? (
        <DialogoNoEsperado
          numero={avisoPago.numero}
          monto={avisoPago.monto}
          alVer={() => {
            vistos.current.add(avisoPago.id)
            setDetalleId(avisoPago.pedidoId)
            setVista("historial")
            setAvisoPago(null)
          }}
          alCerrar={() => {
            vistos.current.add(avisoPago.id)
            setAvisoPago(null)
          }}
        />
      ) : null}
      {avisoPago?.clase === "duplicado" ? (
        <DialogoDuplicado alCerrar={() => {
          vistos.current.add(avisoPago.id)
          setAvisoPago(null)
        }} />
      ) : null}
      {error ? <p className="n-error-flotante">{error}</p> : null}
    </div>
  )

  function elegirFoto(archivo: File | null) {
    if (!archivo || !forma) return
    setForma({ ...forma, archivo, vistaLocal: URL.createObjectURL(archivo), tieneFoto: true })
  }
}

function Foto({ nombre, url, chica = false }: { nombre: string; url: string | null; chica?: boolean }) {
  if (url) return <img className={chica ? "n-foto-chica" : "n-foto-tarjeta"} src={url} alt="" />
  return <span className={chica ? "n-iniciales n-iniciales-chica" : "n-iniciales"}>{iniciales(nombre)}</span>
}

function Ticket({
  lineas,
  ticket,
  fotos,
  avisoLibre,
  alVaciar,
  alCantidad,
  alCobrar,
  alLibre,
}: {
  lineas: LineaTicket[]
  ticket: ReturnType<typeof vistaTicket>
  fotos: Record<string, string>
  avisoLibre: string | null
  alVaciar: () => void
  alCantidad: (id: string | null, delta: number) => void
  alCobrar: () => void
  alLibre: () => void
}) {
  return (
    <aside className="n-ticket">
      <header>
        <div>
          <h2>{ticket.titulo}</h2>
          <p>{ticket.piezas}</p>
        </div>
        {!ticket.vacio ? <button className="n-vaciar" type="button" onClick={alVaciar}>Vaciar</button> : null}
      </header>
      {ticket.vacio ? (
        <div className="n-ticket-vacio">
          <span><Icono nombre="ticket" tamano={32} /></span>
          <strong>{ticket.mensaje}</strong>
          <p>{ticket.apoyo}</p>
        </div>
      ) : (
        <ul>
          {lineas.map((linea) => (
            <li key={linea.productoId}>
              <Foto nombre={linea.nombre} url={linea.productoId ? fotos[linea.productoId] ?? null : null} chica />
              <div>
                <p><span>{linea.nombre}</span><strong>{pesos(linea.precioCentavos * linea.cantidad)}</strong></p>
                <p>
                  <small>{pesos(linea.precioCentavos)} c/u</small>
                  <span className="n-paso">
                    <button type="button" aria-label="Quitar uno" onClick={() => alCantidad(linea.productoId, -1)}><Icono nombre="menos" /></button>
                    {linea.cantidad}
                    <button type="button" aria-label="Sumar uno" onClick={() => alCantidad(linea.productoId, 1)}><Icono nombre="mas" /></button>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="n-libre" type="button" onClick={alLibre}>Cobro libre</button>
      <footer>
        <span>Total</span>
        <strong>{pesos(ticket.total)}</strong>
        <button className="boton-principal" type="button" disabled={!ticket.cobrar} onClick={alCobrar}>{ticket.cobrar ?? "Cobrar"}</button>
      </footer>
      {avisoLibre ? (
        <p className="n-libre-listo">
          <span aria-hidden="true">✓</span>
          {avisoLibre}
        </p>
      ) : null}
    </aside>
  )
}

function Teclado({ punto, alTecla }: { punto: boolean; alTecla: (tecla: string) => void }) {
  const teclas = punto ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "borrar"] : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "borrar"]
  return (
    <div className="n-teclado">
      {teclas.map((tecla) => (
        <button key={tecla} type="button" onClick={() => alTecla(tecla)}>
          {tecla === "borrar" ? <Icono nombre="borrar" tamano={26} /> : tecla}
        </button>
      ))}
    </div>
  )
}

function DialogoCategoria({
  modo,
  nombre,
  intento,
  alNombre,
  alCerrar,
  alGuardar,
}: {
  modo: "nueva" | "renombrar"
  nombre: string
  intento: boolean
  alNombre: (valor: string) => void
  alCerrar: () => void
  alGuardar: () => void
}) {
  const vacio = intento && nombre.trim().length === 0
  return (
    <div className="n-velo">
      <div className="n-dialogo" role="dialog">
        <h2>{modo === "nueva" ? "Nueva categoría" : "Renombrar categoría"}</h2>
        <p>{modo === "nueva" ? TEXTO_CATEGORIA_APOYO : TEXTO_RENOMBRAR_APOYO}</p>
        <label>
          Nombre
          <input value={nombre} maxLength={40} onChange={(evento) => alNombre(evento.target.value)} />
          <small className={vacio ? "n-error" : ""}>{vacio ? "Escribe un nombre." : TEXTO_EJEMPLO_CATEGORIA}</small>
        </label>
        <div className="n-dialogo-acciones">
          <button className="boton-secundario" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="boton-principal" type="button" onClick={alGuardar}>{modo === "nueva" ? TEXTO_CREAR_CATEGORIA : TEXTO_GUARDAR_NOMBRE}</button>
        </div>
      </div>
    </div>
  )
}

function DialogoSimple({
  titulo,
  apoyo,
  confirmar,
  alCerrar,
  alConfirmar,
}: {
  titulo: string
  apoyo: string
  confirmar: string
  alCerrar: () => void
  alConfirmar: () => void
}) {
  return (
    <div className="n-velo">
      <div className="n-dialogo" role="dialog">
        <h2>{titulo}</h2>
        <p>{apoyo}</p>
        <button className="boton-principal" type="button" onClick={alConfirmar}>{confirmar}</button>
        <button className="boton-secundario" type="button" onClick={alCerrar}>{TEXTO_VOLVER}</button>
      </div>
    </div>
  )
}

function Detalle({ pedido, ahora, alCancelar }: { pedido: PedidoLeido; ahora: number; alCancelar: () => void }) {
  const bloqueo = textoBloqueoCancelar(pedido, ahora)
  const cobro = pedido.cobros[0]
  const pago = cobro?.pagos.find((item) => item.tipo === "normal")
  return (
    <aside className="n-detalle">
      <header>
        <h2>Ticket {formatoNumero(pedido.numero)}</h2>
        <em>{filaConPagoNoEsperado(pedido) ? "pago no esperado" : textoEstado(pedido, ahora)}</em>
      </header>
      <p>
        {pedido.estado === "Cancelado" && pedido.canceladoEn
          ? `Cancelado a las ${horaMexico(pedido.canceladoEn)}`
          : pedido.estado === "Pagado" && pedido.metodo === "codi"
            ? `${fechaBarra(pedido.pagadoEn ?? pedido.creadoEn)} · ${horaMexico(pedido.pagadoEn ?? pedido.creadoEn)} · Pagado con CoDi`
            : pedido.estado === "Pagado"
              ? `${fechaBarra(pedido.pagadoEn ?? pedido.creadoEn)} · ${horaMexico(pedido.pagadoEn ?? pedido.creadoEn)} · Pagado en efectivo`
              : pedido.estado === "Pendiente" && bloqueo
                ? "Sin pagar"
                : textoEstado(pedido, ahora)}
      </p>
      {bloqueo ? <p>{textoEstado(pedido, ahora)}</p> : null}
      <ul>
        {pedido.tipo === "libre" ? (
          <li>
            <span className="n-detalle-libre">{etiquetaLibre(pedido.concepto)}</span>
            <strong>{pesos(pedido.total)}</strong>
          </li>
        ) : (
          pedido.items.map((item) => (
            <li key={`${item.nombre}-${item.precioCentavos}`}>
              <span>{item.cantidad}×</span>
              <span>{item.nombre}</span>
              <strong>{pesos(item.precioCentavos * item.cantidad)}</strong>
            </li>
          ))
        )}
      </ul>
      <p className="n-detalle-total"><span>Total</span><strong>{pesosFijos(pedido.total)}</strong></p>
      <dl>
        <div><dt>Método</dt><dd>{pedido.metodo === "codi" ? "CoDi · QR" : pedido.metodo === "efectivo" ? "Efectivo" : "Sin pagar"}</dd></div>
        {pago ? <div><dt>Confirmado por</dt><dd>Webhook del banco · {horaCompleta(pago.datePaid)}</dd></div> : null}
        {pedido.efectivo ? <div><dt>Recibido</dt><dd>{pesosFijos(pedido.efectivo.recibido)}</dd></div> : null}
        {pedido.efectivo ? <div><dt>Cambio</dt><dd>{pesosFijos(pedido.efectivo.cambio)}</dd></div> : null}
        <div><dt>Referencia</dt><dd>{formatoNumero(pedido.numero)}</dd></div>
        {cobro ? <div><dt>Cobro generado</dt><dd>{horaMexico(cobro.creadoEn)} · vencía {horaMexico(cobro.venceEn)}</dd></div> : null}
      </dl>
      {pedido.cobros.length > 0 ? (
        <div>
          <h3>Intentos de cobro</h3>
          <ul>
            {pedido.cobros.map((item) => (
              <li key={item.id}>
                <span>{horaMexico(item.creadoEn)}</span>
                <span>QR en pantalla</span>
                <span>{etiquetaIntento(item, ahora)}</span>
                <em>{pastillaIntento(item, ahora)}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pedido.estado === "Pendiente" ? (
        <button type="button" disabled={!puedeCancelar(pedido, ahora)} onClick={alCancelar}>Cancelar pedido</button>
      ) : null}
      {bloqueo ? <small>{bloqueo}</small> : null}
    </aside>
  )
}
