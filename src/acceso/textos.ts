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

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_TITULO = "¿Cuál es tu correo?"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_APOYO =
  "Lo guardamos en tu cuenta y te mandamos un aviso de Firebase para confirmarlo. Así se enlaza con Google."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_ETIQUETA = "Correo"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_BOTON = "Guardar correo"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_INVALIDO = "Revisa el correo. Falta algo."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_AVISO_CORREO =
  "Te mandamos un aviso para confirmar tu correo. Ábrelo en tu correo y luego sigue."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_AVISO_LISTO = "Ya confirmé el aviso"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_AVISO_OTRA_VEZ = "Enviar el aviso otra vez"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_AVISO_SEGUIR = "Seguir"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_DE_GOOGLE_TITULO = "Este correo ya está en una cuenta de Google."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_CORREO_DE_GOOGLE_APOYO =
  "Entra con Google. Ya dentro, vincula tu número desde Ajustes. No abrimos otro negocio."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_ENLAZAR_GOOGLE_TITULO = "Ese correo ya está en tu cuenta."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_ENLAZAR_GOOGLE_APOYO =
  "Entra con tu número para enlazar Google a la misma cuenta."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_FALTA_CONFIRMAR_CORREO =
  "Falta confirmar el aviso del correo para enlazar Google."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_VINCULAR_NUMERO = "Vincular número"

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_VINCULAR_APOYO = "Enlaza el celular a esta cuenta de Google."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_SIN_CONFIGURACION =
  "Falta la configuración de Firebase en este aparato."

// TEXTO PROVISIONAL: espera a Diseño UI/UX
export const TEXTO_NO_SE_PUDO = "No se pudo completar. Inténtalo otra vez."

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
