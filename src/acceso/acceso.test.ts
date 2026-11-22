import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { borrarMetodoEntrada, guardarMetodoEntrada, leerMetodoEntrada } from "./almacen-metodo.ts"
import {
  ESPERA_OTRO_CODIGO_MS,
  clasificarErrorCodigo,
  codigoCompleto,
  limitarCodigo,
  puedePedirOtroCodigo,
  textoDeEspera,
  textoDeErrorCodigo,
} from "./codigo.ts"
import { guardarCorreoEscrito, intentarCerrarSesion, pedirCodigo, pedirOtroCodigo } from "./flujo.ts"
import {
  aE164,
  formatearNumero,
  formatearTelefonoVisible,
  limitarNumero,
  validarNumero,
} from "./numero.ts"
import {
  decisionDeCierre,
  destinoTrasTelefono,
  debeEnlazarGoogle,
  leerCobroActivo,
  mismoNegocio,
  textoDeCierre,
  textoEntrasteCon,
} from "./sesion.ts"
import {
  PALABRAS_PROHIBIDAS,
  TEXTO_CIERRE_GOOGLE,
  TEXTO_CIERRE_NUMERO,
  TEXTO_CODIGO_INCORRECTO,
  TEXTO_CODIGO_VENCIDO,
  TEXTO_COBRO_ACTIVO,
  TEXTO_CORREO_INVALIDO,
  mensajeNumeroIncompleto,
  textoEsperaOtroCodigo,
} from "./textos.ts"
import type { ServicioAuth, UsuarioSesion } from "./tipos.ts"

const pantallas = readFileSync(new URL("./pantallas.tsx", import.meta.url), "utf8")
const acceso = readFileSync(new URL("./usar-acceso.ts", import.meta.url), "utf8")
const textosFuente = readFileSync(new URL("./textos.ts", import.meta.url), "utf8")
const firebase = readFileSync(new URL("../firebase.ts", import.meta.url), "utf8")
const estilos = readFileSync(new URL("../estilos.css", import.meta.url), "utf8")
const servicio = readFileSync(new URL("./servicio-firebase.ts", import.meta.url), "utf8")

function usuario(parcial: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return {
    uid: "uid-1",
    telefono: "+525512345678",
    correo: null,
    correoVerificado: false,
    proveedores: ["telefono"],
    ...parcial,
  }
}

function servicioFalso(parcial: Partial<ServicioAuth> = {}): ServicioAuth {
  return {
    enviarCodigo: () => Promise.reject(new Error("no debía enviar")),
    confirmarCodigo: () => Promise.reject(new Error("no debía confirmar")),
    entrarConGoogle: () => Promise.reject(new Error("no debía entrar con Google")),
    enlazarGooglePendiente: () => Promise.reject(new Error("no debía enlazar")),
    correoGooglePendiente: () => null,
    guardarCorreo: () => Promise.reject(new Error("no debía guardar")),
    reenviarAvisoCorreo: () => Promise.reject(new Error("no debía reenviar")),
    recargarUsuario: () => Promise.resolve(null),
    confirmarVinculoTelefono: () => Promise.reject(new Error("no debía vincular")),
    cerrarSesion: () => Promise.resolve(),
    observar: () => () => undefined,
    ...parcial,
  }
}

describe("número de teléfono", () => {
  it("deja el +52 fijo y acepta solo 10 números", () => {
    expect(limitarNumero("55 1234 5678 99")).toBe("5512345678")
    expect(limitarNumero("abc55")).toBe("55")
    expect(aE164("5512345678")).toBe("+525512345678")
    expect(formatearNumero("5512345678")).toBe("55 1234 5678")
    expect(formatearNumero("5512345")).toBe("55 1234 5")
  })

  it("«55 1234 5» son 7 números y faltan 3, sin mandar el SMS", async () => {
    expect(validarNumero("5512345")).toBe("Te faltan 3 números. Tu número es de 10.")
    expect(mensajeNumeroIncompleto(9)).toBe("Te falta 1 número. Tu número es de 10.")
    const pedido = await pedirCodigo(servicioFalso(), "5512345", 1_000)
    expect(pedido).toEqual({
      tipo: "incompleto",
      error: "Te faltan 3 números. Tu número es de 10.",
    })
  })

  it("muestra el teléfono con el prefijo visible", () => {
    expect(formatearTelefonoVisible("+525512345678")).toBe("+52 55 1234 5678")
  })
})

describe("código SMS", () => {
  it("usa 6 números y los textos aprobados", () => {
    expect(limitarCodigo("12-34567")).toBe("123456")
    expect(codigoCompleto("123456")).toBe(true)
    expect(textoDeErrorCodigo("incorrecto")).toBe(TEXTO_CODIGO_INCORRECTO)
    expect(textoDeErrorCodigo("vencido")).toBe(TEXTO_CODIGO_VENCIDO)
    expect(clasificarErrorCodigo("auth/invalid-verification-code")).toBe("incorrecto")
    expect(clasificarErrorCodigo("auth/invalid-code")).toBe("incorrecto")
    expect(clasificarErrorCodigo("auth/code-expired")).toBe("vencido")
    expect(clasificarErrorCodigo("auth/invalid-verification-id")).toBe("vencido")
    expect(clasificarErrorCodigo("auth/network-request-failed")).toBe("otro")
  })

  it("cuenta la espera y deja pedir otro código al terminar", async () => {
    const ahora = 10_000
    const esperaHasta = ahora + ESPERA_OTRO_CODIGO_MS
    expect(textoDeEspera(ahora + 24_000, esperaHasta)).toBe("Puedes pedir otro código en 0:06")
    expect(textoEsperaOtroCodigo(24_000)).toBe("Puedes pedir otro código en 0:24")
    expect(puedePedirOtroCodigo(ahora, esperaHasta)).toBe(false)

    let envios = 0
    const auth = servicioFalso({
      enviarCodigo: () => {
        envios += 1
        return Promise.resolve("verificacion")
      },
    })
    const temprano = await pedirOtroCodigo(auth, "5512345678", ahora, esperaHasta)
    expect(temprano.tipo).toBe("espera")
    expect(envios).toBe(0)

    const tarde = await pedirOtroCodigo(auth, "5512345678", esperaHasta, esperaHasta)
    expect(tarde).toEqual({
      tipo: "enviado",
      verificacionId: "verificacion",
      esperaHasta: esperaHasta + ESPERA_OTRO_CODIGO_MS,
    })
    expect(envios).toBe(1)
  })
})

describe("correo, Google y cierre", () => {
  it("pide correo si el teléfono no lo tiene y no lo vuelve a pedir si ya está", () => {
    expect(destinoTrasTelefono(usuario())).toBe("correo")
    expect(destinoTrasTelefono(usuario({ correo: "ana@comercio.mx" }))).toBe("dentro")
  })

  it("enlaza Google solo con el mismo correo ya confirmado", () => {
    const ana = usuario({ correo: "Ana@Comercio.mx", correoVerificado: true })
    expect(debeEnlazarGoogle(ana, "ana@comercio.mx")).toBe(true)
    expect(debeEnlazarGoogle(usuario({ correo: "ana@comercio.mx" }), "ana@comercio.mx")).toBe(false)
    expect(debeEnlazarGoogle(ana, "otra@comercio.mx")).toBe(false)
    expect(mismoNegocio("uid-1", "uid-1")).toBe(true)
    expect(mismoNegocio("uid-1", "uid-2")).toBe(false)
  })

  it("rechaza un correo incompleto sin llamar a Firebase", async () => {
    const resultado = await guardarCorreoEscrito(servicioFalso(), "ana")
    expect(resultado).toEqual({ tipo: "invalido", error: TEXTO_CORREO_INVALIDO })
  })

  it("con Google muestra Google y el correo", () => {
    const persona = usuario({
      correo: "ana@comercio.mx",
      telefono: "+525512345678",
      proveedores: ["telefono", "google"],
    })
    expect(textoEntrasteCon(persona, "google")).toBe("Google · ana@comercio.mx")
    expect(textoEntrasteCon(persona, "telefono")).toBe("+52 55 1234 5678")
  })

  it("usa el texto de cierre según cómo entró y bloquea un cobro activo", () => {
    expect(textoDeCierre("telefono")).toBe(TEXTO_CIERRE_NUMERO)
    expect(textoDeCierre("google")).toBe(TEXTO_CIERRE_GOOGLE)
    expect(leerCobroActivo("?cobroActivo=1")).toBe(true)
    expect(leerCobroActivo("")).toBe(false)
    expect(decisionDeCierre(true)).toEqual({ permitido: false, aviso: TEXTO_COBRO_ACTIVO })
    expect(intentarCerrarSesion(false)).toEqual({ permitido: true, aviso: null })
  })

  it("recuerda el método de esta sesión", () => {
    const memoria = new Map<string, string>()
    const almacen = {
      getItem: (clave: string) => memoria.get(clave) ?? null,
      setItem: (clave: string, valor: string) => {
        memoria.set(clave, valor)
      },
      removeItem: (clave: string) => {
        memoria.delete(clave)
      },
    }
    guardarMetodoEntrada(almacen, "uid-1", "google")
    expect(leerMetodoEntrada(almacen, "uid-1")).toBe("google")
    expect(leerMetodoEntrada(almacen, "uid-2")).toBeNull()
    borrarMetodoEntrada(almacen)
    expect(leerMetodoEntrada(almacen, "uid-1")).toBeNull()
  })
})

describe("diseño y sesión en el cliente", () => {
  it("no usa las palabras prohibidas en los textos visibles", () => {
    const visibles = [
      TEXTO_CODIGO_INCORRECTO,
      TEXTO_CODIGO_VENCIDO,
      TEXTO_CIERRE_NUMERO,
      TEXTO_CIERRE_GOOGLE,
      TEXTO_COBRO_ACTIVO,
      mensajeNumeroIncompleto(7),
      textoEsperaOtroCodigo(24_000),
    ]
    for (const palabra of PALABRAS_PROHIBIDAS) {
      expect(visibles.join(" ").toLowerCase().includes(palabra)).toBe(false)
    }
  })

  it("arma las pantallas aprobadas y deja provisional solo el correo mal escrito", () => {
    expect(pantallas).toContain("¿Cuál es tu número?")
    expect(pantallas).toContain("TEXTO_REENVIAR")
    expect(pantallas).toContain("TEXTO_CORREO_TITULO")
    expect(pantallas).toContain("TEXTO_CONFIRMA_TITULO")
    expect(pantallas).toContain("TEXTO_MISMA_CUENTA")
    expect(pantallas).toContain("TEXTO_CUENTAS_DISTINTAS")
    expect(pantallas).toContain("TEXTO_VINCULAR_TITULO")
    expect(pantallas).toContain("TEXTO_ENVIANDO")
    expect(pantallas).toContain("TEXTO_FALLO_ENVIO")
    expect(acceso).toContain("TEXTO_FALLO_VERIFICACION")
    expect(pantallas).toContain("TEXTO_SIN_RED_TITULO")
    expect(pantallas).toContain("TEXTO_ESLOGAN")
    expect(textosFuente).toContain("Reenviar código")
    expect(textosFuente).toContain("Cobras, cae, ya quedó.")
    expect(textosFuente).toContain("Lo usamos para avisarte y para entrar con Google.")
    expect(pantallas).toContain("Editar catálogo")
    expect(pantallas).not.toContain("Pedir otro código")
    expect(pantallas).not.toContain("Cafetería La Esquina")
    expect(pantallas).not.toContain("UI PROVISIONAL")
    expect(textosFuente).toContain("TEXTO PROVISIONAL: falta en Figma el correo mal escrito")
    expect(estilos).toContain("--sombra-dialogo: 0 8px 24px 0 rgba(28, 25, 21, 0.18)")
    expect(estilos).toContain("--sombra-toast: 0 6px 20px rgba(0, 0, 0, 0.2)")
  })

  it("guarda la sesión en el navegador y manda el reCAPTCHA invisible", () => {
    expect(firebase).toContain("browserLocalPersistence")
    expect(firebase).toContain("setPersistence")
    expect(firebase).toContain("appVerificationDisabledForTesting")
    expect(servicio).toContain('size: "invisible"')
  })
})
