export type MetodoEntrada = "telefono" | "google"

export interface UsuarioSesion {
  uid: string
  telefono: string | null
  correo: string | null
  correoVerificado: boolean
  proveedores: MetodoEntrada[]
}

export type ResultadoGoogle =
  | { tipo: "sesion"; usuario: UsuarioSesion }
  | { tipo: "enlazar"; correo: string | null }

export type ResultadoCorreo =
  | { tipo: "guardado"; usuario: UsuarioSesion }
  | { tipo: "ya-es-de-google" }

export type ResultadoCodigo =
  | { tipo: "sesion"; usuario: UsuarioSesion }
  | { tipo: "incorrecto" }
  | { tipo: "vencido" }
  | { tipo: "otro" }

export interface ServicioAuth {
  enviarCodigo(telefonoE164: string): Promise<string>
  confirmarCodigo(verificacionId: string, codigo: string): Promise<ResultadoCodigo>
  entrarConGoogle(): Promise<ResultadoGoogle>
  enlazarGooglePendiente(): Promise<ResultadoCodigo>
  correoGooglePendiente(): string | null
  guardarCorreo(correo: string): Promise<ResultadoCorreo>
  reenviarAvisoCorreo(): Promise<void>
  recargarUsuario(): Promise<UsuarioSesion | null>
  confirmarVinculoTelefono(verificacionId: string, codigo: string): Promise<ResultadoCodigo>
  cerrarSesion(): Promise<void>
  observar(oyente: (usuario: UsuarioSesion | null) => void): () => void
}
