/** Textos visibles del acceso. Los aprobados salen de la spec y de Figma. */

export const TEXTO_CODIGO_INCORRECTO =
  "Ese código no es. Revísalo y escríbelo otra vez."

export const TEXTO_CODIGO_VENCIDO = "Este código ya venció. Pide uno nuevo."

export const TEXTO_CIERRE_TITULO = "¿Cerrar sesión?"

export const TEXTO_CIERRE_NUMERO =
  "Tus ventas se quedan guardadas. Para volver a entrar usa tu número."

export const TEXTO_CIERRE_GOOGLE =
  "Tus ventas se quedan guardadas. Para volver a entrar usa tu cuenta de Google."

export const TEXTO_COBRO_ACTIVO =
  "Hay un cobro activo. Espera a que se pague o venza para cerrar sesión."

export const TEXTO_AYUDA_NUMERO = "Te va a llegar un SMS a este número."

export const TEXTO_AYUDA_NUMERO_PARCIAL = "Son 10 números, sin el +52."

export const TEXTO_AYUDA_CODIGO =
  "Son 6 números. Entras en cuanto escribes el último."

export const TEXTO_AYUDA_REENVIO =
  "¿No te llegó? Revisa que el número esté bien o pide otro."

export const TEXTO_REENVIAR = "Reenviar código"

export const TEXTO_ESLOGAN = "Cobras, cae, ya quedó."

export const TEXTO_CATALOGO_APOYO = "Agrega, cambia u oculta productos."

export const TEXTO_CUENTA_BLOQUEADA =
  "Hay un cobro activo. Espera a que se pague o venza para cambiar la cuenta."

export const PALABRAS_PROHIBIDAS = ["dígitos", "digitos", "notificación", "notificacion", "vivo"] as const

export const TEXTO_CORREO_TITULO = "Tu correo"

export const TEXTO_CORREO_APOYO = "Lo usamos para avisarte y para entrar con Google."

export const TEXTO_CORREO_ETIQUETA = "Correo"

export const TEXTO_CORREO_BOTON = "Continuar"

export const TEXTO_CONFIRMA_TITULO = "¿Es tu correo?"

export const TEXTO_CONFIRMA_BOTON = "Confirmar"

export const TEXTO_CAMBIAR_CORREO = "Cambiar correo"

export const TEXTO_MISMA_CUENTA = "Es tu misma cuenta"

export const TEXTO_MISMA_CUENTA_APOYO = "El correo de Google coincide con el de tu cuenta."

export const TEXTO_CUENTAS_DISTINTAS = "Son cuentas distintas"

export const TEXTO_CUENTAS_DISTINTAS_APOYO = "Este correo de Google no es el de tu cuenta."

export const TEXTO_SEGUIR_CUENTA = "Seguir con mi cuenta"

export const TEXTO_VINCULAR_NUMERO = "Vincular número"

export const TEXTO_VINCULAR_TITULO = "Vincular tu número"

export const TEXTO_VINCULAR_APOYO = "Te mandamos un código por SMS para vincularlo."

export const TEXTO_ENVIANDO = "Enviando código…"

export const TEXTO_FALLO_ENVIO = "No se pudo enviar el código. Intenta otra vez."

export const TEXTO_FALLO_VERIFICACION = "No se pudo verificar el código. Intenta otra vez."

export const TEXTO_SIN_RED_TITULO = "Se necesita internet"

export const TEXTO_SIN_RED = "Para entrar, esta tablet tiene que estar conectada."

export const TEXTO_ENTENDIDO = "Entendido"

export const TEXTO_TERMINOS = "Términos"

export const TEXTO_AVISO_PRIVACIDAD = "Aviso de privacidad"

// TEXTO PROVISIONAL: falta en Figma el correo mal escrito
export const TEXTO_CORREO_INVALIDO = "Revisa el correo. Falta algo."

export function textoTuCuenta(correo: string): string {
  return `Tu cuenta: ${correo}`
}

export function textoGoogleCuenta(correo: string): string {
  return `Google: ${correo}`
}

export function textoEsperaOtroCodigo(milisegundos: number): string {
  const total = Math.max(0, Math.ceil(milisegundos / 1000))
  const minutos = Math.floor(total / 60)
  const segundos = total % 60
  return `Puedes pedir otro código en ${minutos}:${segundos.toString().padStart(2, "0")}`
}

export function mensajeNumeroIncompleto(cantidadEscrita: number): string {
  const faltan = 10 - cantidadEscrita
  if (faltan === 1) return "Te falta 1 número. Tu número es de 10."
  return `Te faltan ${faltan} números. Tu número es de 10.`
}
