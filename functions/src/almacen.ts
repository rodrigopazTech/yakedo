import { getFirestore, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore"
import { aplicarPago, type Registro, type TxCobro } from "../../src/cobro/resolucion.ts"
import type { CobroGuardado, CobroNuevo, PedidoParaCobro } from "../../src/cobro/modelo.ts"
import type { PagoQr } from "../../src/cobro/pey-qr.ts"
import { codiDisponible, siguienteCuenta, type CuentaDocumento, type EstadoCuentaPey, type NegocioGuardado, type Privado } from "../../src/negocio/dominio/cuenta.ts"
import type { AltaPersistida, EstadoLocal, NuevaPersistida, RepositorioNegocio, ResultadoEstado } from "../../src/negocio/dominio/repositorio.ts"

function cuentaDe(valor: unknown): CuentaDocumento | null {
  if (!valor || typeof valor !== "object") return null
  return valor as CuentaDocumento
}

function negocioDe(valor: unknown): NegocioGuardado | null {
  if (!valor || typeof valor !== "object") return null
  return valor as NegocioGuardado
}

function privadoDe(valor: unknown): Privado | null {
  if (!valor || typeof valor !== "object") return null
  return valor as Privado
}

function millis(valor: unknown): number {
  if (typeof valor === "number") return valor
  if (valor && typeof valor === "object" && "toMillis" in valor && typeof (valor as { toMillis: () => number }).toMillis === "function") {
    return (valor as { toMillis: () => number }).toMillis()
  }
  return 0
}

function plano(valor: unknown): unknown {
  if (valor instanceof Timestamp) return valor.toMillis()
  if (Array.isArray(valor)) return valor.map((item) => plano(item))
  if (valor && typeof valor === "object") {
    const salida: Registro = {}
    for (const [clave, item] of Object.entries(valor as Registro)) salida[clave] = plano(item) as never
    return salida
  }
  return valor
}

function conTiempos(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map((item) => conTiempos(item))
  if (valor && typeof valor === "object") {
    const salida: Registro = {}
    for (const [clave, item] of Object.entries(valor as Registro)) {
      salida[clave] =
        typeof item === "number" && (clave === "datePaid" || clave.endsWith("En"))
          ? Timestamp.fromMillis(item)
          : (conTiempos(item) as never)
    }
    return salida
  }
  return valor
}

function txDe(db: Firestore, tx: Transaction): TxCobro {
  return {
    async leer(ruta) {
      const snap = await tx.get(db.doc(ruta))
      if (!snap.exists) return null
      return plano(snap.data()) as Registro
    },
    escribir(ruta, datos) {
      tx.set(db.doc(ruta), conTiempos(datos) as Registro)
    },
    fusionar(ruta, datos) {
      tx.update(db.doc(ruta), conTiempos(datos) as Registro)
    },
  }
}

/** Escrituras de Admin SDK: no pasan por las reglas del cliente. */
export function almacenFirestore(db: Firestore = getFirestore()): RepositorioNegocio {
  return {
    async reservarClabe(clabe, uid) {
      const ref = db.doc(`clabes/${clabe}`)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const dueno = snap.get("negocioId")
        if (snap.exists && dueno !== uid) return "ajena"
        if (snap.exists) return "propia"
        tx.set(ref, { negocioId: uid })
        return "libre"
      })
    },
    async liberarClabe(clabe, uid) {
      const ref = db.doc(`clabes/${clabe}`)
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (snap.get("negocioId") === uid) tx.delete(ref)
      })
    },
    async leer(uid) {
      const [negocio, cuenta, privado] = await Promise.all([
        db.doc(`negocios/${uid}`).get(),
        db.doc(`negocios/${uid}/cuenta/pey`).get(),
        db.doc(`cuentasPrivadas/${uid}`).get(),
      ])
      const estado: EstadoLocal = {
        negocio: negocio.exists ? negocioDe(negocio.data()) : null,
        cuenta: cuenta.exists ? cuentaDe(cuenta.data()) : null,
        privado: privado.exists ? privadoDe(privado.data()) : null,
      }
      return estado
    },
    async guardarAlta(datos: AltaPersistida) {
      const lote = db.batch()
      if (datos.bankAccountIdAnterior) lote.delete(db.doc(`cuentasPey/${datos.bankAccountIdAnterior}`))
      lote.set(db.doc(`negocios/${datos.uid}`), datos.negocio)
      lote.set(db.doc(`negocios/${datos.uid}/cuenta/pey`), datos.cuenta)
      lote.set(db.doc(`cuentasPrivadas/${datos.uid}`), datos.privado)
      lote.set(db.doc(`clabes/${datos.clabe}`), { negocioId: datos.uid })
      const id = datos.cuenta.actual?.bankAccountId
      if (id) lote.set(db.doc(`cuentasPey/${id}`), { negocioId: datos.uid, rol: "actual" })
      await lote.commit()
    },
    async guardarNueva(datos: NuevaPersistida) {
      const lote = db.batch()
      if (datos.clabeLiberar) lote.delete(db.doc(`clabes/${datos.clabeLiberar}`))
      const anterior = (await db.doc(`negocios/${datos.uid}/cuenta/pey`).get()).get("nueva") as { bankAccountId?: string } | undefined
      if (anterior?.bankAccountId && anterior.bankAccountId !== datos.cuenta.nueva?.bankAccountId) {
        lote.delete(db.doc(`cuentasPey/${anterior.bankAccountId}`))
      }
      lote.set(db.doc(`negocios/${datos.uid}/cuenta/pey`), datos.cuenta)
      lote.set(db.doc(`cuentasPrivadas/${datos.uid}`), datos.privado)
      lote.set(db.doc(`clabes/${datos.clabe}`), { negocioId: datos.uid })
      const id = datos.cuenta.nueva?.bankAccountId
      if (id) lote.set(db.doc(`cuentasPey/${id}`), { negocioId: datos.uid, rol: "nueva" })
      await lote.commit()
    },
    async fijarSeguir(uid, seguir) {
      await db.doc(`negocios/${uid}/cuenta/pey`).update({ seguirConActual: seguir })
    },
    async hayCobroActivo(uid) {
      const consulta = await db.collection(`negocios/${uid}/pedidos`).where("cobroActivoId", "!=", null).limit(1).get()
      return !consulta.empty
    },
    async aplicarEstado(bankAccountId, estado): Promise<ResultadoEstado | null> {
      return db.runTransaction(async (tx) => {
        const indiceRef = db.doc(`cuentasPey/${bankAccountId}`)
        const indice = await tx.get(indiceRef)
        if (!indice.exists) return null
        const uid = String(indice.get("negocioId"))
        const cuentaRef = db.doc(`negocios/${uid}/cuenta/pey`)
        const privadoRef = db.doc(`cuentasPrivadas/${uid}`)
        const [cuentaSnap, privadoSnap] = await Promise.all([tx.get(cuentaRef), tx.get(privadoRef)])
        const cuenta = cuentaDe(cuentaSnap.data())
        const privado = privadoDe(privadoSnap.data()) ?? { clabeActual: null, clabeNueva: null }
        if (!cuenta) return null
        const transicion = siguienteCuenta(cuenta, privado, bankAccountId, estado)
        if (!transicion) return null
        tx.set(cuentaRef, transicion.cuenta)
        tx.set(privadoRef, transicion.privado)
        if (transicion.liberarClabe) tx.delete(db.doc(`clabes/${transicion.liberarClabe}`))
        if (transicion.borrarBankAccountId) tx.delete(db.doc(`cuentasPey/${transicion.borrarBankAccountId}`))
        const vigente = transicion.cuenta.actual?.bankAccountId
        if (vigente) tx.set(db.doc(`cuentasPey/${vigente}`), { negocioId: uid, rol: "actual" })
        const nueva = transicion.cuenta.nueva?.bankAccountId
        if (nueva) tx.set(db.doc(`cuentasPey/${nueva}`), { negocioId: uid, rol: "nueva" })
        return { uid, cuenta: transicion.cuenta, aviso: transicion.aviso }
      })
    },
    async tomarWebhook(id, tipo, eventoCobro) {
      const ref = db.doc(`webhooks/${id}`)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (snap.exists) return "repetido"
        tx.set(ref, { tipo })
        if (eventoCobro !== null) tx.set(db.doc(`eventosCobro/${id}`), { datos: eventoCobro })
        return "nuevo"
      })
    },
    async leerPedidoCobro(uid, pedidoId) {
      const pedido = await db.doc(`negocios/${uid}/pedidos/${pedidoId}`).get()
      if (!pedido.exists) return null
      const cobros = await db.collection(`negocios/${uid}/pedidos/${pedidoId}/cobros`).get()
      const estado = pedido.get("estado")
      const cobroActivoId = pedido.get("cobroActivoId")
      const leido: PedidoParaCobro = {
        id: pedidoId,
        numero: typeof pedido.get("numero") === "number" ? pedido.get("numero") : 0,
        estado: estado === "Pagado" || estado === "Cancelado" ? estado : "Pendiente",
        total: typeof pedido.get("total") === "number" ? pedido.get("total") : 0,
        cobroActivoId: typeof cobroActivoId === "string" ? cobroActivoId : null,
        cobros: cobros.docs.map((item) => ({
          id: item.id,
          venceEn: millis(item.get("venceEn")),
          estado: typeof item.get("estado") === "string" ? item.get("estado") : "activo",
          codiQrId: typeof item.get("codiQrId") === "string" ? item.get("codiQrId") : null,
        })),
      }
      return leido
    },
    async bankAccountActivo(uid) {
      const snap = await db.doc(`negocios/${uid}/cuenta/pey`).get()
      const cuenta = cuentaDe(snap.data())
      if (!codiDisponible(cuenta)) return null
      return cuenta?.actual?.bankAccountId ?? null
    },
    async guardarCobroQr(datos: CobroNuevo) {
      const pedidoRef = db.doc(`negocios/${datos.uid}/pedidos/${datos.pedidoId}`)
      const cobroRef = pedidoRef.collection("cobros").doc(datos.cobroId)
      await db.runTransaction(async (tx) => {
        const pedido = await tx.get(pedidoRef)
        if (!pedido.exists) return
        tx.set(cobroRef, {
          codiQrId: datos.codiQrId,
          qrString: datos.qrString,
          monto: datos.monto,
          creadoEn: Timestamp.fromMillis(datos.creadoEn),
          venceEn: Timestamp.fromMillis(datos.venceEn),
          estado: "activo",
          pagosResumen: [],
        })
        tx.set(db.doc(`cobrosQr/${datos.codiQrId}`), {
          negocioId: datos.uid,
          pedidoId: datos.pedidoId,
          cobroId: datos.cobroId,
        })
        if (datos.seguirActivo && pedido.get("estado") === "Pendiente") {
          tx.update(pedidoRef, { cobroActivoId: datos.cobroId })
        }
      })
    },
    async leerCobroQr(uid, pedidoId, cobroId) {
      const pedido = await this.leerPedidoCobro(uid, pedidoId)
      const snap = await db.doc(`negocios/${uid}/pedidos/${pedidoId}/cobros/${cobroId}`).get()
      if (!pedido || !snap.exists) return null
      const codiQrId = snap.get("codiQrId")
      const qrString = snap.get("qrString")
      if (typeof codiQrId !== "string" || typeof qrString !== "string") return null
      const cobro: CobroGuardado = {
        id: cobroId,
        codiQrId,
        qrString,
        monto: typeof snap.get("monto") === "number" ? snap.get("monto") : pedido.total,
        creadoEn: millis(snap.get("creadoEn")),
        venceEn: millis(snap.get("venceEn")),
        estado: typeof snap.get("estado") === "string" ? snap.get("estado") : "activo",
        pedidoId,
        numero: pedido.numero,
      }
      return cobro
    },
    async marcarCobroVencido(uid, pedidoId, cobroId) {
      const ref = db.doc(`negocios/${uid}/pedidos/${pedidoId}/cobros/${cobroId}`)
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists || snap.get("estado") === "pagado") return
        tx.update(ref, { estado: "vencido" })
      })
    },
    async resolverPagoQr(webhookId: string, pago: PagoQr, ahora: number) {
      return db.runTransaction(async (tx) => aplicarPago(txDe(db, tx), webhookId, pago, ahora))
    },
  }
}

export type { EstadoCuentaPey }
