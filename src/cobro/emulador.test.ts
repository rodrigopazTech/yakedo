import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import { promisify } from "node:util"
import { beforeAll, describe, expect, it } from "vitest"
import { aplicarPago, type Registro, type TxCobro } from "./resolucion.ts"
import type { PagoQr } from "./pey-qr.ts"

const ejecutar = promisify(execFile)

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
process.env.GCLOUD_PROJECT = "yakedo-pos"

const require = createRequire(new URL("../../functions/package.json", import.meta.url))
const { initializeApp, getApps } = require("firebase-admin/app") as {
  initializeApp: (opciones: { projectId: string }) => void
  getApps: () => unknown[]
}
const { getFirestore, Timestamp } = require("firebase-admin/firestore") as {
  getFirestore: () => AdminDb
  Timestamp: { fromMillis: (ms: number) => unknown }
}

interface AdminSnap {
  exists: boolean
  data: () => Registro | undefined
  get: (campo: string) => unknown
}

interface AdminRef {
  path: string
  get: () => Promise<AdminSnap>
  set: (datos: Registro) => Promise<unknown>
}

interface AdminTx {
  get: (ref: AdminRef) => Promise<AdminSnap>
  set: (ref: AdminRef, datos: Registro) => void
  update: (ref: AdminRef, datos: Registro) => void
}

interface AdminDb {
  doc: (ruta: string) => AdminRef
  runTransaction: <T>(trabajo: (tx: AdminTx) => Promise<T>) => Promise<T>
}

function plano(valor: unknown): unknown {
  if (valor && typeof valor === "object" && "toMillis" in valor && typeof (valor as { toMillis: () => number }).toMillis === "function") {
    return (valor as { toMillis: () => number }).toMillis()
  }
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

function txDe(tx: AdminTx): TxCobro {
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

const AHORA = Date.parse("2026-11-22T18:41:00.000Z")
let db: AdminDb

function pago(transactionId: string): PagoQr {
  return {
    codiQrId: "qr_carrera",
    amountCentavos: 12200,
    bankAccountId: "ba_ana",
    datePaidMs: AHORA,
    transactionId,
    numRef: null,
    concept: null,
    metadata: { negocioId: "ana-emu", pedidoId: "carrera", cobroId: "c1" },
  }
}

beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "yakedo-pos" })
  db = getFirestore()
})

describe("transacciones en el emulador", () => {
  it("dos webhooks a la vez dejan un solo pago normal", async () => {
    const pedido = db.doc("negocios/ana-emu/pedidos/carrera")
    await pedido.set({ numero: 43, estado: "Pendiente", total: 12200, cobroActivoId: "c1" })
    await db.doc("negocios/ana-emu/pedidos/carrera/cobros/c1").set({
      codiQrId: "qr_carrera",
      qrString: "cadena",
      monto: 12200,
      creadoEn: Timestamp.fromMillis(AHORA),
      venceEn: Timestamp.fromMillis(AHORA + 360_000),
      estado: "vencido",
      pagosResumen: [],
    })
    await db.doc("cobrosQr/qr_carrera").set({ negocioId: "ana-emu", pedidoId: "carrera", cobroId: "c1" })

    const [a, b] = await Promise.all([
      db.runTransaction((tx) => aplicarPago(txDe(tx), "wh_a", pago("tx_a"), AHORA)),
      db.runTransaction((tx) => aplicarPago(txDe(tx), "wh_b", pago("tx_b"), AHORA)),
    ])
    expect([a, b].sort()).toEqual(["duplicado", "normal"])
    const cobro = await db.doc("negocios/ana-emu/pedidos/carrera/cobros/c1").get()
    const resumen = (plano(cobro.get("pagosResumen")) as { tipo: string }[]) ?? []
    expect(resumen.filter((item) => item.tipo === "normal")).toHaveLength(1)
    expect((await pedido.get()).get("estado")).toBe("Pagado")
    expect((await pedido.get()).get("metodo")).toBe("codi")
  })

  it("el efectivo y el webhook no dejan dos cobros normales", async () => {
    const pedido = db.doc("negocios/ana-emu/pedidos/mixto")
    await pedido.set({ numero: 44, estado: "Pendiente", total: 5000, cobroActivoId: "c2" })
    await db.doc("negocios/ana-emu/pedidos/mixto/cobros/c2").set({
      codiQrId: "qr_mixto",
      qrString: "cadena",
      monto: 5000,
      creadoEn: Timestamp.fromMillis(AHORA),
      venceEn: Timestamp.fromMillis(AHORA + 360_000),
      estado: "activo",
      pagosResumen: [],
    })
    await db.doc("cobrosQr/qr_mixto").set({ negocioId: "ana-emu", pedidoId: "mixto", cobroId: "c2" })
    const entrante: PagoQr = {
      codiQrId: "qr_mixto",
      amountCentavos: 5000,
      bankAccountId: null,
      datePaidMs: AHORA,
      transactionId: "tx_mix",
      numRef: null,
      concept: null,
      metadata: { negocioId: "ana-emu", pedidoId: "mixto", cobroId: "c2" },
    }
    const [efectivo, pagoRes] = await Promise.all([
      db.runTransaction(async (tx) => {
        const snap = await tx.get(pedido)
        if (snap.get("estado") === "Pagado") return "ya-pagado"
        tx.update(pedido, { estado: "Pagado", metodo: "efectivo", pagadoEn: Timestamp.fromMillis(AHORA) })
        return "pagado"
      }),
      db.runTransaction((tx) => aplicarPago(txDe(tx), "wh_mix", entrante, AHORA)),
    ])
    const guardado = await pedido.get()
    expect(guardado.get("estado")).toBe("Pagado")
    const resumen = (plano((await db.doc("negocios/ana-emu/pedidos/mixto/cobros/c2").get()).get("pagosResumen")) as { tipo: string }[]) ?? []
    const normales = resumen.filter((item) => item.tipo === "normal")
    if (guardado.get("metodo") === "efectivo") {
      expect(efectivo).toBe("pagado")
      expect(pagoRes).toBe("duplicado")
      expect(normales).toHaveLength(0)
    } else {
      expect(efectivo).toBe("ya-pagado")
      expect(pagoRes).toBe("normal")
      expect(normales).toHaveLength(1)
    }
  })

  it("siembra config/bancosCodi con el script y sin llaves", async () => {
    const { stdout } = await ejecutar(
      process.execPath,
      ["--experimental-strip-types", "scripts/sembrar-bancos-codi.ts"],
      {
        cwd: "/workspace",
        env: {
          ...process.env,
          FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
          GCLOUD_PROJECT: "yakedo-pos",
        },
      },
    )
    expect(stdout).toContain("config/bancosCodi")
    const doc = await db.doc("config/bancosCodi").get()
    expect(doc.get("actualizado")).toBe("2026-11-17")
    expect(doc.get("porConfirmar")).toEqual(["Banco del Bienestar"])
    expect(doc.get("noSirven")).toEqual(["Nu", "Mercado Pago", "Klar", "Stori", "Ualá"])
  })
})
