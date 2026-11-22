export interface CobroResumen {
  id: string
  venceEn: number
  estado: string
  codiQrId: string | null
}

export interface PedidoParaCobro {
  id: string
  numero: number
  estado: "Pendiente" | "Pagado" | "Cancelado"
  total: number
  cobroActivoId: string | null
  cobros: CobroResumen[]
}

export interface CobroGuardado {
  id: string
  codiQrId: string
  qrString: string
  monto: number
  creadoEn: number
  venceEn: number
  estado: string
  pedidoId: string
  numero: number
}

export interface CobroNuevo {
  uid: string
  pedidoId: string
  numero: number
  cobroId: string
  codiQrId: string
  qrString: string
  monto: number
  creadoEn: number
  venceEn: number
  seguirActivo: boolean
}
