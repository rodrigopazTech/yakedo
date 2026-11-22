import { aplicarPago, type Registro, type TxCobro } from "../../cobro/resolucion.ts"
import type { CobroGuardado, CobroNuevo, PedidoParaCobro } from "../../cobro/modelo.ts"
import type { PagoQr } from "../../cobro/pey-qr.ts"
import { codiDisponible, siguienteCuenta, type CuentaDocumento, type EstadoCuentaPey, type NegocioGuardado, type Privado } from "./cuenta.ts"
import type { AltaPersistida, EstadoLocal, NuevaPersistida, RepositorioNegocio, ResultadoEstado } from "./repositorio.ts"

interface IndicePey {
  uid: string
  rol: "actual" | "nueva"
}

/** Repositorio en memoria para las pruebas. No habla con Pey ni con Firestore. */
export class MemoriaNegocio implements RepositorioNegocio {
  private readonly clabes = new Map<string, string>()
  private readonly negocios = new Map<string, NegocioGuardado>()
  private readonly cuentas = new Map<string, CuentaDocumento>()
  private readonly privados = new Map<string, Privado>()
  private readonly pey = new Map<string, IndicePey>()
  private readonly webhooks = new Map<string, string>()
  private readonly cobros = new Map<string, unknown>()
  private readonly docs = new Map<string, Registro>()
  private cadena: Promise<void> = Promise.resolve()
  readonly cobroActivo = new Set<string>()

  async reservarClabe(clabe: string, uid: string): Promise<"libre" | "propia" | "ajena"> {
    const dueno = this.clabes.get(clabe)
    if (dueno && dueno !== uid) return "ajena"
    if (dueno === uid) return "propia"
    this.clabes.set(clabe, uid)
    return "libre"
  }

  async liberarClabe(clabe: string, uid: string): Promise<void> {
    if (this.clabes.get(clabe) === uid) this.clabes.delete(clabe)
  }

  async leer(uid: string): Promise<EstadoLocal> {
    return {
      negocio: this.negocios.get(uid) ?? null,
      cuenta: this.cuentas.get(uid) ?? null,
      privado: this.privados.get(uid) ?? null,
    }
  }

  async guardarAlta(datos: AltaPersistida): Promise<void> {
    if (datos.bankAccountIdAnterior) this.pey.delete(datos.bankAccountIdAnterior)
    this.negocios.set(datos.uid, datos.negocio)
    this.cuentas.set(datos.uid, datos.cuenta)
    this.privados.set(datos.uid, datos.privado)
    const id = datos.cuenta.actual?.bankAccountId
    if (id) this.pey.set(id, { uid: datos.uid, rol: "actual" })
    this.clabes.set(datos.clabe, datos.uid)
  }

  async guardarNueva(datos: NuevaPersistida): Promise<void> {
    if (datos.clabeLiberar) this.clabes.delete(datos.clabeLiberar)
    const anterior = this.cuentas.get(datos.uid)?.nueva?.bankAccountId
    if (anterior && anterior !== datos.cuenta.nueva?.bankAccountId) this.pey.delete(anterior)
    this.cuentas.set(datos.uid, datos.cuenta)
    this.privados.set(datos.uid, datos.privado)
    const id = datos.cuenta.nueva?.bankAccountId
    if (id) this.pey.set(id, { uid: datos.uid, rol: "nueva" })
    this.clabes.set(datos.clabe, datos.uid)
  }

  async fijarSeguir(uid: string, seguir: boolean): Promise<void> {
    const cuenta = this.cuentas.get(uid)
    if (!cuenta) return
    this.cuentas.set(uid, { ...cuenta, seguirConActual: seguir })
  }

  async hayCobroActivo(uid: string): Promise<boolean> {
    return this.cobroActivo.has(uid)
  }

  async aplicarEstado(bankAccountId: string, estado: EstadoCuentaPey): Promise<ResultadoEstado | null> {
    const indice = this.pey.get(bankAccountId)
    if (!indice) return null
    const cuenta = this.cuentas.get(indice.uid)
    const privado = this.privados.get(indice.uid) ?? { clabeActual: null, clabeNueva: null }
    if (!cuenta) return null
    const transicion = siguienteCuenta(cuenta, privado, bankAccountId, estado)
    if (!transicion) return null
    this.cuentas.set(indice.uid, transicion.cuenta)
    this.privados.set(indice.uid, transicion.privado)
    if (transicion.liberarClabe) this.clabes.delete(transicion.liberarClabe)
    if (transicion.borrarBankAccountId) this.pey.delete(transicion.borrarBankAccountId)
    const vigente = transicion.cuenta.actual?.bankAccountId
    if (vigente) this.pey.set(vigente, { uid: indice.uid, rol: "actual" })
    const nueva = transicion.cuenta.nueva?.bankAccountId
    if (nueva) this.pey.set(nueva, { uid: indice.uid, rol: "nueva" })
    return { uid: indice.uid, cuenta: transicion.cuenta, aviso: transicion.aviso }
  }

  async tomarWebhook(id: string, tipo: string, eventoCobro: unknown | null): Promise<"nuevo" | "repetido"> {
    if (this.webhooks.has(id) || this.docs.has(`webhooks/${id}`)) return "repetido"
    this.webhooks.set(id, tipo)
    this.docs.set(`webhooks/${id}`, { tipo })
    if (eventoCobro !== null) this.cobros.set(id, eventoCobro)
    return "nuevo"
  }

  private async enTransaccion<T>(trabajo: (tx: TxCobro) => Promise<T>): Promise<T> {
    const anterior = this.cadena
    let liberar = () => {}
    this.cadena = new Promise<void>((resolver) => {
      liberar = resolver
    })
    await anterior
    try {
      return await trabajo({
        leer: (ruta) => {
          const doc = this.docs.get(ruta)
          return Promise.resolve(doc ? structuredClone(doc) : null)
        },
        escribir: (ruta, datos) => {
          this.docs.set(ruta, structuredClone(datos))
        },
        fusionar: (ruta, datos) => {
          this.docs.set(ruta, { ...(this.docs.get(ruta) ?? {}), ...structuredClone(datos) })
        },
      })
    } finally {
      liberar()
    }
  }

  async leerPedidoCobro(uid: string, pedidoId: string): Promise<PedidoParaCobro | null> {
    const pedido = this.docs.get(`negocios/${uid}/pedidos/${pedidoId}`)
    if (!pedido) return null
    const prefijo = `negocios/${uid}/pedidos/${pedidoId}/cobros/`
    const cobros = [...this.docs.entries()]
      .filter(([ruta]) => ruta.startsWith(prefijo) && ruta.slice(prefijo.length).split("/").length === 1)
      .map(([ruta, datos]) => ({
        id: ruta.slice(prefijo.length),
        venceEn: typeof datos.venceEn === "number" ? datos.venceEn : 0,
        estado: typeof datos.estado === "string" ? datos.estado : "activo",
        codiQrId: typeof datos.codiQrId === "string" ? datos.codiQrId : null,
      }))
    const estado = pedido.estado
    return {
      id: pedidoId,
      numero: typeof pedido.numero === "number" ? pedido.numero : 0,
      estado: estado === "Pagado" || estado === "Cancelado" ? estado : "Pendiente",
      total: typeof pedido.total === "number" ? pedido.total : 0,
      cobroActivoId: typeof pedido.cobroActivoId === "string" ? pedido.cobroActivoId : null,
      cobros,
    }
  }

  async bankAccountActivo(uid: string): Promise<string | null> {
    const cuenta = this.cuentas.get(uid) ?? null
    if (!codiDisponible(cuenta)) return null
    return cuenta?.actual?.bankAccountId ?? null
  }

  async guardarCobroQr(datos: CobroNuevo): Promise<void> {
    const base = `negocios/${datos.uid}/pedidos/${datos.pedidoId}`
    const pedido = this.docs.get(base)
    if (!pedido) return
    this.docs.set(`${base}/cobros/${datos.cobroId}`, {
      codiQrId: datos.codiQrId,
      qrString: datos.qrString,
      monto: datos.monto,
      creadoEn: datos.creadoEn,
      venceEn: datos.venceEn,
      estado: "activo",
      pagosResumen: [],
    })
    this.docs.set(`cobrosQr/${datos.codiQrId}`, {
      negocioId: datos.uid,
      pedidoId: datos.pedidoId,
      cobroId: datos.cobroId,
    })
    if (datos.seguirActivo && pedido.estado === "Pendiente") {
      this.docs.set(base, { ...pedido, cobroActivoId: datos.cobroId })
    }
  }

  async leerCobroQr(uid: string, pedidoId: string, cobroId: string): Promise<CobroGuardado | null> {
    const pedido = await this.leerPedidoCobro(uid, pedidoId)
    const datos = this.docs.get(`negocios/${uid}/pedidos/${pedidoId}/cobros/${cobroId}`)
    if (!pedido || !datos || typeof datos.codiQrId !== "string" || typeof datos.qrString !== "string") return null
    return {
      id: cobroId,
      codiQrId: datos.codiQrId,
      qrString: datos.qrString,
      monto: typeof datos.monto === "number" ? datos.monto : pedido.total,
      creadoEn: typeof datos.creadoEn === "number" ? datos.creadoEn : 0,
      venceEn: typeof datos.venceEn === "number" ? datos.venceEn : 0,
      estado: typeof datos.estado === "string" ? datos.estado : "activo",
      pedidoId,
      numero: pedido.numero,
    }
  }

  async marcarCobroVencido(uid: string, pedidoId: string, cobroId: string): Promise<void> {
    await this.enTransaccion(async (tx) => {
      const ruta = `negocios/${uid}/pedidos/${pedidoId}/cobros/${cobroId}`
      const cobro = await tx.leer(ruta)
      if (!cobro || cobro.estado === "pagado") return
      tx.fusionar(ruta, { estado: "vencido" })
    })
  }

  async resolverPagoQr(webhookId: string, pago: PagoQr, ahora: number) {
    return this.enTransaccion((tx) => aplicarPago(tx, webhookId, pago, ahora))
  }

  /** Misma cola que el webhook: simula la transacción de Firestore del efectivo. */
  async cobrarEfectivoMemoria(uid: string, pedidoId: string, recibido: number, ahora: number) {
    return this.enTransaccion(async (tx) => {
      const ruta = `negocios/${uid}/pedidos/${pedidoId}`
      const pedido = await tx.leer(ruta)
      if (!pedido) return "cancelado" as const
      if (pedido.estado === "Pagado") return "ya-pagado" as const
      if (pedido.estado === "Cancelado") return "cancelado" as const
      const total = typeof pedido.total === "number" ? pedido.total : 0
      if (recibido < total) return "insuficiente" as const
      tx.fusionar(ruta, {
        estado: "Pagado",
        metodo: "efectivo",
        pagadoEn: ahora,
        efectivo: { recibido, cambio: recibido - total },
      })
      return "pagado" as const
    })
  }

  sembrarPedido(uid: string, pedidoId: string, datos: Registro): void {
    this.docs.set(`negocios/${uid}/pedidos/${pedidoId}`, datos)
  }

  doc(ruta: string): Registro | null {
    const datos = this.docs.get(ruta)
    return datos ? structuredClone(datos) : null
  }

  clabeDe(clabe: string): string | undefined {
    return this.clabes.get(clabe)
  }

  eventosCobro(): ReadonlyMap<string, unknown> {
    return this.cobros
  }
}
