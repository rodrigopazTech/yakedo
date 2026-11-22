import { FirebaseError } from "firebase/app"
import {
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  deleteUser,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateEmail,
  type Auth,
  type AuthCredential,
  type User,
  type UserCredential,
} from "firebase/auth"
import { clasificarErrorCodigo } from "./codigo.ts"
import type {
  MetodoEntrada,
  ResultadoCodigo,
  ResultadoCorreo,
  ResultadoGoogle,
  ServicioAuth,
  UsuarioSesion,
} from "./tipos.ts"

export interface OpcionesServicio {
  /** Sustituye el envío con reCAPTCHA. Las pruebas del emulador lo usan. */
  enviarCodigo?: (telefonoE164: string) => Promise<string>
  /** Sustituye la ventana de Google. Las pruebas pasan una credencial del emulador. */
  solicitarGoogle?: () => Promise<UserCredential>
}

const verificadores = new WeakMap<Auth, RecaptchaVerifier>()

function codigoDe(error: unknown): string {
  if (error instanceof FirebaseError) return error.code
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code
  }
  return ""
}

function correoDelError(error: unknown): string | null {
  if (typeof error !== "object" || !error || !("customData" in error)) return null
  const datos = error.customData
  if (typeof datos !== "object" || !datos || !("email" in datos)) return null
  return typeof datos.email === "string" ? datos.email : null
}

export function mapearUsuario(usuario: User): UsuarioSesion {
  const proveedores: MetodoEntrada[] = []
  for (const dato of usuario.providerData) {
    if (dato.providerId === "phone") proveedores.push("telefono")
    if (dato.providerId === "google.com") proveedores.push("google")
  }
  return {
    uid: usuario.uid,
    telefono: usuario.phoneNumber,
    correo: usuario.email,
    correoVerificado: usuario.emailVerified,
    proveedores,
  }
}

function resultadoDeErrorCodigo(error: unknown): ResultadoCodigo {
  const clase = clasificarErrorCodigo(codigoDe(error))
  if (clase === "incorrecto" || clase === "vencido") return { tipo: clase }
  return { tipo: "otro" }
}

async function enviarCodigoConRecaptcha(auth: Auth, telefonoE164: string): Promise<string> {
  const anterior = verificadores.get(auth)
  anterior?.clear()

  let contenedor = document.getElementById("yakedo-recaptcha")
  if (!contenedor) {
    contenedor = document.createElement("div")
    contenedor.id = "yakedo-recaptcha"
    contenedor.className = "recaptcha-invisible"
    document.body.append(contenedor)
  }

  const verificador = new RecaptchaVerifier(auth, contenedor, { size: "invisible" })
  verificadores.set(auth, verificador)

  try {
    const proveedor = new PhoneAuthProvider(auth)
    return await proveedor.verifyPhoneNumber(telefonoE164, verificador)
  } finally {
    verificador.clear()
    verificadores.delete(auth)
  }
}

export function crearServicioFirebase(auth: Auth, opciones: OpcionesServicio = {}): ServicioAuth {
  let credencialPendiente: AuthCredential | null = null
  let correoPendiente: string | null = null

  function guardarPendiente(error: unknown, respaldo?: AuthCredential): ResultadoGoogle | null {
    if (codigoDe(error) !== "auth/account-exists-with-different-credential") return null
    credencialPendiente =
      (error instanceof FirebaseError ? GoogleAuthProvider.credentialFromError(error) : null) ??
      respaldo ??
      null
    correoPendiente = correoDelError(error)
    return { tipo: "enlazar", correo: correoPendiente }
  }

  return {
    enviarCodigo(telefonoE164) {
      if (opciones.enviarCodigo) return opciones.enviarCodigo(telefonoE164)
      return enviarCodigoConRecaptcha(auth, telefonoE164)
    },

    async confirmarCodigo(verificacionId, codigo) {
      try {
        const credencial = PhoneAuthProvider.credential(verificacionId, codigo)
        const resultado = await signInWithCredential(auth, credencial)
        return { tipo: "sesion", usuario: mapearUsuario(resultado.user) }
      } catch (error) {
        return resultadoDeErrorCodigo(error)
      }
    },

    async entrarConGoogle() {
      try {
        const resultado = opciones.solicitarGoogle
          ? await opciones.solicitarGoogle()
          : await signInWithPopup(auth, proveedorGoogle())
        credencialPendiente = null
        correoPendiente = null
        return { tipo: "sesion", usuario: mapearUsuario(resultado.user) }
      } catch (error) {
        const enlace = guardarPendiente(error)
        if (enlace) return enlace
        throw error
      }
    },

    correoGooglePendiente() {
      return correoPendiente
    },

    async enlazarGooglePendiente() {
      const usuario = auth.currentUser
      if (!usuario || !credencialPendiente) return { tipo: "otro" }
      try {
        const resultado = await linkWithCredential(usuario, credencialPendiente)
        credencialPendiente = null
        correoPendiente = null
        return { tipo: "sesion", usuario: mapearUsuario(resultado.user) }
      } catch (error) {
        return resultadoDeErrorCodigo(error)
      }
    },

    async guardarCorreo(correo) {
      const usuario = auth.currentUser
      if (!usuario) throw new Error("No hay sesión para guardar el correo.")
      try {
        await updateEmail(usuario, correo)
        await usuario.reload()
        await sendEmailVerification(usuario)
        return { tipo: "guardado", usuario: mapearUsuario(usuario) }
      } catch (error) {
        if (codigoDe(error) === "auth/email-already-in-use") {
          await deleteUser(usuario)
          return { tipo: "ya-es-de-google" } satisfies ResultadoCorreo
        }
        throw error
      }
    },

    async reenviarAvisoCorreo() {
      const usuario = auth.currentUser
      if (!usuario) throw new Error("No hay sesión para enviar el aviso.")
      await sendEmailVerification(usuario)
    },

    async recargarUsuario() {
      const usuario = auth.currentUser
      if (!usuario) return null
      await usuario.reload()
      return mapearUsuario(usuario)
    },

    async confirmarVinculoTelefono(verificacionId, codigo) {
      const usuario = auth.currentUser
      if (!usuario) return { tipo: "otro" }
      try {
        const credencial = PhoneAuthProvider.credential(verificacionId, codigo)
        const resultado = await linkWithCredential(usuario, credencial)
        return { tipo: "sesion", usuario: mapearUsuario(resultado.user) }
      } catch (error) {
        return resultadoDeErrorCodigo(error)
      }
    },

    cerrarSesion() {
      return signOut(auth)
    },

    observar(oyente) {
      return onAuthStateChanged(auth, (usuario) => {
        oyente(usuario ? mapearUsuario(usuario) : null)
      })
    },
  }
}

function proveedorGoogle(): GoogleAuthProvider {
  const proveedor = new GoogleAuthProvider()
  proveedor.setCustomParameters({ prompt: "select_account" })
  return proveedor
}
