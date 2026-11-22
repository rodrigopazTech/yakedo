import { describe, expect, it } from "vitest"
import { ayudaClabeValida, entidadPey, vistaAlta, TEXTO_CLABE_REPETIDA, TEXTO_NOMBRE_LIMITE, TEXTO_NOMBRE_VACIO } from "./alta.ts"
import { completarClabe, formatearClabe, revisarClabe } from "./clabe.ts"
import { codiDisponible, motivoCobroApagado, puedeCambiarClabe, type BloqueCuenta, type CuentaDocumento } from "./cuenta.ts"
import { verificarFirma, hmacSha256 } from "./firma.ts"
import { MemoriaNegocio } from "./memoria.ts"
import { cambiarClabe, consultarCuenta, elegirSeguirConActual, ErrorDeNegocio, recibirEvento, registrarNegocio } from "./operaciones.ts"
import { crearClientePey, PEY_BASE, type ClientePey } from "./pey.ts"

const SECRETO = "whsec_" + btoa("secreto-de-prueba-yakedo")

function bloque(estado: BloqueCuenta["estado"], id = "ba_1", banco = "BBVA México", ultimos = "7893"): BloqueCuenta {
  return { bankAccountId: id, estado, banco, ultimos4: ultimos, claveBanco: "012" }
}

function cuenta(parcial: Partial<CuentaDocumento> & Pick<CuentaDocumento, "actual">): CuentaDocumento {
  return { nueva: null, seguirConActual: null, ...parcial }
}

function peyFalso(opciones?: { status?: number; id?: string; estado?: string; cuerpo?: unknown }): ClientePey & { llamadas: { url: string; body: unknown }[] } {
  const llamadas: { url: string; body: unknown }[] = []
  const fetchMock: typeof fetch = async (entrada, init) => {
    const url = String(entrada)
    const body = init?.body ? JSON.parse(String(init.body)) as unknown : null
    llamadas.push({ url, body })
    if ((opciones?.status ?? 200) >= 400) {
      return new Response(JSON.stringify({ message: "no" }), { status: opciones?.status ?? 400 })
    }
    if (url.includes("/bank-account/") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(opciones?.cuerpo ?? { status: opciones?.estado ?? "ACTIVE", bankAccountId: "ba_1" }))
    }
    return new Response(JSON.stringify(opciones?.cuerpo ?? { bankAccountId: opciones?.id ?? "ba_1" }))
  }
  const cliente = crearClientePey({ apiKey: "llave-de-prueba", fetch: fetchMock, baseUrl: PEY_BASE })
  return Object.assign(cliente, { llamadas })
}

const alta = {
  uid: "ana",
  correo: "ana@comercio.mx",
  nombre: "Cafetería La Esquina",
  nombreLegal: "María Guadalupe Hernández López",
  tipoPersona: "fisica" as const,
  clabe: completarClabe("01218000123456789"),
}

describe("CLABE", () => {
  it("acepta 18 números con banco y dígito de control", () => {
    const clabe = completarClabe("01218000123456789")
    const revision = revisarClabe(clabe)
    expect(revision.tipo).toBe("valida")
    if (revision.tipo !== "valida") return
    expect(revision.clabe.banco).toBe("BBVA México")
    expect(formatearClabe(clabe).startsWith("012 180")).toBe(true)
  })

  it("rechaza el dígito mal y un banco que no está en la lista", () => {
    const buena = completarClabe("01218000123456789")
    expect(revisarClabe(`${buena.slice(0, 17)}0`).tipo).toBe("invalida")
    expect(revisarClabe(completarClabe("99918000123456789")).tipo).toBe("invalida")
  })

  it("arma la ayuda del alta", () => {
    const base = { clabe: "", nombre: "", nombreLegal: "", tipoPersona: null, intento: false, clabeRepetida: false }
    const incompleta = vistaAlta({ ...base, clabe: "012180001234567", intento: true })
    expect(incompleta.ayudaClabe).toBe("Faltan 3 números (15 de 18).")
    expect(incompleta.puedeContinuar).toBe(false)
    const vacio = vistaAlta({ ...base, intento: true, clabe: completarClabe("01218000123456789"), nombreLegal: "María", tipoPersona: "fisica" })
    expect(vacio.ayudaNombre).toBe(TEXTO_NOMBRE_VACIO)
    const limite = "A".repeat(40)
    expect(vistaAlta({ ...base, nombre: limite }).ayudaNombre).toBe(TEXTO_NOMBRE_LIMITE)
    const valida = vistaAlta({
      ...base,
      clabe: completarClabe("01432055667788901"),
      nombre: "Cafetería La Esquina",
      nombreLegal: "María",
      tipoPersona: "fisica",
    })
    expect(valida.ayudaClabe).toBe(ayudaClabeValida("Santander"))
    expect(valida.puedeContinuar).toBe(true)
    expect(vistaAlta({ ...base, clabeRepetida: true, clabe: completarClabe("01218000123456789") }).ayudaClabe).toBe(TEXTO_CLABE_REPETIDA)
  })
})

describe("registrar y cambiar con Pey simulado", () => {
  it("manda alias, name, clabe y PERSON, sin RFC", async () => {
    const pey = peyFalso()
    const repo = new MemoriaNegocio()
    const cuenta = await registrarNegocio(alta, repo, pey)
    expect(cuenta.actual?.estado).toBe("PENDING")
    expect(cuenta.actual?.bankAccountId).toBe("ba_1")
    expect(pey.llamadas[0]?.url).toBe(`${PEY_BASE}/bank-account`)
    expect(pey.llamadas[0]?.body).toEqual({
      alias: alta.nombre,
      name: alta.nombreLegal,
      clabe: alta.clabe,
      entity: "PERSON",
    })
    expect(entidadPey("moral")).toBe("BUSINESS")
    expect(pey.llamadas[0]?.body).toBeTruthy()
    expect(codiDisponible(cuenta)).toBe(false)
  })

  it("no llama a Pey si la CLABE ya es de otro negocio", async () => {
    const pey = peyFalso()
    const repo = new MemoriaNegocio()
    await repo.reservarClabe(alta.clabe, "otro")
    await expect(registrarNegocio(alta, repo, pey)).rejects.toMatchObject({
      codigo: "clabe-repetida",
      message: TEXTO_CLABE_REPETIDA,
    })
    expect(pey.llamadas).toHaveLength(0)
    expect((await repo.leer("ana")).negocio).toBeNull()
  })

  it("si Pey rechaza, no deja el negocio y se puede reintentar", async () => {
    const repo = new MemoriaNegocio()
    const mal = peyFalso({ status: 422 })
    await expect(registrarNegocio(alta, repo, mal)).rejects.toBeInstanceOf(ErrorDeNegocio)
    expect((await repo.leer("ana")).negocio).toBeNull()
    const bien = peyFalso({ id: "ba_2" })
    const cuenta = await registrarNegocio(alta, repo, bien)
    expect(cuenta.actual?.bankAccountId).toBe("ba_2")
  })

  it("persona moral manda BUSINESS", async () => {
    const pey = peyFalso()
    await registrarNegocio({ ...alta, tipoPersona: "moral" }, new MemoriaNegocio(), pey)
    expect(pey.llamadas[0]?.body).toMatchObject({ entity: "BUSINESS" })
  })

  it("cambia la CLABE sin quitar la actual y solo una vez", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_actual", cuerpo: { bankAccountId: "ba_actual" } }))
    await repo.aplicarEstado("ba_actual", "ACTIVE")
    const nueva = completarClabe("01432055667788901")
    const pey = peyFalso({ id: "ba_nueva" })
    const cuenta = await cambiarClabe({ uid: "ana", clabe: nueva }, repo, pey)
    expect(cuenta.actual?.bankAccountId).toBe("ba_actual")
    expect(cuenta.nueva?.estado).toBe("PENDING")
    expect(cuenta.nueva?.banco).toBe("Santander")
    expect(pey.llamadas[0]?.body).toMatchObject({ clabe: nueva })
    expect(codiDisponible(cuenta)).toBe(false)
    await elegirSeguirConActual("ana", true, repo)
    expect(codiDisponible((await repo.leer("ana")).cuenta)).toBe(true)
    await expect(cambiarClabe({ uid: "ana", clabe: completarClabe("02118000123456789") }, repo, pey)).rejects.toMatchObject({
      codigo: "tramite",
    })
    expect(pey.llamadas).toHaveLength(1)
  })

  it("solo efectivo apaga CoDi hasta que la nueva queda ACTIVE", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_actual" }))
    await repo.aplicarEstado("ba_actual", "ACTIVE")
    await cambiarClabe({ uid: "ana", clabe: completarClabe("01432055667788901") }, repo, peyFalso({ id: "ba_nueva" }))
    await elegirSeguirConActual("ana", false, repo)
    expect(motivoCobroApagado((await repo.leer("ana")).cuenta)).toBe("tramite")
    const aviso = await repo.aplicarEstado("ba_nueva", "ACTIVE")
    expect(aviso?.aviso).toBe("nueva-activa")
    expect(aviso?.cuenta.actual?.banco).toBe("Santander")
    expect(aviso?.cuenta.nueva).toBeNull()
    expect(codiDisponible(aviso?.cuenta ?? null)).toBe(true)
    expect(repo.clabeDe(alta.clabe)).toBeUndefined()
  })

  it("si la cuenta nueva falla, sigue la actual", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_actual" }))
    await repo.aplicarEstado("ba_actual", "ACTIVE")
    await cambiarClabe({ uid: "ana", clabe: completarClabe("01432055667788901") }, repo, peyFalso({ id: "ba_nueva" }))
    await elegirSeguirConActual("ana", true, repo)
    const aviso = await repo.aplicarEstado("ba_nueva", "ERROR")
    expect(aviso?.aviso).toBe("nueva-error")
    expect(aviso?.cuenta.actual?.bankAccountId).toBe("ba_actual")
    expect(codiDisponible(aviso?.cuenta ?? null)).toBe(true)
    expect(puedeCambiarClabe(aviso?.cuenta ?? null, false)).toBe("ok")
  })

  it("bloquea el cambio con un cobro activo y no llama a Pey", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_actual" }))
    await repo.aplicarEstado("ba_actual", "ACTIVE")
    repo.cobroActivo.add("ana")
    const pey = peyFalso()
    await expect(cambiarClabe({ uid: "ana", clabe: completarClabe("01432055667788901") }, repo, pey)).rejects.toMatchObject({
      codigo: "cobro-activo",
    })
    expect(pey.llamadas).toHaveLength(0)
  })

  it("consulta GET /bank-account/:id y guarda ACTIVE", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_1" }))
    const pey = peyFalso({ estado: "ACTIVE" })
    const cuenta = await consultarCuenta("ana", repo, pey)
    expect(pey.llamadas[0]?.url).toBe(`${PEY_BASE}/bank-account/ba_1`)
    expect(cuenta.actual?.estado).toBe("ACTIVE")
    expect(codiDisponible(cuenta)).toBe(true)
  })

  it("CoDi sigue apagado en PROCESSING y ERROR de la primera cuenta", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_1" }))
    await repo.aplicarEstado("ba_1", "PROCESSING")
    expect(codiDisponible((await repo.leer("ana")).cuenta)).toBe(false)
    await repo.aplicarEstado("ba_1", "ERROR")
    expect(codiDisponible((await repo.leer("ana")).cuenta)).toBe(false)
    expect(motivoCobroApagado((await repo.leer("ana")).cuenta)).toBe("primera")
  })
})

describe("webhook", () => {
  async function firmado(cuerpo: string, id = "msg_1", secreto = SECRETO) {
    const marca = String(Math.floor(Date.now() / 1000))
    const firma = await hmacSha256(secreto, `${id}.${marca}.${cuerpo}`)
    return { id, marca, firma: `v1,${firma}`, cuerpo }
  }

  it("acepta la firma sobre el cuerpo crudo y rechaza otra", async () => {
    const cuerpo = JSON.stringify({ type: "bank.account.updated", data: { bankAccountId: "ba_1", status: "ACTIVE" } })
    const bueno = await firmado(cuerpo)
    expect(await verificarFirma({ ...bueno, secreto: SECRETO, ahora: Date.now() })).toEqual({ ok: true })
    const tocado = cuerpo.replace("ACTIVE", "ERROR")
    expect((await verificarFirma({ ...bueno, cuerpo: tocado, secreto: SECRETO, ahora: Date.now() })).ok).toBe(false)
  })

  it("activa la cuenta una sola vez por webhook-id", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_1" }))
    const cuerpo = JSON.stringify({ type: "bank.account.updated", data: { bankAccountId: "ba_1", status: "ACTIVE" } })
    expect(await recibirEvento("msg_1", cuerpo, repo)).toBe("cuenta")
    expect((await repo.leer("ana")).cuenta?.actual?.estado).toBe("ACTIVE")
    expect(await recibirEvento("msg_1", cuerpo, repo)).toBe("repetido")
  })

  it("guarda el cobro sin tocar la cuenta y responde ignorado a otro evento", async () => {
    const repo = new MemoriaNegocio()
    await registrarNegocio(alta, repo, peyFalso({ id: "ba_1" }))
    const antes = (await repo.leer("ana")).cuenta?.actual?.estado
    const pago = JSON.stringify({ type: "codi.qr.payment_received", data: { codiQrId: "qr_1" } })
    expect(await recibirEvento("pago_1", pago, repo)).toBe("cobro")
    expect(repo.eventosCobro().get("pago_1")).toMatchObject({ codiQrId: "qr_1" })
    expect((await repo.leer("ana")).cuenta?.actual?.estado).toBe(antes)
    expect(await recibirEvento("otro", JSON.stringify({ type: "payment_link.status_updated", data: {} }), repo)).toBe("ignorado")
    expect(repo.eventosCobro().has("otro")).toBe(false)
  })
})

describe("cuenta de cobro", () => {
  it("la primera cuenta fuera de ACTIVE no cobra con CoDi", () => {
    expect(codiDisponible(cuenta({ actual: bloque("PENDING") }))).toBe(false)
    expect(codiDisponible(cuenta({ actual: bloque("PROCESSING") }))).toBe(false)
    expect(codiDisponible(cuenta({ actual: bloque("ERROR") }))).toBe(false)
    expect(codiDisponible(cuenta({ actual: bloque("ACTIVE") }))).toBe(true)
  })

  it("un cambio en trámite respeta la elección", () => {
    const base = cuenta({
      actual: bloque("ACTIVE"),
      nueva: bloque("PENDING", "ba_2", "Santander", "9012"),
      seguirConActual: null,
    })
    expect(codiDisponible(base)).toBe(false)
    expect(codiDisponible({ ...base, seguirConActual: true })).toBe(true)
    expect(puedeCambiarClabe(base, false)).toBe("tramite")
    expect(puedeCambiarClabe(cuenta({ actual: bloque("ACTIVE") }), true)).toBe("cobro")
  })
})
