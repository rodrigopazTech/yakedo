import { useEffect, useMemo, useRef, useState } from "react"
import { PantallaAjustes } from "../acceso/pantallas.tsx"
import type { MetodoEntrada, UsuarioSesion } from "../acceso/tipos.ts"
import { datosDeFirebase } from "../firebase.ts"
import {
  TEXTO_CLABE_INVALIDA,
  TEXTO_CLABE_VACIA_CAMBIO,
  TEXTO_NOMBRE_VACIO,
  TEXTO_TRAMITE,
  ayudaClabeIncompleta,
  ayudaNombre,
  limitarNombre,
  vistaAlta,
  type TipoPersona,
} from "./dominio/alta.ts"
import { cuentaVisible, revisarClabe, soloNumeros } from "./dominio/clabe.ts"
import { motivoCobroApagado, puedeCambiarClabe, tramiteAbierto, type CuentaDocumento, type NegocioGuardado } from "./dominio/cuenta.ts"
import { Nucleo } from "../venta/Nucleo.tsx"
import {
  AvisoCuenta,
  DialogoAyudaClabe,
  DialogoConfirmarCambio,
  DialogoFalloCuenta,
  DialogoSeguir,
  MarcoCargando,
  PantallaAlta,
  PantallaCambiar,
  PantallaEstado,
  PantallaNombre,
} from "./pantallas.tsx"
import { crearServicioNegocio, escucharNegocio, mensajeDeError, type ServicioNegocio } from "./servicio.ts"

type Vista = "cargando" | "alta" | "estado" | "venta" | "ajustes" | "cambiar" | "nombre"

export function Aplicacion({
  usuario,
  metodo,
  hayCobroActivo,
  avisoCierre,
  confirmarCierre,
  textoCierre,
  ocupado,
  alPedirCierre,
  alCancelarCierre,
  alConfirmarCierre,
  alVincular,
}: {
  usuario: UsuarioSesion
  metodo: MetodoEntrada
  hayCobroActivo: boolean
  avisoCierre: string | null
  confirmarCierre: boolean
  textoCierre: string
  ocupado: boolean
  alPedirCierre: () => void
  alCancelarCierre: () => void
  alConfirmarCierre: () => void
  alVincular: () => void
}) {
  const firebase = useMemo(() => datosDeFirebase(), [])
  const servicio = useMemo<ServicioNegocio | null>(
    () => (firebase ? crearServicioNegocio(firebase.functions, firebase.db) : null),
    [firebase],
  )

  const [vista, setVista] = useState<Vista>("cargando")
  const [negocio, setNegocio] = useState<NegocioGuardado | null>(null)
  const [cuenta, setCuenta] = useState<CuentaDocumento | null>(null)
  const [clabe, setClabe] = useState("")
  const [nombre, setNombre] = useState("")
  const [nombreLegal, setNombreLegal] = useState("")
  const [tipo, setTipo] = useState<TipoPersona | null>(null)
  const [intento, setIntento] = useState(false)
  const [repetida, setRepetida] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [falloVisto, setFalloVisto] = useState<string | null>(null)
  const [pedirEdicion, setPedirEdicion] = useState(false)
  const llegada = useRef(false)
  const previa = useRef<CuentaDocumento | null>(null)
  const actualId = cuenta?.actual?.bankAccountId
  const actualEstado = cuenta?.actual?.estado
  const nuevaId = cuenta?.nueva?.bankAccountId
  const nuevaEstado = cuenta?.nueva?.estado

  useEffect(() => {
    const firebase = datosDeFirebase()
    if (!firebase) return
    return escucharNegocio(firebase.db, usuario.uid, (recibido) => {
      const antes = previa.current
      previa.current = recibido.cuenta
      setNegocio(recibido.negocio)
      setCuenta(recibido.cuenta)
      const nuevaAntes = antes?.nueva
      const actual = recibido.cuenta?.actual
      if (nuevaAntes && actual && actual.bankAccountId === nuevaAntes.bankAccountId && !recibido.cuenta?.nueva) {
        const texto = `¡Ya quedó! Tus cobros llegan a ${actual.banco} •••• ${actual.ultimos4}.`
        setToast(texto)
        window.setTimeout(() => setToast((actualTexto) => (actualTexto === texto ? null : actualTexto)), 4000)
      }
      if (!llegada.current) {
        llegada.current = true
        if (!recibido.negocio) setVista("alta")
        else if (recibido.cuenta?.actual?.estado === "ACTIVE") setVista("venta")
        else setVista("estado")
      }
    })
  }, [usuario.uid])

  useEffect(() => {
    const pendiente = (actualEstado && actualEstado !== "ACTIVE") || (nuevaEstado && nuevaEstado !== "ACTIVE")
    if (!pendiente || !servicio) return
    void servicio.consultar().catch(() => undefined)
  }, [actualEstado, actualId, nuevaEstado, nuevaId, servicio])

  if (!servicio) return <MarcoCargando>Falta la configuración de Firebase.</MarcoCargando>
  if (vista === "cargando") return <MarcoCargando>Cargando tu negocio.</MarcoCargando>

  const vistaFormulario = vistaAlta({
    clabe,
    nombre,
    nombreLegal,
    tipoPersona: tipo,
    intento,
    clabeRepetida: repetida,
  })
  const motivo = motivoCobroApagado(cuenta)
  const cambio = puedeCambiarClabe(cuenta, hayCobroActivo)
  const bloqueEstado = tramiteAbierto(cuenta) && cuenta?.nueva ? cuenta.nueva : cuenta?.actual
  const avisoCatalogo =
    motivo === "tramite" || (motivo === "primera" && cuenta?.actual && cuenta.actual.estado !== "ERROR")
      ? "Cuenta en revisión: cobra en efectivo por ahora."
      : null

  async function alta() {
    setIntento(true)
    setRepetida(false)
    setAviso(null)
    const lista = vistaAlta({ clabe, nombre, nombreLegal, tipoPersona: tipo, intento: true, clabeRepetida: false })
    if (!lista.puedeContinuar || !tipo || !servicio) return
    setTrabajando(true)
    try {
      await servicio.registrar({
        nombre: nombre.trim(),
        nombreLegal: nombreLegal.trim(),
        tipoPersona: tipo,
        clabe: soloNumeros(clabe),
      })
      setVista("estado")
    } catch (error) {
      const texto = mensajeDeError(error)
      if (texto.includes("registrada")) setRepetida(true)
      else setAviso(texto)
    } finally {
      setTrabajando(false)
    }
  }

  async function guardarNombre() {
    setIntento(true)
    const limpio = nombre.trim()
    if (!limpio || !servicio) return
    setTrabajando(true)
    try {
      await servicio.guardarNombre(usuario.uid, limpio)
      setVista("ajustes")
    } catch (error) {
      setAviso(mensajeDeError(error))
    } finally {
      setTrabajando(false)
    }
  }

  async function confirmarCambio() {
    if (!servicio) return
    setTrabajando(true)
    setAviso(null)
    try {
      await servicio.cambiarClabe(soloNumeros(clabe))
      setConfirmar(false)
      setVista("ajustes")
    } catch (error) {
      setConfirmar(false)
      setAviso(mensajeDeError(error))
    } finally {
      setTrabajando(false)
    }
  }

  async function elegir(seguir: boolean) {
    if (!servicio) return
    setTrabajando(true)
    try {
      await servicio.elegirSeguir(seguir)
    } catch (error) {
      setAviso(mensajeDeError(error))
    } finally {
      setTrabajando(false)
    }
  }

  const revisionCambio = revisarClabe(clabe)
  const ayudaCambio =
    revisionCambio.tipo === "valida"
      ? `18 de 18 números · CLABE válida de ${revisionCambio.clabe.banco}`
      : revisionCambio.tipo === "invalida"
        ? TEXTO_CLABE_INVALIDA
        : revisionCambio.tipo === "incompleta" && revisionCambio.escritos > 0
          ? ayudaClabeIncompleta(revisionCambio.escritos, revisionCambio.faltan)
          : TEXTO_CLABE_VACIA_CAMBIO
  const nuevaValida = revisionCambio.tipo === "valida" ? revisionCambio.clabe : null
  const fallo = cuenta?.nueva?.estado === "ERROR" && falloVisto !== cuenta.nueva.bankAccountId ? cuenta : null
  const pedirSeguir = tramiteAbierto(cuenta) && cuenta?.seguirConActual === null && cuenta.nueva ? cuenta.nueva : null

  return (
    <>
      {vista === "alta" || (vista === "estado" && !negocio) ? (
        <PantallaAlta
          clabe={clabe}
          nombre={nombre}
          nombreLegal={nombreLegal}
          tipoPersona={tipo}
          vista={vistaFormulario}
          aviso={aviso}
          ocupado={trabajando}
          alClabe={(valor) => {
            setClabe(soloNumeros(valor))
            setRepetida(false)
          }}
          alNombre={(valor) => setNombre(limitarNombre(valor))}
          alLegal={setNombreLegal}
          alTipo={setTipo}
          alAyuda={() => setAyuda(true)}
          alContinuar={() => void alta()}
        />
      ) : null}
      {vista === "estado" && negocio && bloqueEstado ? (
        <PantallaEstado
          negocio={negocio}
          bloque={bloqueEstado}
          alSeguir={() => setVista("venta")}
          alReintentar={() => {
            setNombre(negocio.nombre)
            setNombreLegal(negocio.nombreLegal)
            setTipo(negocio.tipoPersona)
            setClabe("")
            setIntento(false)
            setVista("alta")
          }}
        />
      ) : null}
      {vista === "venta" && negocio && firebase ? (
        <Nucleo
          uid={usuario.uid}
          nombre={negocio.nombre}
          db={firebase.db}
          storage={firebase.storage}
          motivo={motivo}
          avisoRevision={avisoCatalogo !== null}
          pedirEdicion={pedirEdicion}
          alEdicionAbierta={() => setPedirEdicion(false)}
          alAjustes={() => setVista("ajustes")}
          alEstado={() => setVista("estado")}
        />
      ) : null}
      {vista === "cambiar" && negocio && cuenta?.actual ? (
        <PantallaCambiar
          nombre={negocio.nombre}
          actual={cuenta.actual}
          clabe={clabe}
          ayuda={aviso ?? ayudaCambio}
          error={Boolean(aviso) || revisionCambio.tipo === "invalida"}
          puede={revisionCambio.tipo === "valida" && !aviso}
          ocupado={trabajando}
          alVolver={() => setVista("ajustes")}
          alClabe={(valor) => {
            setClabe(soloNumeros(valor))
            setAviso(null)
          }}
          alAyuda={() => setAyuda(true)}
          alContinuar={() => {
            if (revisionCambio.tipo === "valida") setConfirmar(true)
          }}
        />
      ) : null}
      {vista === "nombre" && negocio ? (
        <PantallaNombre
          nombre={nombre}
          ayuda={nombre.trim().length === 0 ? TEXTO_NOMBRE_VACIO : (aviso ?? ayudaNombre(nombre))}
          error={Boolean(aviso) || nombre.trim().length === 0}
          puede={nombre.trim().length > 0}
          ocupado={trabajando}
          alVolver={() => setVista("ajustes")}
          alNombre={(valor) => {
            setNombre(limitarNombre(valor))
            setAviso(null)
          }}
          alGuardar={() => void guardarNombre()}
        />
      ) : null}
      {vista === "ajustes" && negocio ? (
        <PantallaAjustes
          usuario={usuario}
          metodo={metodo}
          hayCobroActivo={hayCobroActivo}
          avisoCierre={avisoCierre}
          confirmarCierre={confirmarCierre}
          textoCierre={textoCierre}
          ocupado={ocupado}
          alPedirCierre={alPedirCierre}
          alCancelarCierre={alCancelarCierre}
          alConfirmarCierre={alConfirmarCierre}
          alVincular={alVincular}
          alCatalogo={() => {
            setPedirEdicion(true)
            setVista("venta")
          }}
          alEditarCatalogo={() => {
            setPedirEdicion(true)
            setVista("venta")
          }}
          nombreNegocio={negocio.nombre}
          cuentaCobro={cuenta?.actual ? cuentaVisible(cuenta.actual.banco, cuenta.actual.ultimos4) : null}
          cuentaNueva={
            cuenta?.nueva && (cuenta.nueva.estado === "PENDING" || cuenta.nueva.estado === "PROCESSING")
              ? `${cuenta.nueva.banco} · CLABE •••• ${cuenta.nueva.ultimos4} · En trámite`
              : null
          }
          avisoCuenta={cambio === "tramite" ? TEXTO_TRAMITE : null}
          alNegocio={() => {
            setNombre(negocio.nombre)
            setIntento(false)
            setAviso(null)
            setVista("nombre")
          }}
          alCuenta={() => {
            if (cambio === "ok") {
              setClabe("")
              setAviso(null)
              setVista("cambiar")
              return
            }
            if (cambio === "sin-activa") setVista("estado")
          }}
        />
      ) : null}
      {ayuda ? <DialogoAyudaClabe alCerrar={() => setAyuda(false)} /> : null}
      {confirmar && nuevaValida ? (
        <DialogoConfirmarCambio
          cuenta={nuevaValida}
          ocupado={trabajando}
          alCancelar={() => setConfirmar(false)}
          alConfirmar={() => void confirmarCambio()}
        />
      ) : null}
      {pedirSeguir ? (
        <DialogoSeguir cuenta={pedirSeguir} alEfectivo={() => void elegir(false)} alSeguir={() => void elegir(true)} />
      ) : null}
      {fallo?.actual && fallo.nueva ? (
        <DialogoFalloCuenta
          cuenta={fallo.actual}
          alCerrar={() => setFalloVisto(fallo.nueva?.bankAccountId ?? null)}
        />
      ) : null}
      {toast ? <AvisoCuenta texto={toast} /> : null}
    </>
  )
}
