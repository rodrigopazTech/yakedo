import type { CobroGuardado, CobroNuevo, PedidoParaCobro } from "../../cobro/modelo.ts"
import type { PagoQr } from "../../cobro/pey-qr.ts"
import type { ResultadoPago } from "../../cobro/resolucion.ts"
import type { EstadoCuentaPey, NegocioGuardado, CuentaDocumento, Privado, AvisoCuenta } from "./cuenta.ts"

export interface EstadoLocal {
  negocio: NegocioGuardado | null
  cuenta: CuentaDocumento | null
  privado: Privado | null
}

export interface AltaPersistida {
  uid: string
  negocio: NegocioGuardado
  cuenta: CuentaDocumento
  privado: Privado
  clabe: string
  bankAccountIdAnterior: string | null
}

export interface NuevaPersistida {
  uid: string
  cuenta: CuentaDocumento
  privado: Privado
  clabe: string
  clabeLiberar: string | null
}

export interface ResultadoEstado {
  uid: string
  cuenta: CuentaDocumento
  aviso: AvisoCuenta
}

export interface RepositorioNegocio {
  reservarClabe(clabe: string, uid: string): Promise<"libre" | "propia" | "ajena">
  liberarClabe(clabe: string, uid: string): Promise<void>
  leer(uid: string): Promise<EstadoLocal>
  guardarAlta(datos: AltaPersistida): Promise<void>
  guardarNueva(datos: NuevaPersistida): Promise<void>
  fijarSeguir(uid: string, seguir: boolean): Promise<void>
  hayCobroActivo(uid: string): Promise<boolean>
  aplicarEstado(bankAccountId: string, estado: EstadoCuentaPey): Promise<ResultadoEstado | null>
  tomarWebhook(id: string, tipo: string, eventoCobro: unknown | null): Promise<"nuevo" | "repetido">
  leerPedidoCobro(uid: string, pedidoId: string): Promise<PedidoParaCobro | null>
  bankAccountActivo(uid: string): Promise<string | null>
  guardarCobroQr(datos: CobroNuevo): Promise<void>
  leerCobroQr(uid: string, pedidoId: string, cobroId: string): Promise<CobroGuardado | null>
  marcarCobroVencido(uid: string, pedidoId: string, cobroId: string): Promise<void>
  resolverPagoQr(webhookId: string, pago: PagoQr, ahora: number): Promise<ResultadoPago>
}
