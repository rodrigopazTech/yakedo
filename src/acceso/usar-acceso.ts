import { useEffect, useState } from "react"
import {
  borrarMetodoEntrada,
  guardarMetodoEntrada,
  leerMetodoEntrada,
  type AlmacenClave,
} from "./almacen-metodo.ts"
import { limitarCodigo, puedePedirOtroCodigo, textoDeErrorCodigo, textoDeEspera } from "./codigo.ts"
import {
  confirmarCodigo,
  entrarConGoogle,
  guardarCorreoEscrito,
  intentarCerrarSesion,
  pedirCodigo,
  pedirOtroCodigo,
} from "./flujo.ts"
import { limitarNumero, validarNumero } from "./numero.ts"
import { correoUtil, debeEnlazarGoogle, destinoTrasTelefono, inferirMetodo, textoDeCierre } from "./sesion.ts"
import {
  TEXTO_CODIGO_VENCIDO,
  TEXTO_CORREO_INVALIDO,
  TEXTO_FALLO_ENVIO,
  TEXTO_FALLO_VERIFICACION,
} from "./textos.ts"
import type { DialogoAcceso, MetodoEntrada, ServicioAuth, UsuarioSesion } from "./tipos.ts"

export type PasoAcceso =
  | { nombre: "cargando" }
  | { nombre: "bienvenida" }
  | { nombre: "numero"; digitos: string; error: string | null; vinculando: boolean }
  | {
      nombre: "codigo"
      digitos: string
      codigo: string
      error: string | null
      esperaHasta: number
      verificacionId: string
      vinculando: boolean
    }
  | { nombre: "correo"; valor: string; error: string | null }
  | { nombre: "confirma-correo"; valor: string }
  | { nombre: "dentro"; confirmarCierre: boolean }

export interface VistaAcceso {
  paso: PasoAcceso
  usuario: UsuarioSesion | null
  metodo: MetodoEntrada | null
  ocupado: boolean
  hayCobroActivo: boolean
  avisoCierre: string | null
  textoCierre: string | null
  textoEspera: string | null
  escribirNumero: (valor: string) => void
  enviarNumero: () => void
  regresarAlNumero: () => void
  escribirCodigo: (valor: string) => void
  pedirOtro: () => void
  entrarConNumero: () => void
  entrarConGoogle: () => void
  escribirCorreo: (valor: string) => void
  guardarCorreo: () => void
  reenviarAviso: () => void
  yaConfirmeAviso: () => void
  seguirDespuesDelAviso: () => void
  dialogo: DialogoAcceso | null
  cerrarDialogo: () => void
  continuarCoincidencia: () => void
  pedirCierre: () => void
  cancelarCierre: () => void
  confirmarCierre: () => void
  empezarVinculo: () => void
  volver: () => void
  faltaConfirmarCorreo: boolean
}

function almacenDelNavegador(): AlmacenClave | null {
  if (typeof localStorage === "undefined") return null
  return localStorage
}

function correoListo(valor: string): string | null {
  return correoUtil(valor) ? null : TEXTO_CORREO_INVALIDO
}

function textoErrorCodigo(tipo: "incorrecto" | "vencido" | "otro"): string {
  if (tipo === "otro") return TEXTO_FALLO_VERIFICACION
  return textoDeErrorCodigo(tipo)
}

export function useAcceso(servicio: ServicioAuth | null, hayCobroActivo: boolean): VistaAcceso {
  const [paso, setPaso] = useState<PasoAcceso>(
    servicio ? { nombre: "cargando" } : { nombre: "bienvenida" },
  )
  const [dialogo, setDialogo] = useState<DialogoAcceso | null>(null)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [metodo, setMetodo] = useState<MetodoEntrada | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [reloj, setReloj] = useState(() => Date.now())

  useEffect(() => {
    if (!servicio) return

    let primera = true
    return servicio.observar((entrante) => {
      if (!primera) return
      primera = false
      if (!entrante) {
        setUsuario(null)
        setPaso({ nombre: "bienvenida" })
        return
      }
      const metodoGuardado = leerMetodoEntrada(almacenDelNavegador(), entrante.uid) ?? inferirMetodo(entrante)
      setUsuario(entrante)
      setMetodo(metodoGuardado)
      if (metodoGuardado === "telefono" && destinoTrasTelefono(entrante) === "correo") {
        setPaso({ nombre: "correo", valor: "", error: null })
        return
      }
      setPaso({ nombre: "dentro", confirmarCierre: false })
    })
  }, [servicio])

  useEffect(() => {
    if (paso.nombre !== "codigo") return
    const id = window.setInterval(() => setReloj(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [paso.nombre])

  function recordar(uid: string, entrada: MetodoEntrada) {
    setMetodo(entrada)
    guardarMetodoEntrada(almacenDelNavegador(), uid, entrada)
  }

  function entrarDentro(entrante: UsuarioSesion, entrada: MetodoEntrada) {
    setUsuario(entrante)
    recordar(entrante.uid, entrada)
    if (entrada === "telefono" && destinoTrasTelefono(entrante) === "correo") {
      setPaso({ nombre: "correo", valor: "", error: null })
      return
    }
    setPaso({ nombre: "dentro", confirmarCierre: false })
  }

  async function aplicarCodigo(verificacionId: string, codigo: string, vinculando: boolean) {
    if (!servicio) return
    setOcupado(true)
    try {
      const resultado = vinculando
        ? await servicio.confirmarVinculoTelefono(verificacionId, codigo)
        : await confirmarCodigo(servicio, verificacionId, codigo)

      if (resultado.tipo !== "sesion") {
        setPaso((actual) =>
          actual.nombre === "codigo"
            ? { ...actual, error: textoErrorCodigo(resultado.tipo), codigo: actual.codigo }
            : actual,
        )
        return
      }

      if (!vinculando) {
        const pendiente = servicio.correoGooglePendiente()
        if (pendiente && debeEnlazarGoogle(resultado.usuario, pendiente)) {
          const enlace = await servicio.enlazarGooglePendiente()
          if (enlace.tipo === "sesion") {
            entrarDentro(enlace.usuario, "google")
            return
          }
        } else if (pendiente && !debeEnlazarGoogle(resultado.usuario, pendiente)) {
          setUsuario(resultado.usuario)
          recordar(resultado.usuario.uid, "telefono")
          setPaso({ nombre: "dentro", confirmarCierre: false })
          return
        }
        entrarDentro(resultado.usuario, "telefono")
        return
      }

      entrarDentro(resultado.usuario, metodo ?? "google")
    } finally {
      setOcupado(false)
    }
  }

  function escribirCodigo(valor: string) {
    const codigo = limitarCodigo(valor)
    const pantalla = paso.nombre === "codigo" ? paso : null
    setPaso((actual) => {
      if (actual.nombre !== "codigo") return actual
      return { ...actual, codigo, error: null }
    })
    if (!pantalla || codigo.length !== 6 || codigo === pantalla.codigo || ocupado) return
    void aplicarCodigo(pantalla.verificacionId, codigo, pantalla.vinculando)
  }

  async function enviarNumero() {
    if (paso.nombre !== "numero" || ocupado) return
    const incompleto = validarNumero(paso.digitos)
    if (incompleto) {
      setPaso({ ...paso, error: incompleto })
      return
    }
    if (!servicio) {
      setPaso({ ...paso, error: TEXTO_FALLO_ENVIO })
      return
    }
    setOcupado(true)
    try {
      const pedido = await pedirCodigo(servicio, paso.digitos, Date.now())
      if (pedido.tipo === "incompleto") {
        setPaso({ ...paso, error: pedido.error })
        return
      }
      if (pedido.tipo !== "enviado") return
      setPaso({
        nombre: "codigo",
        digitos: paso.digitos,
        codigo: "",
        error: null,
        esperaHasta: pedido.esperaHasta,
        verificacionId: pedido.verificacionId,
        vinculando: paso.vinculando,
      })
      setReloj(Date.now())
    } catch {
      setPaso({ ...paso, error: TEXTO_FALLO_ENVIO })
    } finally {
      setOcupado(false)
    }
  }

  return {
    paso,
    usuario,
    metodo,
    ocupado,
    hayCobroActivo,
    dialogo,
    avisoCierre: intentarCerrarSesion(hayCobroActivo).aviso,
    textoCierre: metodo ? textoDeCierre(metodo) : null,
    textoEspera: paso.nombre === "codigo" ? textoDeEspera(reloj, paso.esperaHasta) : null,
    escribirNumero(valor) {
      const digitos = limitarNumero(valor)
      setPaso((actual) =>
        actual.nombre === "numero" ? { ...actual, digitos, error: null } : actual,
      )
    },
    enviarNumero() {
      void enviarNumero()
    },
    regresarAlNumero() {
      if (paso.nombre !== "codigo") return
      setPaso({ nombre: "numero", digitos: paso.digitos, error: null, vinculando: paso.vinculando })
    },
    escribirCodigo,
    pedirOtro() {
      if (paso.nombre !== "codigo" || !servicio || ocupado) return
      const vencio = paso.error === TEXTO_CODIGO_VENCIDO
      if (!vencio && !puedePedirOtroCodigo(Date.now(), paso.esperaHasta)) return
      setOcupado(true)
      const pedido = vencio
        ? pedirCodigo(servicio, paso.digitos, Date.now())
        : pedirOtroCodigo(servicio, paso.digitos, Date.now(), paso.esperaHasta)
      void pedido
        .then((resultado) => {
          if (resultado.tipo !== "enviado") return
          setPaso({
            nombre: "codigo",
            digitos: paso.digitos,
            codigo: "",
            error: null,
            esperaHasta: resultado.esperaHasta,
            verificacionId: resultado.verificacionId,
            vinculando: paso.vinculando,
          })
          setReloj(Date.now())
        })
        .catch(() => {
          setPaso((actual) =>
            actual.nombre === "codigo" ? { ...actual, error: TEXTO_FALLO_ENVIO } : actual,
          )
        })
        .finally(() => setOcupado(false))
    },
    entrarConNumero() {
      setPaso({ nombre: "numero", digitos: "", error: null, vinculando: false })
    },
    entrarConGoogle() {
      if (!servicio) {
        setDialogo({ tipo: "sin-red" })
        return
      }
      setOcupado(true)
      void entrarConGoogle(servicio)
        .then((resultado) => {
          if (resultado.tipo === "enlazar") {
            const correoGoogle = resultado.correo ?? ""
            const cuenta = usuario?.correo
            if (cuenta && correoGoogle && cuenta.toLowerCase() !== correoGoogle.toLowerCase()) {
              setDialogo({ tipo: "distintas", cuenta, google: correoGoogle })
              return
            }
            setDialogo({ tipo: "coincide", correo: correoGoogle || cuenta || "" })
            return
          }
          entrarDentro(resultado.usuario, "google")
        })
        .catch((error: unknown) => {
          const codigo = typeof error === "object" && error && "code" in error ? String(error.code) : ""
          if (codigo === "auth/popup-closed-by-user" || codigo === "auth/cancelled-popup-request") {
            return
          }
          setDialogo({ tipo: "sin-red" })
        })
        .finally(() => setOcupado(false))
    },
    escribirCorreo(valor) {
      setPaso((actual) => (actual.nombre === "correo" ? { ...actual, valor, error: null } : actual))
    },
    guardarCorreo() {
      if (paso.nombre === "correo") {
        const error = correoListo(paso.valor)
        if (error) {
          setPaso({ nombre: "correo", valor: paso.valor, error })
          return
        }
        setPaso({ nombre: "confirma-correo", valor: paso.valor.trim() })
        return
      }
      if (paso.nombre !== "confirma-correo" || ocupado) return
      if (!servicio) {
        setDialogo({ tipo: "sin-red" })
        return
      }
      const valor = paso.valor
      setOcupado(true)
      void guardarCorreoEscrito(servicio, valor)
        .then((resultado) => {
          if (resultado.tipo === "invalido") {
            setPaso({ nombre: "correo", valor, error: resultado.error })
            return
          }
          if (resultado.tipo === "ya-es-de-google") {
            setUsuario(null)
            setMetodo(null)
            setPaso({ nombre: "bienvenida" })
            setDialogo({ tipo: "coincide", correo: valor })
            return
          }
          entrarDentro(resultado.usuario, metodo ?? "telefono")
        })
        .catch(() => {
          setDialogo({ tipo: "sin-red" })
        })
        .finally(() => setOcupado(false))
    },
    cerrarDialogo() {
      setDialogo(null)
    },
    continuarCoincidencia() {
      setDialogo(null)
      if (!servicio) return
      if (usuario && debeEnlazarGoogle(usuario, servicio.correoGooglePendiente())) {
        setOcupado(true)
        void servicio
          .enlazarGooglePendiente()
          .then((enlace) => {
            if (enlace.tipo === "sesion") entrarDentro(enlace.usuario, "google")
          })
          .finally(() => setOcupado(false))
        return
      }
      if (!usuario) {
        setOcupado(true)
        void entrarConGoogle(servicio)
          .then((resultado) => {
            if (resultado.tipo === "sesion") entrarDentro(resultado.usuario, "google")
          })
          .catch(() => setDialogo({ tipo: "sin-red" }))
          .finally(() => setOcupado(false))
      }
    },
    reenviarAviso() {
      if (!servicio || ocupado) return
      setOcupado(true)
      void servicio.reenviarAvisoCorreo().finally(() => setOcupado(false))
    },
    yaConfirmeAviso() {
      if (!servicio || ocupado) return
      setOcupado(true)
      void servicio
        .recargarUsuario()
        .then((entrante) => {
          if (!entrante) return
          setUsuario(entrante)
          if (entrante.correoVerificado && debeEnlazarGoogle(entrante, servicio.correoGooglePendiente())) {
            return servicio.enlazarGooglePendiente().then((enlace) => {
              if (enlace.tipo === "sesion") entrarDentro(enlace.usuario, "google")
            })
          }
          return undefined
        })
        .finally(() => setOcupado(false))
    },
    seguirDespuesDelAviso() {
      setPaso({ nombre: "dentro", confirmarCierre: false })
    },
    pedirCierre() {
      const decision = intentarCerrarSesion(hayCobroActivo)
      if (!decision.permitido) return
      setPaso({ nombre: "dentro", confirmarCierre: true })
    },
    cancelarCierre() {
      setPaso({ nombre: "dentro", confirmarCierre: false })
    },
    confirmarCierre() {
      if (!servicio || hayCobroActivo) return
      setOcupado(true)
      void servicio
        .cerrarSesion()
        .then(() => {
          borrarMetodoEntrada(almacenDelNavegador())
          setUsuario(null)
          setMetodo(null)
          setPaso({ nombre: "bienvenida" })
        })
        .finally(() => setOcupado(false))
    },
    empezarVinculo() {
      setPaso({ nombre: "numero", digitos: "", error: null, vinculando: true })
    },
    volver() {
      if (paso.nombre === "confirma-correo") {
        setPaso({ nombre: "correo", valor: paso.valor, error: null })
        return
      }
      if (paso.nombre === "numero" && paso.vinculando && usuario) {
        setPaso({ nombre: "dentro", confirmarCierre: false })
        return
      }
      setPaso({ nombre: "bienvenida" })
    },
    faltaConfirmarCorreo: Boolean(
      usuario &&
        servicio?.correoGooglePendiente() &&
        !debeEnlazarGoogle(usuario, servicio.correoGooglePendiente()),
    ),
  }
}
