import type { ReactNode } from "react"
import logoYakedo from "../acceso/activos/logo-yakedo.svg"
import iconoRegresar from "../acceso/activos/icono-regresar.svg"
import {
  TEXTO_AYUDA_LEGAL,
  TEXTO_ELIGE_PERSONA,
  etiquetaPersona,
  type TipoPersona,
  type VistaAlta,
} from "./dominio/alta.ts"
import { cuentaCorta, cuentaVisible, formatearClabe, type ClabeValida } from "./dominio/clabe.ts"
import type { BloqueCuenta, NegocioGuardado } from "./dominio/cuenta.ts"
import iconoAlerta from "./activos/icono-alerta.svg"
import iconoAyuda from "./activos/icono-ayuda.svg"
import iconoBanco from "./activos/icono-banco.svg"
import iconoBillete from "./activos/icono-billete.svg"
import iconoCampana from "./activos/icono-campana.svg"
import iconoCelular from "./activos/icono-celular.svg"
import iconoCheck from "./activos/icono-check.svg"
import iconoCheckChico from "./activos/icono-check-chico.svg"
import iconoChevron from "./activos/icono-chevron.svg"
import iconoQr from "./activos/icono-qr.svg"
import iconoReloj from "./activos/icono-reloj.svg"
import palomita from "./activos/palomita.svg"

const BENEFICIOS = [
  "El dinero llega directo a tu cuenta",
  "Sin terminal ni comisiones",
  "Efectivo y CoDi en un solo lugar",
] as const

function MarcaAlta() {
  return (
    <aside className="alta-marca">
      <img className="alta-logo" src={logoYakedo} alt="Yakedo" width={117} height={32} />
      <div className="alta-lema">
        <p>Cobra con CoDi. Sin comisión.</p>
        <p>Tu punto de venta gratis.</p>
      </div>
      <ul className="alta-beneficios">
        {BENEFICIOS.map((texto) => (
          <li key={texto}>
            <img src={palomita} alt="" width={28} height={28} />
            <span>{texto}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function AyudaCampo({ texto, tono }: { texto: string | null; tono: "ok" | "error" | "neutro" }) {
  if (!texto) return null
  return <p className={tono === "error" ? "campo-ayuda campo-ayuda-error" : tono === "ok" ? "campo-ayuda campo-ayuda-ok" : "campo-ayuda"}>{texto}</p>
}

export function PantallaAlta({
  clabe,
  nombre,
  nombreLegal,
  tipoPersona,
  vista,
  aviso,
  ocupado,
  alClabe,
  alNombre,
  alLegal,
  alTipo,
  alAyuda,
  alContinuar,
}: {
  clabe: string
  nombre: string
  nombreLegal: string
  tipoPersona: TipoPersona | null
  vista: VistaAlta
  aviso: string | null
  ocupado: boolean
  alClabe: (valor: string) => void
  alNombre: (valor: string) => void
  alLegal: (valor: string) => void
  alTipo: (tipo: TipoPersona) => void
  alAyuda: () => void
  alContinuar: () => void
}) {
  return (
    <main className="alta">
      <MarcaAlta />
      <section className="alta-formulario">
        <form
          className="alta-tarjeta"
          onSubmit={(evento) => {
            evento.preventDefault()
            alContinuar()
          }}
        >
          <div className="alta-titulo">
            <h1>Da de alta tu negocio</h1>
            <p>Con tu CLABE te llega el dinero directo.</p>
          </div>
          <label className="campo-negocio">
            CLABE interbancaria
            <input
              className={vista.clabeOk ? "campo-caja campo-caja-ok" : vista.clabeError ? "campo-caja campo-caja-error" : "campo-caja"}
              inputMode="numeric"
              autoComplete="off"
              value={formatearClabe(clabe)}
              onChange={(evento) => alClabe(evento.target.value)}
            />
            <AyudaCampo texto={vista.ayudaClabe} tono={vista.clabeError ? "error" : vista.clabeOk ? "ok" : "neutro"} />
          </label>
          <button className="enlace-ayuda" type="button" onClick={alAyuda}>
            <img src={iconoAyuda} alt="" width={22} height={22} />
            ¿Qué es esto?
          </button>
          <label className="campo-negocio">
            Nombre del negocio
            <input
              className={vista.nombreError ? "campo-caja campo-caja-error" : "campo-caja"}
              maxLength={40}
              value={nombre}
              onChange={(evento) => alNombre(evento.target.value)}
            />
            <AyudaCampo texto={vista.ayudaNombre} tono={vista.nombreError ? "error" : "neutro"} />
          </label>
          <label className="campo-negocio">
            Nombre legal
            <input className="campo-caja" value={nombreLegal} onChange={(evento) => alLegal(evento.target.value)} />
            <AyudaCampo texto={TEXTO_AYUDA_LEGAL} tono="neutro" />
          </label>
          <fieldset className="tipo-persona">
            <legend>Tipo de persona</legend>
            <div className="tipo-opciones">
              <button
                className={tipoPersona === "fisica" ? "opcion-persona opcion-persona-activa" : vista.personaError ? "opcion-persona opcion-persona-error" : "opcion-persona"}
                type="button"
                aria-pressed={tipoPersona === "fisica"}
                onClick={() => alTipo("fisica")}
              >
                <strong>Persona física</strong>
                <span>A tu nombre</span>
              </button>
              <button
                className={tipoPersona === "moral" ? "opcion-persona opcion-persona-activa" : vista.personaError ? "opcion-persona opcion-persona-error" : "opcion-persona"}
                type="button"
                aria-pressed={tipoPersona === "moral"}
                onClick={() => alTipo("moral")}
              >
                <strong>Persona moral</strong>
                <span>Empresa o sociedad</span>
              </button>
            </div>
            <AyudaCampo texto={vista.personaError ? TEXTO_ELIGE_PERSONA : null} tono="error" />
          </fieldset>
          {aviso ? <p className="campo-ayuda campo-ayuda-error">{aviso}</p> : null}
          <button
            className={vista.puedeContinuar && !ocupado ? "boton-principal boton-continuar" : "boton-principal boton-continuar boton-continuar-espera"}
            type="submit"
            aria-disabled={!vista.puedeContinuar || ocupado}
            disabled={ocupado}
          >
            Continuar
          </button>
          <p className="alta-nota">Nunca te pedimos contraseñas.</p>
        </form>
      </section>
    </main>
  )
}

export function DialogoAyudaClabe({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div className="ajustes-velo" role="presentation">
      <div className="dialogo-negocio" role="dialog" aria-modal="true" aria-labelledby="titulo-clabe">
        <h2 id="titulo-clabe">¿Qué es la CLABE?</h2>
        <p>Son los 18 números de tu cuenta de banco.</p>
        <p>La ves en la app de tu banco o en tu estado de cuenta.</p>
        <p>Ahí te llegan tus cobros CoDi.</p>
        <button className="boton-principal" type="button" onClick={alCerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}

function FilaEstado({ icono, titulo, detalle }: { icono: string; titulo: string; detalle: string }) {
  return (
    <div className="fila-estado">
      <img src={icono} alt="" width={24} height={24} />
      <div>
        <strong>{titulo}</strong>
        <p>{detalle}</p>
      </div>
    </div>
  )
}

export function PantallaEstado({
  negocio,
  bloque,
  alSeguir,
  alReintentar,
}: {
  negocio: NegocioGuardado
  bloque: BloqueCuenta
  alSeguir: () => void
  alReintentar: () => void
}) {
  const error = bloque.estado === "ERROR"
  const activa = bloque.estado === "ACTIVE"
  return (
    <main className="estado">
      <section className="estado-columna">
        <p className={error ? "pastilla pastilla-error" : activa ? "pastilla pastilla-ok" : "pastilla"}>{error ? "Error" : activa ? "Activa" : "Pendiente"}</p>
        <h1>{error ? "No se pudo activar" : activa ? "¡Ya quedó! Tu cuenta está activa." : "Estamos revisando tu cuenta"}</h1>
        <p className="estado-cuerpo">
          {error
            ? "No pudimos validar tu CLABE con tu banco. Revisa los datos o intenta otra vez."
            : activa
              ? "Ya puedes cobrar con CoDi. Cada pago llega directo a tu CLABE, sin comisión."
              : "Validamos tu CLABE con tu banco. Puede tardar hasta 5 días hábiles; casi siempre es antes. Te avisamos aquí cuando quede lista."}
        </p>
        <dl className="estado-datos">
          <div>
            <dt>CLABE</dt>
            <dd>{cuentaVisible(bloque.banco, bloque.ultimos4)}</dd>
          </div>
          <div>
            <dt>Nombre legal</dt>
            <dd>{negocio.nombreLegal}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{etiquetaPersona(negocio.tipoPersona)}</dd>
          </div>
        </dl>
        {activa ? (
          <>
            <FilaEstado icono={iconoQr} titulo="QR en pantalla" detalle="Tu cliente lo escanea desde la app de su banco." />
            <FilaEstado icono={iconoCampana} titulo="Aviso al celular" detalle="Le llega el cobro en la app de su banco." />
          </>
        ) : error ? (
          <>
            <FilaEstado icono={iconoBillete} titulo="Mientras, solo puedes cobrar en efectivo" detalle="CoDi sigue apagado hasta que tu cuenta quede activa." />
            <FilaEstado icono={iconoAlerta} titulo="Puedes intentar otra vez" detalle="El reintento vuelve a mandar tus datos a revisión." />
          </>
        ) : (
          <>
            <FilaEstado icono={iconoCheck} titulo="Ya puedes vender y cobrar en efectivo" detalle="Tus ventas quedan en el historial desde hoy." />
            <FilaEstado icono={iconoReloj} titulo="Cobrar con CoDi: en cuanto tu cuenta esté activa" detalle="Mientras, CoDi aparecerá deshabilitado al cobrar." />
          </>
        )}
        {error ? (
          <button className="boton-principal" type="button" onClick={alReintentar}>
            Intentar otra vez
          </button>
        ) : (
          <button className="boton-principal" type="button" onClick={alSeguir}>
            {activa ? "Ir al catálogo" : "Empezar a vender"}
          </button>
        )}
      </section>
    </main>
  )
}

export function PantallaVenta({
  nombre,
  aviso,
  alAjustes,
  alCobrar,
  alEstado,
}: {
  nombre: string
  aviso: string | null
  alAjustes: () => void
  alCobrar: () => void
  alEstado: () => void
}) {
  return (
    <main className="venta">
      <header className="ajustes-encabezado">
        <h1>{nombre}</h1>
        <button className="boton-secundario venta-accion" type="button" onClick={alAjustes}>
          Ajustes
        </button>
        <button className="boton-principal venta-accion" type="button" onClick={alCobrar}>
          Cobrar
        </button>
      </header>
      {aviso ? (
        <button className="banner-revision" type="button" onClick={alEstado}>
          <span>{aviso}</span>
          <strong>Ver estado</strong>
        </button>
      ) : null}
      {/* UI PROVISIONAL: falta en Figma el catálogo vacío de esta tarea; la cuadrícula es la tarea 2. */}
      <p className="venta-vacio">Tu catálogo aparece aquí.</p>
    </main>
  )
}

export function PantallaCobrar({
  motivo,
  alCerrar,
  alEstado,
}: {
  motivo: "primera" | "tramite" | null
  alCerrar: () => void
  alEstado: () => void
}) {
  const apagado = motivo !== null
  return (
    <main className="cobrar">
      <header className="ajustes-encabezado">
        <button className="boton-regresar" type="button" onClick={alCerrar}>
          <img src={iconoRegresar} alt="" width={22} height={22} />
          Cobrar
        </button>
      </header>
      <section className="cobrar-cuerpo">
        {/* UI PROVISIONAL: falta en Figma el ticket de esta tarea; el ticket real es la tarea 2.4. */}
        <p className="cobrar-ticket">Ticket #0043 · 4 productos</p>
        <p className="cobrar-total">
          <span>Total a cobrar</span>
          <strong>$122.00</strong>
        </p>
        <div className="cobrar-metodos">
          <button className="metodo-pago" type="button">
            <img src={iconoBillete} alt="" width={24} height={24} />
            <strong>Efectivo</strong>
          </button>
          <button className={apagado ? "metodo-pago metodo-pago-apagado" : "metodo-pago"} type="button" disabled={apagado}>
            <img src={iconoCelular} alt="" width={24} height={24} />
            <strong>CoDi</strong>
            {apagado ? <span className="pastilla">En revisión</span> : null}
            <span>{motivo === "tramite" ? "CoDi sigue apagado hasta que tu cuenta nueva quede activa." : motivo === "primera" ? "Se activa cuando tu cuenta quede lista." : "Tu cliente lo escanea desde la app de su banco."}</span>
          </button>
        </div>
        {apagado ? (
          <div className="banner-cobro">
            <p>{motivo === "tramite" ? "Mientras, solo puedes cobrar en efectivo" : "Mientras la revisamos, cobra en efectivo."}</p>
            <span className="pastilla">Hasta 5 días hábiles</span>
            <button className="boton-texto" type="button" onClick={alEstado}>
              Ver estado
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export function FilasNegocio({
  negocio,
  actual,
  nueva,
  puedeCambiar,
  avisoBloqueo,
  alNombre,
  alCambiar,
}: {
  negocio: NegocioGuardado
  actual: BloqueCuenta | null
  nueva: BloqueCuenta | null
  puedeCambiar: boolean
  avisoBloqueo: string | null
  alNombre: () => void
  alCambiar: () => void
}) {
  const enTramite = nueva && (nueva.estado === "PENDING" || nueva.estado === "PROCESSING")
  return (
    <div className="filas-negocio">
      <button className="fila-ajuste" type="button" onClick={alNombre}>
        <span>Negocio</span>
        <strong>{negocio.nombre}</strong>
        <img src={iconoChevron} alt="" width={24} height={24} />
      </button>
      {actual ? (
        <p className="fila-ajuste fila-ajuste-fija">
          <span>Cuenta para cobrar</span>
          <strong>{cuentaVisible(actual.banco, actual.ultimos4)}</strong>
        </p>
      ) : null}
      {enTramite ? (
        <p className="fila-ajuste fila-ajuste-fija">
          <span>Cuenta nueva</span>
          <strong>
            {nueva.banco} · CLABE •••• {nueva.ultimos4} · En trámite
          </strong>
        </p>
      ) : null}
      {actual?.estado === "ACTIVE" ? (
        <button className="boton-secundario" type="button" onClick={alCambiar} disabled={!puedeCambiar}>
          Cambiar CLABE
        </button>
      ) : null}
      {avisoBloqueo ? <p className="ajustes-bloqueo">{avisoBloqueo}</p> : null}
    </div>
  )
}

export function PantallaNombre({
  nombre,
  ayuda,
  error,
  puede,
  ocupado,
  alVolver,
  alNombre,
  alGuardar,
}: {
  nombre: string
  ayuda: string | null
  error: boolean
  puede: boolean
  ocupado: boolean
  alVolver: () => void
  alNombre: (valor: string) => void
  alGuardar: () => void
}) {
  return (
    <main className="alta">
      <section className="alta-formulario">
        {/* UI PROVISIONAL: falta en Figma la pantalla de editar el nombre. */}
        <form
          className="alta-tarjeta"
          onSubmit={(evento) => {
            evento.preventDefault()
            alGuardar()
          }}
        >
          <button className="boton-regresar" type="button" onClick={alVolver}>
            <img src={iconoRegresar} alt="" width={22} height={22} />
            Ajustes
          </button>
          <div className="alta-titulo">
            <h1>Nombre del negocio</h1>
          </div>
          <label className="campo-negocio">
            Nombre del negocio
            <input className={error ? "campo-caja campo-caja-error" : "campo-caja"} maxLength={40} value={nombre} onChange={(evento) => alNombre(evento.target.value)} />
            <AyudaCampo texto={ayuda} tono={error ? "error" : "neutro"} />
          </label>
          <button
            className={puede && !ocupado ? "boton-principal boton-continuar" : "boton-principal boton-continuar boton-continuar-espera"}
            type="submit"
            aria-disabled={!puede || ocupado}
            disabled={ocupado}
          >
            Continuar
          </button>
        </form>
      </section>
    </main>
  )
}

export function PantallaCambiar({
  nombre,
  actual,
  clabe,
  ayuda,
  error,
  puede,
  ocupado,
  alVolver,
  alClabe,
  alAyuda,
  alContinuar,
}: {
  nombre: string
  actual: BloqueCuenta
  clabe: string
  ayuda: string
  error: boolean
  puede: boolean
  ocupado: boolean
  alVolver: () => void
  alClabe: (valor: string) => void
  alAyuda: () => void
  alContinuar: () => void
}) {
  return (
    <main className="alta">
      <section className="alta-formulario">
        <form
          className="alta-tarjeta"
          onSubmit={(evento) => {
            evento.preventDefault()
            alContinuar()
          }}
        >
          <button className="boton-regresar" type="button" onClick={alVolver}>
            <img src={iconoRegresar} alt="" width={22} height={22} />
            Ajustes
          </button>
          <div className="alta-titulo">
            <h1>Cambiar CLABE</h1>
            <p>{nombre}</p>
            <p>La nueva reemplaza a la actual.</p>
          </div>
          <p className="cuenta-actual">
            <img src={iconoBanco} alt="" width={24} height={24} />
            <span>Cuenta actual</span>
            <strong>{cuentaVisible(actual.banco, actual.ultimos4)}</strong>
          </p>
          <label className="campo-negocio">
            CLABE interbancaria
            <input
              className={error ? "campo-caja campo-caja-error" : puede ? "campo-caja campo-caja-ok" : "campo-caja"}
              inputMode="numeric"
              autoComplete="off"
              value={formatearClabe(clabe)}
              onChange={(evento) => alClabe(evento.target.value)}
            />
            <AyudaCampo texto={ayuda} tono={error ? "error" : puede ? "ok" : "neutro"} />
          </label>
          <button className="enlace-ayuda" type="button" onClick={alAyuda}>
            <img src={iconoAyuda} alt="" width={22} height={22} />
            ¿Qué es esto?
          </button>
          <button
            className={puede && !ocupado ? "boton-principal boton-continuar" : "boton-principal boton-continuar boton-continuar-espera"}
            type="submit"
            aria-disabled={!puede || ocupado}
            disabled={ocupado}
          >
            Continuar
          </button>
          <p className="alta-nota">Nunca te pedimos contraseñas.</p>
        </form>
      </section>
    </main>
  )
}

export function DialogoConfirmarCambio({ cuenta, ocupado, alCancelar, alConfirmar }: { cuenta: ClabeValida; ocupado: boolean; alCancelar: () => void; alConfirmar: () => void }) {
  return (
    <div className="ajustes-velo" role="presentation">
      <div className="dialogo-negocio" role="dialog" aria-modal="true" aria-labelledby="titulo-cambiar">
        <h2 id="titulo-cambiar">¿Cambiar la CLABE?</h2>
        <p className="dialogo-cuenta">{cuentaCorta(cuenta.banco, cuenta.ultimos4)}</p>
        <div className="dialogo-acciones">
          <button className="boton-cancelar" type="button" onClick={alCancelar} disabled={ocupado}>
            Cancelar
          </button>
          <button className="boton-principal" type="button" onClick={alConfirmar} disabled={ocupado}>
            Cambiar CLABE
          </button>
        </div>
      </div>
    </div>
  )
}

export function DialogoSeguir({ cuenta, alEfectivo, alSeguir }: { cuenta: BloqueCuenta; alEfectivo: () => void; alSeguir: () => void }) {
  return (
    <div className="ajustes-velo" role="presentation">
      <div className="dialogo-negocio" role="dialog" aria-modal="true" aria-labelledby="titulo-seguir">
        <h2 id="titulo-seguir">¿Seguir cobrando?</h2>
        <p>La cuenta nueva puede tardar unos días hábiles. ¿Sigues cobrando con la cuenta actual mientras tanto?</p>
        <p className="dialogo-cuenta">{cuentaCorta(cuenta.banco, cuenta.ultimos4)}</p>
        <div className="dialogo-acciones">
          <button className="boton-secundario" type="button" onClick={alEfectivo}>
            Solo efectivo
          </button>
          <button className="boton-principal" type="button" onClick={alSeguir}>
            Seguir cobrando
          </button>
        </div>
      </div>
    </div>
  )
}

export function DialogoFalloCuenta({ cuenta, alCerrar }: { cuenta: BloqueCuenta; alCerrar: () => void }) {
  return (
    <div className="ajustes-velo" role="presentation">
      <div className="dialogo-negocio" role="dialog" aria-modal="true" aria-labelledby="titulo-fallo">
        <h2 id="titulo-fallo">No se pudo cambiar</h2>
        <p>La cuenta nueva no quedó activa. Sigues cobrando con la cuenta actual.</p>
        <p className="dialogo-cuenta">{cuentaCorta(cuenta.banco, cuenta.ultimos4)}</p>
        <button className="boton-principal" type="button" onClick={alCerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}

export function AvisoCuenta({ texto }: { texto: string }) {
  return (
    <p className="toast-cuenta" role="status">
      <img src={iconoCheckChico} alt="" width={24} height={24} />
      {texto}
    </p>
  )
}

export function MarcoCargando({ children }: { children: ReactNode }) {
  return (
    <main className="arranque">
      <p>{children}</p>
    </main>
  )
}
