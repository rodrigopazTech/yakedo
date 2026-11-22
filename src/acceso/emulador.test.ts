import { spawn, type ChildProcess } from "node:child_process"
import { initializeApp } from "firebase/app"
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithCredential,
  signOut,
  type Auth,
} from "firebase/auth"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { confirmarCodigo, pedirCodigo } from "./flujo.ts"
import { aE164 } from "./numero.ts"
import { destinoTrasTelefono, mismoNegocio } from "./sesion.ts"
import { crearServicioFirebase } from "./servicio-firebase.ts"
import type { ServicioAuth } from "./tipos.ts"

const PROYECTO = "yakedo-pos"
const HOST = "http://127.0.0.1:9099"
const CLAVE = "demo-yakedo"

let proceso: ChildProcess | null = null
let loArrancamos = false
let auth: Auth
let consecutivo = 2_000
const googlePendiente = { correo: "", sub: "" }

function telefonoNuevo(): string {
  consecutivo += 1
  return `55${String(consecutivo).padStart(8, "0")}`
}

function tokenGoogle(correo: string, sub: string): string {
  return JSON.stringify({
    sub,
    email: correo,
    email_verified: true,
  })
}

async function emuladorResponde(): Promise<boolean> {
  try {
    const respuesta = await fetch(`${HOST}/emulator/v1/projects/${PROYECTO}/config`)
    return respuesta.ok
  } catch {
    return false
  }
}

async function esperarEmulador(): Promise<void> {
  const limite = Date.now() + 60_000
  while (Date.now() < limite) {
    if (await emuladorResponde()) return
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error("El emulador de Auth no respondió en 127.0.0.1:9099.")
}

async function borrarCuentas(): Promise<void> {
  const respuesta = await fetch(`${HOST}/emulator/v1/projects/${PROYECTO}/accounts`, {
    method: "DELETE",
  })
  if (!respuesta.ok) throw new Error(await respuesta.text())
  if (auth.currentUser) await signOut(auth)
}

async function codigoDel(telefonoE164: string): Promise<string> {
  const respuesta = await fetch(`${HOST}/emulator/v1/projects/${PROYECTO}/verificationCodes`)
  const datos = (await respuesta.json()) as {
    verificationCodes: { phoneNumber: string; code: string }[]
  }
  const encontrado = datos.verificationCodes.find((item) => item.phoneNumber === telefonoE164)
  if (!encontrado) throw new Error(`No hay código para ${telefonoE164}.`)
  return encontrado.code
}

async function confirmarAviso(correo: string): Promise<void> {
  const respuesta = await fetch(`${HOST}/emulator/v1/projects/${PROYECTO}/oobCodes`)
  const datos = (await respuesta.json()) as {
    oobCodes: { email: string; oobCode: string; requestType: string }[]
  }
  const aviso = [...datos.oobCodes]
    .reverse()
    .find((item) => item.email === correo && item.requestType === "VERIFY_EMAIL")
  if (!aviso) throw new Error(`No hay aviso para ${correo}.`)
  const actualizacion = await fetch(
    `${HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=${CLAVE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: aviso.oobCode }),
    },
  )
  if (!actualizacion.ok) throw new Error(await actualizacion.text())
}

function crearServicio(): ServicioAuth {
  return crearServicioFirebase(auth, {
    enviarCodigo: async (telefonoE164) => {
      const respuesta = await fetch(
        `${HOST}/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${CLAVE}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: telefonoE164 }),
        },
      )
      if (!respuesta.ok) throw new Error(await respuesta.text())
      const datos = (await respuesta.json()) as { sessionInfo: string }
      return datos.sessionInfo
    },
    solicitarGoogle: () =>
      signInWithCredential(
        auth,
        GoogleAuthProvider.credential(tokenGoogle(googlePendiente.correo, googlePendiente.sub)),
      ),
  })
}

function entrarConGoogle(servicio: ServicioAuth, correo: string, sub: string) {
  googlePendiente.correo = correo
  googlePendiente.sub = sub
  return servicio.entrarConGoogle()
}

async function entrarConTelefono(servicio: ServicioAuth, digitos: string) {
  const pedido = await pedirCodigo(servicio, digitos, Date.now())
  if (pedido.tipo !== "enviado") throw new Error(pedido.tipo)
  const codigo = await codigoDel(aE164(digitos))
  const resultado = await confirmarCodigo(servicio, pedido.verificacionId, codigo)
  if (resultado.tipo !== "sesion") throw new Error(resultado.tipo)
  return resultado.usuario
}

beforeAll(async () => {
  if (!(await emuladorResponde())) {
    loArrancamos = true
    proceso = spawn(
      "npx",
      ["firebase", "emulators:start", "--only", "auth", "--project", PROYECTO],
      {
        cwd: "/workspace",
        detached: true,
        stdio: "ignore",
        env: { ...process.env, CI: "1" },
      },
    )
    await esperarEmulador()
  }

  const app = initializeApp(
    {
      apiKey: CLAVE,
      authDomain: "localhost",
      projectId: PROYECTO,
    },
    "acceso-emulador",
  )
  auth = getAuth(app)
  connectAuthEmulator(auth, HOST, { disableWarnings: true })
  auth.settings.appVerificationDisabledForTesting = true
}, 90_000)

beforeEach(async () => {
  await borrarCuentas()
})

afterAll(async () => {
  if (auth.currentUser) await signOut(auth).catch(() => undefined)
  if (loArrancamos && proceso?.pid) {
    process.kill(-proceso.pid, "SIGINT")
  }
})

describe("emulador de Auth", () => {
  it("no manda el SMS si el número está incompleto y entra con el código real", async () => {
    const servicio = crearServicio()
    let envios = 0
    const vigilado = crearServicioFirebase(auth, {
      enviarCodigo: async (telefono) => {
        envios += 1
        return servicio.enviarCodigo(telefono)
      },
    })
    const incompleto = await pedirCodigo(vigilado, "5512345", Date.now())
    expect(incompleto.tipo).toBe("incompleto")
    expect(envios).toBe(0)

    const digitos = telefonoNuevo()
    const usuario = await entrarConTelefono(vigilado, digitos)
    expect(usuario.telefono).toBe(aE164(digitos))
    expect(destinoTrasTelefono(usuario)).toBe("correo")
  })

  it("rechaza un código distinto y una sesión que ya no existe", async () => {
    const servicio = crearServicio()
    const digitos = telefonoNuevo()
    const pedido = await pedirCodigo(servicio, digitos, Date.now())
    if (pedido.tipo !== "enviado") throw new Error(pedido.tipo)
    const bueno = await codigoDel(aE164(digitos))
    const malo = bueno === "000000" ? "111111" : "000000"

    const incorrecto = await confirmarCodigo(servicio, pedido.verificacionId, malo)
    expect(incorrecto.tipo).toBe("incorrecto")

    const vencido = await confirmarCodigo(servicio, "sesion-que-no-existe", bueno)
    expect(vencido.tipo).toBe("vencido")

    const sesion = await confirmarCodigo(servicio, pedido.verificacionId, bueno)
    expect(sesion.tipo).toBe("sesion")
  })

  it("enlaza Google al mismo uid cuando el correo ya está confirmado", async () => {
    const correo = "mismo@comercio.mx"
    const servicio = crearServicio()
    const telefono = await entrarConTelefono(servicio, telefonoNuevo())
    const guardado = await servicio.guardarCorreo(correo)
    expect(guardado.tipo).toBe("guardado")
    await confirmarAviso(correo)
    const fresco = await servicio.recargarUsuario()
    expect(fresco?.correoVerificado).toBe(true)

    const google = await entrarConGoogle(servicio, correo, `google-${correo}`)
    expect(google.tipo).toBe("sesion")
    if (google.tipo !== "sesion") return
    expect(mismoNegocio(google.usuario.uid, telefono.uid)).toBe(true)
    expect(google.usuario.proveedores).toContain("google")
    expect(google.usuario.telefono).toBe(telefono.telefono)
  })

  it("deja dos negocios si los correos son distintos", async () => {
    const servicio = crearServicio()
    const telefono = await entrarConTelefono(servicio, telefonoNuevo())
    await servicio.guardarCorreo("ana@comercio.mx")
    const google = await entrarConGoogle(servicio, "otro@comercio.mx", "google-otro")
    expect(google.tipo).toBe("sesion")
    if (google.tipo !== "sesion") return
    expect(mismoNegocio(google.usuario.uid, telefono.uid)).toBe(false)
    expect(google.usuario.correo).toBe("otro@comercio.mx")
  })

  it("no abre un segundo negocio si Google ya tenía ese correo", async () => {
    const correo = "primero@comercio.mx"
    const servicio = crearServicio()
    const google = await entrarConGoogle(servicio, correo, "google-primero")
    expect(google.tipo).toBe("sesion")
    if (google.tipo !== "sesion") return
    await servicio.cerrarSesion()

    const digitos = telefonoNuevo()
    const telefono = await entrarConTelefono(servicio, digitos)
    expect(mismoNegocio(telefono.uid, google.usuario.uid)).toBe(false)
    const choque = await servicio.guardarCorreo(correo)
    expect(choque.tipo).toBe("ya-es-de-google")
    expect(auth.currentUser).toBeNull()

    const deNuevo = await entrarConGoogle(servicio, correo, "google-primero")
    expect(deNuevo.tipo).toBe("sesion")
    if (deNuevo.tipo !== "sesion") return
    expect(deNuevo.usuario.uid).toBe(google.usuario.uid)

    const pedido = await pedirCodigo(servicio, digitos, Date.now())
    if (pedido.tipo !== "enviado") throw new Error(pedido.tipo)
    const codigo = await codigoDel(aE164(digitos))
    const vinculo = await servicio.confirmarVinculoTelefono(pedido.verificacionId, codigo)
    expect(vinculo.tipo).toBe("sesion")
    if (vinculo.tipo !== "sesion") return
    expect(vinculo.usuario.uid).toBe(google.usuario.uid)
    expect(vinculo.usuario.telefono).toBe(aE164(digitos))
    expect(vinculo.usuario.correo).toBe(correo)
  })

  it("no vuelve a pedir el correo si ya está guardado", async () => {
    const servicio = crearServicio()
    const digitos = telefonoNuevo()
    const primero = await entrarConTelefono(servicio, digitos)
    const guardado = await servicio.guardarCorreo("guardado@comercio.mx")
    expect(guardado.tipo).toBe("guardado")
    await servicio.cerrarSesion()

    const segundo = await entrarConTelefono(servicio, digitos)
    expect(segundo.uid).toBe(primero.uid)
    expect(segundo.correo).toBe("guardado@comercio.mx")
    expect(destinoTrasTelefono(segundo)).toBe("dentro")
  })

  it("cierra la sesión sin borrar la cuenta y deja volver con el mismo uid", async () => {
    const servicio = crearServicio()
    const digitos = telefonoNuevo()
    const primero = await entrarConTelefono(servicio, digitos)
    await servicio.cerrarSesion()
    expect(auth.currentUser).toBeNull()

    const segundo = await entrarConTelefono(servicio, digitos)
    expect(segundo.uid).toBe(primero.uid)
  })
})
