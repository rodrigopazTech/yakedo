import { readFileSync } from "node:fs"
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing"
import type { Firestore } from "firebase/firestore"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { formatoNumero } from "../venta/dominio.ts"
import { crearPedido } from "../venta/repositorio.ts"

const PROYECTO = "yakedo-pos"
let entorno: RulesTestEnvironment

async function esperarPuerto(puerto: number): Promise<void> {
  const limite = Date.now() + 90_000
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${puerto}`, { signal: AbortSignal.timeout(1500) })
      if (respuesta.status > 0) return
    } catch {
      // El emulador todavía arranca.
    }
    await new Promise((resolver) => setTimeout(resolver, 400))
  }
  throw new Error(`El emulador del puerto ${puerto} no respondió.`)
}

beforeAll(async () => {
  await esperarPuerto(8080)
  await esperarPuerto(9199)
  entorno = await initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync(new URL("../../storage.rules", import.meta.url), "utf8"),
    },
  })
}, 120_000)

afterAll(async () => {
  await entorno?.cleanup()
})

beforeEach(async () => {
  await entorno.clearFirestore()
  await entorno.clearStorage()
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore()
    await db.collection("negocios").doc("ana").set({
      nombre: "Cafetería La Esquina",
      nombreLegal: "María López",
      tipoPersona: "fisica",
      correo: "ana@comercio.mx",
    })
    await db.collection("negocios").doc("ana").collection("cuenta").doc("pey").set({
      actual: { estado: "PENDING", bankAccountId: "ba_1" },
      nueva: null,
      seguirConActual: null,
    })
    await db.collection("negocios").doc("ana").collection("categorias").doc("cafe").set({ nombre: "Café" })
    await db.collection("negocios").doc("ana").collection("pedidos").doc("p1").set({
      estado: "Pendiente",
      total: 1000,
    })
    await db.collection("negocios").doc("ana").collection("pedidos").doc("p1").collection("cobros").doc("c1").set({
      estado: "activo",
    })
    await db.collection("negocios").doc("ana").collection("pedidos").doc("con-cobro").set({
      estado: "Pendiente",
      cobroActivoId: "c1",
    })
    await db.collection("config").doc("bancosCodi").set({ bancos: ["BBVA México"] })
    await db.collection("clabes").doc("012180000000000000").set({ negocioId: "ana" })
    await db.collection("pagosSinAsignar").doc("x").set({ monto: 1 })
    await db.collection("negocios").doc("beto").set({ nombre: "Otro" })
  })
})

describe("reglas de Firestore y Storage", () => {
  it("deja leer y escribir el catálogo propio", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    await assertSucceeds(ana.collection("negocios").doc("ana").collection("categorias").doc("cafe").get())
    await assertSucceeds(
      ana.collection("negocios").doc("ana").collection("productos").doc("p").set({
        nombre: "Latte",
        precioCentavos: 4500,
        categoriaId: "cafe",
        agotadoEl: null,
        tieneFoto: false,
      }),
    )
  })

  it("rechaza a otro negocio y a quien no tiene sesión", async () => {
    const beto = entorno.authenticatedContext("beto").firestore()
    const nadie = entorno.unauthenticatedContext().firestore()
    await assertFails(beto.collection("negocios").doc("ana").collection("categorias").doc("cafe").get())
    await assertFails(beto.collection("negocios").doc("ana").collection("productos").doc("p").set({ nombre: "X" }))
    await assertFails(nadie.collection("negocios").doc("ana").get())
    await assertFails(nadie.collection("negocios").doc("ana").collection("categorias").doc("cafe").get())
  })

  it("no deja al cliente escribir cobros, pagos ni el estado de Pey", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    const pedido = ana.collection("negocios").doc("ana").collection("pedidos").doc("p1")
    await assertSucceeds(pedido.collection("cobros").doc("c1").get())
    await assertFails(pedido.collection("cobros").doc("c2").set({ estado: "pagado" }))
    await assertFails(pedido.collection("cobros").doc("c1").collection("pagos").doc("w").set({ tipo: "normal" }))
    await assertFails(ana.collection("pagosSinAsignar").doc("y").set({ monto: 2 }))
    await assertFails(ana.collection("pagosSinAsignar").doc("x").get())
    await assertFails(ana.collection("clabes").doc("012180000000000000").get())
    await assertFails(
      ana.collection("negocios").doc("ana").collection("cuenta").doc("pey").update({ "actual.estado": "ACTIVE" }),
    )
    await assertFails(pedido.update({ estado: "Pagado", metodo: "codi" }))
  })

  it("permite pagar en efectivo si el pedido no estaba pagado ni cancelado", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    const pedido = ana.collection("negocios").doc("ana").collection("pedidos").doc("p1")
    await assertSucceeds(pedido.update({ estado: "Pagado", metodo: "efectivo" }))
    await assertFails(pedido.update({ estado: "Pagado", metodo: "efectivo" }))
  })

  it("impide cancelar con un cobro activo y cambiar cobroActivoId", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    await assertFails(
      ana.collection("negocios").doc("ana").collection("pedidos").doc("con-cobro").update({ estado: "Cancelado" }),
    )
    await assertSucceeds(
      ana.collection("negocios").doc("ana").collection("pedidos").doc("p1").update({ estado: "Cancelado" }),
    )
    await assertFails(
      ana.collection("negocios").doc("ana").collection("pedidos").doc("p1").update({ cobroActivoId: "c9" }),
    )
  })

  it("deja leer config a una sesión y no escribirla", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    const nadie = entorno.unauthenticatedContext().firestore()
    await assertSucceeds(ana.collection("config").doc("bancosCodi").get())
    await assertFails(ana.collection("config").doc("bancosCodi").set({ bancos: [] }))
    await assertFails(nadie.collection("config").doc("bancosCodi").get())
  })

  it("deja editar el nombre del negocio y no el resto", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    await assertSucceeds(ana.collection("negocios").doc("ana").update({ nombre: "La Esquina" }))
    await assertFails(ana.collection("negocios").doc("ana").update({ nombre: "" }))
    await assertFails(ana.collection("negocios").doc("ana").update({ nombreLegal: "Otra" }))
    await assertFails(ana.collection("negocios").doc("ana").set({ nombre: "Nuevo" }))
  })

  it("deja la foto al dueño y la niega al resto", async () => {
    const ruta = "negocios/ana/productos/latte/foto"
    const archivo = new Uint8Array([1, 2, 3])
    const subir = (uid: string | null, destino: string) => {
      const storage = uid ? entorno.authenticatedContext(uid).storage() : entorno.unauthenticatedContext().storage()
      return Promise.resolve(storage.ref(destino).put(archivo))
    }
    await assertSucceeds(subir("ana", ruta))
    await assertSucceeds(entorno.authenticatedContext("ana").storage().ref(ruta).getMetadata())
    await assertFails(entorno.authenticatedContext("beto").storage().ref(ruta).getMetadata())
    await assertFails(entorno.unauthenticatedContext().storage().ref(ruta).getMetadata())
    await assertFails(subir("beto", ruta))
    await assertFails(subir("ana", "negocios/beto/productos/latte/foto"))
  })

  it("exige nombre de hasta 40 letras y precio en centavos", async () => {
    const ana = entorno.authenticatedContext("ana").firestore()
    const productos = ana.collection("negocios").doc("ana").collection("productos")
    const valido = { nombre: "Latte", precioCentavos: 4500, categoriaId: null, agotadoEl: null, tieneFoto: false }
    await assertFails(productos.doc("largo").set({ ...valido, nombre: "A".repeat(41) }))
    await assertFails(productos.doc("vacio").set({ ...valido, nombre: "" }))
    await assertFails(productos.doc("cero").set({ ...valido, precioCentavos: 0 }))
    await assertFails(productos.doc("decimal").set({ ...valido, precioCentavos: 10.5 }))
    await assertSucceeds(ana.collection("negocios").doc("ana").collection("categorias").doc("nueva").set({ nombre: "Bebidas" }))
    await assertFails(ana.collection("negocios").doc("ana").collection("categorias").doc("mala").set({ nombre: "A".repeat(41) }))
  })

  it("asigna números distintos a dos pedidos simultáneos", async () => {
    const compat = entorno.authenticatedContext("ana").firestore() as unknown as { _delegate: Firestore }
    const item = { productoId: "p", nombre: "Café americano", precioCentavos: 3500, cantidad: 2 }
    const [uno, dos] = await Promise.all([
      crearPedido(compat._delegate, "ana", [item]),
      crearPedido(compat._delegate, "ana", [{ ...item, nombre: "Tamal verde", precioCentavos: 2200, cantidad: 1 }]),
    ])
    expect(uno.numero).not.toBe(dos.numero)
    expect(formatoNumero(Math.min(uno.numero, dos.numero))).toBe("#0001")
    expect(formatoNumero(Math.max(uno.numero, dos.numero))).toBe("#0002")
  })

  it("deja cancelar cuando el cobro ya venció", async () => {
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      const pedido = contexto.firestore().collection("negocios").doc("ana").collection("pedidos").doc("vencido")
      await pedido.set({ estado: "Pendiente", cobroActivoId: "c1", total: 1000 })
      await pedido.collection("cobros").doc("c1").set({ estado: "activo", venceEn: new Date(Date.now() - 60_000) })
    })
    const ana = entorno.authenticatedContext("ana").firestore()
    await assertSucceeds(
      ana.collection("negocios").doc("ana").collection("pedidos").doc("vencido").update({ estado: "Cancelado" }),
    )
  })

  it("el emulador cargó las reglas", () => {
    expect(entorno.projectId).toBe(PROYECTO)
  })
})
