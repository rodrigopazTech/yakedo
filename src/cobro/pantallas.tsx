import type { ListaBancos } from "./bancos.ts"
import { QrCoDi } from "./qr-imagen.tsx"
import {
  vistaAyuda,
  vistaDuplicado,
  vistaEfectivoActivo,
  vistaFalloQr,
  vistaHoja,
  vistaNoEsperado,
  vistaQr,
  vistaVencido,
} from "./vistas.ts"
import { formatoNumero, pesos, type PedidoLeido } from "../venta/dominio.ts"

export function PantallaQr({
  numero,
  piezas,
  totalCentavos,
  creadoEn,
  venceEn,
  restanteMs,
  mismo,
  otro,
  destacados,
  qrString,
  alVolver,
  alBancos,
  alAyuda,
}: {
  numero: number
  piezas: number
  totalCentavos: number
  creadoEn: number
  venceEn: number
  restanteMs: number
  mismo: boolean
  otro: boolean
  destacados: string[]
  qrString: string
  alVolver: () => void
  alBancos: () => void
  alAyuda: () => void
}) {
  const vista = vistaQr({ numero, piezas, totalCentavos, creadoEn, venceEn, restanteMs, mismo, otro, destacados })
  const avance = Math.max(0, Math.min(100, (restanteMs / 360_000) * 100))
  return (
    <main className="n-qr">
      <header className="n-encabezado">
        <button className="boton-regresar" type="button" onClick={alVolver}>
          {vista.verTicket}
        </button>
        <div>
          <h1>{vista.titulo}</h1>
          <p>{vista.subtitulo}</p>
        </div>
      </header>
      <p className="n-total-cobrar"><span>{vista.totalEtiqueta}</span><strong>{vista.total}</strong></p>
      <QrCoDi valor={qrString} />
      <p className="n-qr-linea">{vista.linea}</p>
      <button className="n-qr-enlace" type="button" onClick={alBancos}>{vista.bancos}</button>
      <p className="n-qr-indica">{vista.indicacion}</p>
      <div className="n-reloj" aria-live="polite">
        <strong>{vista.reloj}</strong>
        <span> para pagar · vence {vista.vence}</span>
        <i style={{ width: `${avance}%` }} />
      </div>
      {vista.mismo ? <p className="n-qr-nota">{vista.mismo}</p> : null}
      {vista.otro ? <p className="n-qr-nota">{vista.otro}</p> : null}
      <p className="n-qr-advierte">{vista.advertencia}</p>
      {/* UI PROVISIONAL: falta en Figma el enlace en el marco 192:3413; el diálogo sí está en 31:466. */}
      <button className="n-qr-enlace" type="button" onClick={alAyuda}>{vista.ayuda}</button>
    </main>
  )
}

export function PantallaVencido({
  numero,
  totalCentavos,
  alCarrito,
  alOtra,
  alEfectivo,
}: {
  numero: number
  totalCentavos: number
  alCarrito: () => void
  alOtra: () => void
  alEfectivo: () => void
}) {
  const vista = vistaVencido(totalCentavos, numero)
  return (
    <main className="n-qr n-vencido">
      <header className="n-encabezado">
        <button className="boton-regresar" type="button" onClick={alCarrito}>{vista.regresar}</button>
        <div>
          <h1>{vista.titulo}</h1>
          <p>{vista.subtitulo}</p>
        </div>
      </header>
      <span className="n-alerta" aria-hidden="true">!</span>
      <h2>{vista.vencido}</h2>
      <p>{vista.apoyo}</p>
      <p className="n-reloj n-reloj-rojo"><strong>{vista.reloj}</strong> <span>{vista.chip}</span></p>
      <button className="boton-principal" type="button" onClick={alOtra}>{vista.otra}</button>
      <button className="boton-secundario" type="button" onClick={alEfectivo}>{vista.efectivo}</button>
      <small>{vista.aviso}</small>
    </main>
  )
}

export function HojaBancos({
  lista,
  alCerrar,
  alEfectivo,
}: {
  lista: ListaBancos
  alCerrar: () => void
  alEfectivo: () => void
}) {
  const vista = vistaHoja(lista)
  return (
    <div className="n-velo">
      <aside className="n-hoja" role="dialog" aria-labelledby="titulo-bancos">
        <header>
          <h2 id="titulo-bancos">{vista.titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={alCerrar}>×</button>
        </header>
        <p>{vista.intro}</p>
        <ul className="n-bancos">
          {vista.bancos.map((banco) => <li key={banco}>{banco}</li>)}
          <li className="n-bancos-mas">{vista.otras}</li>
        </ul>
        <p className="n-bancos-aviso">{vista.aviso}</p>
        <footer>
          <small>{vista.pie}</small>
          <button className="boton-secundario" type="button" onClick={alEfectivo}>{vista.efectivo}</button>
        </footer>
      </aside>
    </div>
  )
}

export function DialogoAyuda({
  restanteMs,
  venceEn,
  alEfectivo,
  alVolver,
}: {
  restanteMs: number
  venceEn: number
  alEfectivo: () => void
  alVolver: () => void
}) {
  const vista = vistaAyuda(restanteMs, venceEn)
  return (
    <div className="n-velo">
      <div className="n-dialogo n-dialogo-largo" role="dialog" aria-labelledby="titulo-ayuda-banco">
        <span className="n-alerta" aria-hidden="true">!</span>
        <h2 id="titulo-ayuda-banco">{vista.titulo}</h2>
        <p>{vista.intro}</p>
        <p className="n-reloj"><span>{vista.sigue}</span></p>
        <ol>
          {vista.pasos.map((paso) => <li key={paso}>{paso}</li>)}
        </ol>
        <p>{vista.nota}</p>
        <button className="boton-secundario" type="button" onClick={alEfectivo}>{vista.efectivo}</button>
        <button className="boton-principal" type="button" onClick={alVolver}>{vista.volver}</button>
      </div>
    </div>
  )
}

export function DialogoEfectivoActivo({
  restanteMs,
  venceEn,
  queEs,
  alQueEs,
  alSeguir,
  alConfirmar,
}: {
  restanteMs: number
  venceEn: number
  queEs: boolean
  alQueEs: () => void
  alSeguir: () => void
  alConfirmar: () => void
}) {
  const vista = vistaEfectivoActivo(restanteMs, venceEn)
  return (
    <div className="n-velo">
      <div className="n-dialogo" role="dialog" aria-labelledby="titulo-qr-activo">
        <h2 id="titulo-qr-activo">{vista.titulo}</h2>
        <p>{vista.frase}</p>
        <button className="n-qr-enlace" type="button" onClick={alQueEs}>{vista.queEs}</button>
        {queEs ? (
          <ul>
            {vista.explicacion.map((linea) => <li key={linea}>{linea}</li>)}
          </ul>
        ) : null}
        <p className="n-reloj"><span>{vista.vence}</span></p>
        <button className="boton-secundario" type="button" onClick={alConfirmar}>{vista.si}</button>
        <button className="boton-principal" type="button" onClick={alSeguir}>{vista.seguir}</button>
      </div>
    </div>
  )
}

export function DialogoNoEsperado({
  numero,
  monto,
  alVer,
  alCerrar,
}: {
  numero: number
  monto: number
  alVer: () => void
  alCerrar: () => void
}) {
  const vista = vistaNoEsperado(numero, monto)
  return (
    // UI PROVISIONAL: falta en Figma el aviso de pago no esperado.
    <div className="n-velo">
      <div className="n-dialogo" role="dialog" aria-labelledby="titulo-no-esperado">
        <h2 id="titulo-no-esperado">{vista.titulo}</h2>
        <p>{vista.apoyo}</p>
        <button className="boton-principal" type="button" onClick={alVer}>{vista.ver}</button>
        <button className="boton-secundario" type="button" onClick={alCerrar}>{vista.entendido}</button>
      </div>
    </div>
  )
}

export function DialogoDuplicado({ alCerrar }: { alCerrar: () => void }) {
  const vista = vistaDuplicado()
  return (
    // UI PROVISIONAL: falta en Figma el aviso de pago duplicado.
    <div className="n-velo">
      <div className="n-dialogo" role="dialog" aria-labelledby="titulo-duplicado">
        <h2 id="titulo-duplicado">{vista.titulo}</h2>
        <p>{vista.apoyo}</p>
        <button className="boton-principal" type="button" onClick={alCerrar}>{vista.entendido}</button>
      </div>
    </div>
  )
}

export function DialogoFalloQr({ alReintentar, alEfectivo }: { alReintentar: () => void; alEfectivo: () => void }) {
  const vista = vistaFalloQr()
  return (
    // UI PROVISIONAL: falta en Figma el fallo al crear el cobro.
    <div className="n-velo">
      <div className="n-dialogo" role="dialog">
        <h2>{vista.titulo}</h2>
        <p>{vista.apoyo}</p>
        <button className="boton-principal" type="button" onClick={alReintentar}>{vista.reintentar}</button>
        <button className="boton-secundario" type="button" onClick={alEfectivo}>{vista.efectivo}</button>
      </div>
    </div>
  )
}

export function HojaTicket({ pedido, alCerrar }: { pedido: PedidoLeido; alCerrar: () => void }) {
  return (
    // UI PROVISIONAL: falta en Figma el ticket abierto sobre el QR.
    <div className="n-velo">
      <aside className="n-hoja" role="dialog" aria-labelledby="titulo-ver-ticket">
        <header>
          <h2 id="titulo-ver-ticket">Ticket {formatoNumero(pedido.numero)}</h2>
          <button type="button" aria-label="Cerrar" onClick={alCerrar}>×</button>
        </header>
        <ul>
          {pedido.items.map((item) => (
            <li key={`${item.nombre}-${item.precioCentavos}`}>
              {item.cantidad}× {item.nombre} <strong>{pesos(item.precioCentavos * item.cantidad)}</strong>
            </li>
          ))}
        </ul>
        <p><span>Total</span> <strong>{pesos(pedido.total)}</strong></p>
      </aside>
    </div>
  )
}
