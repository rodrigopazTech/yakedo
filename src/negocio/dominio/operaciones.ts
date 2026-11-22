import { entidadPey, MAX_NOMBRE, MAX_NOMBRE_LEGAL, TEXTO_CLABE_IGUAL, TEXTO_CLABE_REPETIDA, TEXTO_PEY_ALTA, type TipoPersona } from "./alta.ts"
import { revisarClabe } from "./clabe.ts"
import { tramiteAbierto, type BloqueCuenta, type CuentaDocumento } from "./cuenta.ts"
import { leerPagoQr } from "../../cobro/pey-qr.ts"
import { ErrorPey, leerEventoPey, type ClientePey, type SolicitudCuenta } from "./pey.ts"
import type { RepositorioNegocio } from "./repositorio.ts"

export type CodigoError =
  | "datos"
  | "clabe-repetida"
  | "pey"
  | "cobro-activo"
  | "tramite"
  | "sin-negocio"
  | "ya-hay-negocio"
  | "sin-tramite"
  | "clabe-igual"
  | "sin-pedido"
  | "cerrado"
  | "sin-cuenta"

export class ErrorDeNegocio extends Error {
  readonly codigo: CodigoError

  constructor(codigo: CodigoError, message: string) {
    super(message)
    this.name = "ErrorDeNegocio"
    this.codigo = codigo
  }
}

export interface EntradaAlta {
  uid: string
  correo: string | null
  nombre: string
  nombreLegal: string
  tipoPersona: TipoPersona
  clabe: string
}

export interface EntradaCambio {
  uid: string
  clabe: string
}

function bloque(bankAccountId: string, clabe: ReturnType<typeof revisarClabe> & { tipo: "valida" }): BloqueCuenta {
  return {
    bankAccountId,
    estado: "PENDING",
    banco: clabe.clabe.banco,
    ultimos4: clabe.clabe.ultimos4,
    claveBanco: clabe.clabe.claveBanco,
  }
}

function validarDatos(entrada: EntradaAlta): { clabe: string; banco: string; ultimos4: string; claveBanco: string } {
  const nombre = entrada.nombre.trim()
  const legal = entrada.nombreLegal.trim()
  if (!nombre || Array.from(nombre).length > MAX_NOMBRE) {
    throw new ErrorDeNegocio("datos", "Escribe el nombre de tu negocio.")
  }
  if (!legal || Array.from(legal).length > MAX_NOMBRE_LEGAL) {
    throw new ErrorDeNegocio("datos", "Escribe el nombre legal.")
  }
  if (entrada.tipoPersona !== "fisica" && entrada.tipoPersona !== "moral") {
    throw new ErrorDeNegocio("datos", "Elige una opción.")
  }
  const revision = revisarClabe(entrada.clabe)
  if (revision.tipo !== "valida") throw new ErrorDeNegocio("datos", "Esta CLABE no es válida. Revísala.")
  return revision.clabe
}

function solicitud(entrada: EntradaAlta, clabe: string): SolicitudCuenta {
  return {
    alias: entrada.nombre.trim(),
    name: entrada.nombreLegal.trim(),
    clabe,
    entity: entidadPey(entrada.tipoPersona),
  }
}

export async function registrarNegocio(
  entrada: EntradaAlta,
  repo: RepositorioNegocio,
  pey: ClientePey,
): Promise<CuentaDocumento> {
  const clabe = validarDatos(entrada)
  const reserva = await repo.reservarClabe(clabe.clabe, entrada.uid)
  if (reserva === "ajena") throw new ErrorDeNegocio("clabe-repetida", TEXTO_CLABE_REPETIDA)

  const local = await repo.leer(entrada.uid)
  const actual = local.cuenta?.actual ?? null
  const puedeReintentar = !local.negocio || actual?.estado === "ERROR"
  if (!puedeReintentar) {
    if (reserva === "libre") await repo.liberarClabe(clabe.clabe, entrada.uid)
    throw new ErrorDeNegocio("ya-hay-negocio", "Ya diste de alta tu negocio.")
  }

  let creada
  try {
    creada = await pey.crearCuenta(solicitud(entrada, clabe.clabe))
  } catch (error) {
    if (reserva === "libre") await repo.liberarClabe(clabe.clabe, entrada.uid)
    if (error instanceof ErrorPey) throw new ErrorDeNegocio("pey", TEXTO_PEY_ALTA)
    throw new ErrorDeNegocio("pey", TEXTO_PEY_ALTA)
  }

  const cuenta: CuentaDocumento = {
    actual: {
      bankAccountId: creada.bankAccountId,
      estado: "PENDING",
      banco: clabe.banco,
      ultimos4: clabe.ultimos4,
      claveBanco: clabe.claveBanco,
    },
    nueva: null,
    seguirConActual: null,
  }
  await repo.guardarAlta({
    uid: entrada.uid,
    negocio: {
      nombre: entrada.nombre.trim(),
      nombreLegal: entrada.nombreLegal.trim(),
      tipoPersona: entrada.tipoPersona,
      correo: entrada.correo,
    },
    cuenta,
    privado: { clabeActual: clabe.clabe, clabeNueva: null },
    clabe: clabe.clabe,
    bankAccountIdAnterior: actual?.bankAccountId ?? null,
  })
  return cuenta
}

export async function cambiarClabe(
  entrada: EntradaCambio,
  repo: RepositorioNegocio,
  pey: ClientePey,
): Promise<CuentaDocumento> {
  const revision = revisarClabe(entrada.clabe)
  if (revision.tipo !== "valida") throw new ErrorDeNegocio("datos", "Esta CLABE no es válida. Revísala.")
  const local = await repo.leer(entrada.uid)
  if (!local.negocio || !local.cuenta?.actual) throw new ErrorDeNegocio("sin-negocio", "Todavía no hay negocio.")
  if (await repo.hayCobroActivo(entrada.uid)) {
    throw new ErrorDeNegocio("cobro-activo", "Hay un cobro activo. Espera a que se pague o venza para cambiar la cuenta.")
  }
  if (tramiteAbierto(local.cuenta)) throw new ErrorDeNegocio("tramite", "Hay una cuenta nueva en trámite.")
  if (local.privado?.clabeActual === revision.clabe.clabe) {
    throw new ErrorDeNegocio("clabe-igual", TEXTO_CLABE_IGUAL)
  }

  const reserva = await repo.reservarClabe(revision.clabe.clabe, entrada.uid)
  if (reserva === "ajena") throw new ErrorDeNegocio("clabe-repetida", TEXTO_CLABE_REPETIDA)

  const clabeQueSale = local.privado?.clabeNueva && local.cuenta.nueva?.estado === "ERROR" ? local.privado.clabeNueva : null
  let creada
  try {
    creada = await pey.crearCuenta({
      alias: local.negocio.nombre,
      name: local.negocio.nombreLegal,
      clabe: revision.clabe.clabe,
      entity: entidadPey(local.negocio.tipoPersona),
    })
  } catch (error) {
    if (reserva === "libre") await repo.liberarClabe(revision.clabe.clabe, entrada.uid)
    if (error instanceof ErrorPey) throw new ErrorDeNegocio("pey", TEXTO_PEY_ALTA)
    throw new ErrorDeNegocio("pey", TEXTO_PEY_ALTA)
  }

  const nueva = bloque(
    creada.bankAccountId,
    revision as typeof revision & { tipo: "valida" },
  )
  const cuenta: CuentaDocumento = {
    actual: local.cuenta.actual,
    nueva,
    seguirConActual: null,
  }
  await repo.guardarNueva({
    uid: entrada.uid,
    cuenta,
    privado: { clabeActual: local.privado?.clabeActual ?? null, clabeNueva: revision.clabe.clabe },
    clabe: revision.clabe.clabe,
    clabeLiberar: clabeQueSale && clabeQueSale !== revision.clabe.clabe ? clabeQueSale : null,
  })
  return cuenta
}

export async function elegirSeguirConActual(
  uid: string,
  seguir: boolean,
  repo: RepositorioNegocio,
): Promise<void> {
  const local = await repo.leer(uid)
  if (!tramiteAbierto(local.cuenta)) throw new ErrorDeNegocio("sin-tramite", "No hay una cuenta nueva en trámite.")
  await repo.fijarSeguir(uid, seguir)
}

export async function consultarCuenta(
  uid: string,
  repo: RepositorioNegocio,
  pey: ClientePey,
): Promise<CuentaDocumento> {
  let local = await repo.leer(uid)
  if (!local.cuenta) throw new ErrorDeNegocio("sin-negocio", "Todavía no hay negocio.")
  const pendientes = [local.cuenta.actual, local.cuenta.nueva].filter((bloque): bloque is BloqueCuenta => {
    if (!bloque) return false
    return bloque.estado !== "ACTIVE" || bloque === local.cuenta?.nueva
  })
  for (const item of pendientes) {
    const remoto = await pey.consultarCuenta(item.bankAccountId)
    if (remoto.estado === item.estado) continue
    const aplicado = await repo.aplicarEstado(item.bankAccountId, remoto.estado)
    if (aplicado) local = { ...local, cuenta: aplicado.cuenta }
  }
  if (!local.cuenta) throw new ErrorDeNegocio("sin-negocio", "Todavía no hay negocio.")
  return local.cuenta
}

export interface EntradaWebhook {
  id: string
  cuerpo: string
}

export async function recibirEvento(
  id: string,
  cuerpo: string,
  repo: RepositorioNegocio,
  ahora = Date.now(),
): Promise<"repetido" | "cuenta" | "ignorado" | "incompleto" | "normal" | "duplicado" | "no-esperado" | "ya-aplicado" | "sin-asignar"> {
  let json: unknown
  try {
    json = JSON.parse(cuerpo) as unknown
  } catch {
    return "incompleto"
  }
  const evento = leerEventoPey(json)
  if (evento.tipo === "bank.account.updated") {
    if (!evento.bankAccountId || !evento.estado) return "incompleto"
    const toma = await repo.tomarWebhook(id, evento.tipo, null)
    if (toma === "repetido") return "repetido"
    await repo.aplicarEstado(evento.bankAccountId, evento.estado)
    return "cuenta"
  }
  if (evento.tipo === "codi.qr.payment_received") {
    const pago = leerPagoQr(json)
    if (!pago) return "incompleto"
    return repo.resolverPagoQr(id, pago, ahora)
  }
  const toma = await repo.tomarWebhook(id, evento.tipo || "desconocido", null)
  if (toma === "repetido") return "repetido"
  return "ignorado"
}
