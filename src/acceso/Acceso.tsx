import { formatearTelefonoVisible, aE164 } from "./numero.ts"
import {
  PantallaArranque,
  PantallaAjustes,
  PantallaAvisoCorreo,
  PantallaBienvenida,
  PantallaCodigo,
  PantallaCorreo,
  PantallaCorreoDeGoogle,
  PantallaEnlazarGoogle,
  PantallaNumero,
} from "./pantallas.tsx"
import type { ServicioAuth } from "./tipos.ts"
import { useAcceso } from "./usar-acceso.ts"

export function Acceso({
  servicio,
  hayCobroActivo = false,
}: {
  servicio: ServicioAuth | null
  hayCobroActivo?: boolean
}) {
  const vista = useAcceso(servicio, hayCobroActivo)
  const paso = vista.paso

  if (paso.nombre === "cargando") {
    return <PantallaArranque />
  }

  if (paso.nombre === "bienvenida") {
    return (
      <PantallaBienvenida
        error={paso.error}
        ocupado={vista.ocupado}
        alNumero={vista.entrarConNumero}
        alGoogle={vista.entrarConGoogle}
      />
    )
  }

  if (paso.nombre === "numero") {
    return (
      <PantallaNumero
        digitos={paso.digitos}
        error={paso.error}
        ocupado={vista.ocupado}
        vinculando={paso.vinculando}
        alCambiar={vista.escribirNumero}
        alEnviar={vista.enviarNumero}
        alRegresar={vista.volver}
      />
    )
  }

  if (paso.nombre === "codigo") {
    return (
      <PantallaCodigo
        telefonoVisible={formatearTelefonoVisible(aE164(paso.digitos))}
        codigo={paso.codigo}
        error={paso.error}
        espera={vista.textoEspera}
        ocupado={vista.ocupado}
        alCambiar={vista.escribirCodigo}
        alCambiarNumero={vista.regresarAlNumero}
        alPedirOtro={vista.pedirOtro}
      />
    )
  }

  if (paso.nombre === "correo") {
    return (
      <PantallaCorreo
        valor={paso.valor}
        error={paso.error}
        ocupado={vista.ocupado}
        alCambiar={vista.escribirCorreo}
        alGuardar={vista.guardarCorreo}
      />
    )
  }

  if (paso.nombre === "aviso-correo") {
    return (
      <PantallaAvisoCorreo
        ocupado={vista.ocupado}
        alReenviar={vista.reenviarAviso}
        alConfirmar={vista.yaConfirmeAviso}
        alSeguir={vista.seguirDespuesDelAviso}
      />
    )
  }

  if (paso.nombre === "correo-de-google") {
    return <PantallaCorreoDeGoogle ocupado={vista.ocupado} alGoogle={vista.entrarConGoogle} />
  }

  if (paso.nombre === "enlazar-google") {
    return <PantallaEnlazarGoogle alNumero={vista.entrarConNumero} />
  }

  if (!vista.usuario || !vista.metodo || !vista.textoCierre) {
    return (
      <PantallaBienvenida
        error={null}
        ocupado={vista.ocupado}
        alNumero={vista.entrarConNumero}
        alGoogle={vista.entrarConGoogle}
      />
    )
  }

  return (
    <PantallaAjustes
      usuario={vista.usuario}
      metodo={vista.metodo}
      hayCobroActivo={vista.hayCobroActivo}
      avisoCierre={vista.avisoCierre}
      confirmarCierre={paso.confirmarCierre}
      textoCierre={vista.textoCierre}
      faltaConfirmarCorreo={vista.faltaConfirmarCorreo}
      ocupado={vista.ocupado}
      alPedirCierre={vista.pedirCierre}
      alCancelarCierre={vista.cancelarCierre}
      alConfirmarCierre={vista.confirmarCierre}
      alVincular={vista.empezarVinculo}
      alReenviarAviso={vista.reenviarAviso}
    />
  )
}
