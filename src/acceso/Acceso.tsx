import { formatearTelefonoVisible, aE164 } from "./numero.ts"
import {
  PantallaArranque,
  PantallaAjustes,
  PantallaBienvenida,
  PantallaCodigo,
  PantallaConfirmaCorreo,
  PantallaCorreo,
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
        ocupado={vista.ocupado}
        dialogo={vista.dialogo}
        alNumero={vista.entrarConNumero}
        alGoogle={vista.entrarConGoogle}
        alCerrarDialogo={vista.cerrarDialogo}
        alContinuarCoincidencia={vista.continuarCoincidencia}
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
        dialogo={vista.dialogo}
        alCambiar={vista.escribirCorreo}
        alGuardar={vista.guardarCorreo}
        alCerrarDialogo={vista.cerrarDialogo}
        alContinuarCoincidencia={vista.continuarCoincidencia}
      />
    )
  }

  if (paso.nombre === "confirma-correo") {
    return (
      <PantallaConfirmaCorreo
        valor={paso.valor}
        ocupado={vista.ocupado}
        dialogo={vista.dialogo}
        alConfirmar={vista.guardarCorreo}
        alCambiar={vista.volver}
        alCerrarDialogo={vista.cerrarDialogo}
        alContinuarCoincidencia={vista.continuarCoincidencia}
      />
    )
  }

  if (!vista.usuario || !vista.metodo || !vista.textoCierre) {
    return (
      <PantallaBienvenida
        ocupado={vista.ocupado}
        dialogo={vista.dialogo}
        alNumero={vista.entrarConNumero}
        alGoogle={vista.entrarConGoogle}
        alCerrarDialogo={vista.cerrarDialogo}
        alContinuarCoincidencia={vista.continuarCoincidencia}
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
      ocupado={vista.ocupado}
      alPedirCierre={vista.pedirCierre}
      alCancelarCierre={vista.cancelarCierre}
      alConfirmarCierre={vista.confirmarCierre}
      alVincular={vista.empezarVinculo}
    />
  )
}
