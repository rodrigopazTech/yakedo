import { siguienteCuenta, type CuentaDocumento, type EstadoCuentaPey, type NegocioGuardado, type Privado } from "./cuenta.ts"
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
    if (this.webhooks.has(id)) return "repetido"
    this.webhooks.set(id, tipo)
    if (eventoCobro !== null) this.cobros.set(id, eventoCobro)
    return "nuevo"
  }

  clabeDe(clabe: string): string | undefined {
    return this.clabes.get(clabe)
  }

  eventosCobro(): ReadonlyMap<string, unknown> {
    return this.cobros
  }
}
