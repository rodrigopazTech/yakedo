import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { siguienteCuenta, type CuentaDocumento, type EstadoCuentaPey, type NegocioGuardado, type Privado } from "../../src/negocio/dominio/cuenta.ts"
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
  }
}

export type { EstadoCuentaPey }
