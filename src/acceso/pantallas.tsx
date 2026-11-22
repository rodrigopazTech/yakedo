import { useRef, type ReactNode } from "react"
import logoGoogle from "./activos/google-g.png"
import iconoAlerta from "./activos/icono-alerta.svg"
import iconoCerrar from "./activos/icono-cerrar-sesion.svg"
import iconoChevron from "./activos/icono-chevron.svg"
import iconoApp from "./activos/icono-yakedo.svg"
import iconoRegresar from "./activos/icono-regresar.svg"
import iconoReloj from "./activos/icono-reloj.svg"
import logoInverso from "./activos/logo-yakedo-inverso.svg"
import logoYakedo from "./activos/logo-yakedo.svg"
import { formatearNumero } from "./numero.ts"
import { textoDeCierre, textoEntrasteCon } from "./sesion.ts"
import {
  TEXTO_AVISO_PRIVACIDAD,
  TEXTO_AYUDA_CODIGO,
  TEXTO_AYUDA_NUMERO,
  TEXTO_AYUDA_NUMERO_PARCIAL,
  TEXTO_AYUDA_REENVIO,
  TEXTO_CAMBIAR_CORREO,
  TEXTO_CATALOGO_APOYO,
  TEXTO_CIERRE_TITULO,
  TEXTO_CODIGO_VENCIDO,
  TEXTO_CONFIRMA_BOTON,
  TEXTO_CONFIRMA_TITULO,
  TEXTO_CORREO_APOYO,
  TEXTO_CORREO_BOTON,
  TEXTO_CORREO_ETIQUETA,
  TEXTO_CORREO_TITULO,
  TEXTO_CUENTA_BLOQUEADA,
  TEXTO_CUENTAS_DISTINTAS,
  TEXTO_CUENTAS_DISTINTAS_APOYO,
  TEXTO_ENTENDIDO,
  TEXTO_ENVIANDO,
  TEXTO_ESLOGAN,
  TEXTO_FALLO_ENVIO,
  TEXTO_MISMA_CUENTA,
  TEXTO_MISMA_CUENTA_APOYO,
  TEXTO_REENVIAR,
  TEXTO_SEGUIR_CUENTA,
  TEXTO_SIN_RED,
  TEXTO_SIN_RED_TITULO,
  TEXTO_TERMINOS,
  TEXTO_VINCULAR_APOYO,
  TEXTO_VINCULAR_NUMERO,
  TEXTO_VINCULAR_TITULO,
  textoGoogleCuenta,
  textoTuCuenta,
} from "./textos.ts"
import type { DialogoAcceso, MetodoEntrada, UsuarioSesion } from "./tipos.ts"

export function PantallaArranque() {
  return (
    <main className="arranque">
      <img src={iconoApp} alt="" width={128} height={128} />
      <img className="arranque-logo" src={logoInverso} alt="Yakedo" width={264} height={72} />
      <p>{TEXTO_ESLOGAN}</p>
    </main>
  )
}

function Enlace({ children }: { children: string }) {
  return (
    <button className="enlace" type="button">
      {children}
    </button>
  )
}

function AvisoLegal() {
  return (
    <p className="acceso-legal">
      Al entrar aceptas los <Enlace>{TEXTO_TERMINOS}</Enlace> y el{" "}
      <Enlace>{TEXTO_AVISO_PRIVACIDAD}</Enlace>.
    </p>
  )
}

function DialogoSobreAcceso({
  dialogo,
  alCerrar,
  alContinuar,
}: {
  dialogo: DialogoAcceso
  alCerrar: () => void
  alContinuar: () => void
}) {
  const titulo =
    dialogo.tipo === "sin-red"
      ? TEXTO_SIN_RED_TITULO
      : dialogo.tipo === "coincide"
        ? TEXTO_MISMA_CUENTA
        : TEXTO_CUENTAS_DISTINTAS
  const apoyo =
    dialogo.tipo === "sin-red"
      ? TEXTO_SIN_RED
      : dialogo.tipo === "coincide"
        ? TEXTO_MISMA_CUENTA_APOYO
        : TEXTO_CUENTAS_DISTINTAS_APOYO

  return (
    <div className="ajustes-velo" role="presentation">
      <div className="dialogo-cierre" role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo">
        <h2 id="titulo-dialogo">{titulo}</h2>
        <p className="dialogo-cuerpo">{apoyo}</p>
        {dialogo.tipo === "coincide" ? <p className="dialogo-dato">{dialogo.correo}</p> : null}
        {dialogo.tipo === "distintas" ? (
          <div className="dialogo-dato">
            <p>{textoTuCuenta(dialogo.cuenta)}</p>
            <p>{textoGoogleCuenta(dialogo.google)}</p>
          </div>
        ) : null}
        {dialogo.tipo === "distintas" ? (
          <div className="dialogo-acciones dialogo-acciones-columna">
            <button className="boton-principal" type="button" onClick={alCerrar}>
              {TEXTO_SEGUIR_CUENTA}
            </button>
            <button className="boton-secundario" type="button" onClick={alCerrar}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="boton-principal" type="button" onClick={dialogo.tipo === "coincide" ? alContinuar : alCerrar}>
            {dialogo.tipo === "coincide" ? TEXTO_CORREO_BOTON : TEXTO_ENTENDIDO}
          </button>
        )}
      </div>
    </div>
  )
}

function Marco({
  bienvenida,
  arriba,
  children,
}: {
  bienvenida: boolean
  arriba: boolean
  children: ReactNode
}) {
  return (
    <main className={arriba ? "acceso acceso-arriba" : "acceso"}>
      <section className="acceso-marca" aria-label="Yakedo">
        <img className="acceso-logo" src={logoYakedo} alt="Yakedo" width={176} height={48} />
        {bienvenida ? (
          <>
            <h1 className="acceso-lema">Tu caja gratis, tu lana completa.</h1>
            <p className="acceso-apoyo">
              Cobra con CoDi y en efectivo desde esta tablet. Sin terminal y sin comisión.
            </p>
          </>
        ) : (
          <p className="acceso-nota">Solo tu número. Nada de contraseñas.</p>
        )}
      </section>
      <section className="acceso-formulario">{children}</section>
    </main>
  )
}

export function PantallaBienvenida({
  ocupado,
  dialogo,
  alNumero,
  alGoogle,
  alCerrarDialogo,
  alContinuarCoincidencia,
}: {
  ocupado: boolean
  dialogo: DialogoAcceso | null
  alNumero: () => void
  alGoogle: () => void
  alCerrarDialogo: () => void
  alContinuarCoincidencia: () => void
}) {
  return (
    <Marco bienvenida arriba={false}>
      <div className="acceso-columna">
        <h2>Entra a tu caja</h2>
        <p className="acceso-subtitulo">Sin contraseña: te mandamos un código por SMS.</p>
        <button className="boton-principal" type="button" onClick={alNumero} disabled={ocupado}>
          Entrar con tu número
        </button>
        <div className="acceso-separador" aria-hidden="true">
          <span />
          <p>o</p>
          <span />
        </div>
        <button className="boton-google" type="button" onClick={alGoogle} disabled={ocupado}>
          <img src={logoGoogle} alt="" width={24} height={24} />
          Continuar con Google
        </button>
        <p className="acceso-legal">¿Primera vez? Entra igual y luego das de alta tu CLABE.</p>
        <AvisoLegal />
      </div>
      {dialogo ? (
        <DialogoSobreAcceso dialogo={dialogo} alCerrar={alCerrarDialogo} alContinuar={alContinuarCoincidencia} />
      ) : null}
    </Marco>
  )
}

export function PantallaNumero({
  digitos,
  error,
  ocupado,
  vinculando,
  alCambiar,
  alEnviar,
  alRegresar,
}: {
  digitos: string
  error: string | null
  ocupado: boolean
  vinculando: boolean
  alCambiar: (valor: string) => void
  alEnviar: () => void
  alRegresar: () => void
}) {
  return (
    <Marco bienvenida={false} arriba>
      <form
        className="acceso-columna"
        onSubmit={(evento) => {
          evento.preventDefault()
          alEnviar()
        }}
      >
        <button className="boton-regresar" type="button" onClick={alRegresar}>
          <img src={iconoRegresar} alt="" width={22} height={22} />
          Regresar
        </button>
        <h2>{vinculando ? TEXTO_VINCULAR_TITULO : "¿Cuál es tu número?"}</h2>
        <p className="acceso-subtitulo">
          {vinculando ? TEXTO_VINCULAR_APOYO : "Te mandamos un código por SMS para entrar."}
        </p>
        <label className="acceso-campo">
          <span>Número de celular</span>
          <span className={error ? "acceso-entrada acceso-entrada-error" : "acceso-entrada"}>
            <span className="acceso-prefijo">+52</span>
            <input
              inputMode="numeric"
              autoComplete="tel-national"
              value={formatearNumero(digitos)}
              onChange={(evento) => alCambiar(evento.target.value)}
            />
          </span>
        </label>
        {error ? (
          <p className="acceso-error" role="alert">
            {error === TEXTO_FALLO_ENVIO ? null : <img src={iconoAlerta} alt="" width={20} height={20} />}
            {error}
          </p>
        ) : (
          <p className="acceso-ayuda">
            {digitos.length === 10 ? TEXTO_AYUDA_NUMERO : TEXTO_AYUDA_NUMERO_PARCIAL}
          </p>
        )}
        <button
          className={digitos.length === 10 && !ocupado ? "boton-principal" : "boton-principal boton-apagado"}
          type="submit"
          aria-disabled={digitos.length !== 10 || ocupado}
          disabled={ocupado}
        >
          {ocupado ? TEXTO_ENVIANDO : "Enviar código"}
        </button>
      </form>
    </Marco>
  )
}

export function PantallaCodigo({
  telefonoVisible,
  codigo,
  error,
  espera,
  ocupado,
  alCambiar,
  alCambiarNumero,
  alPedirOtro,
}: {
  telefonoVisible: string
  codigo: string
  error: string | null
  espera: string | null
  ocupado: boolean
  alCambiar: (valor: string) => void
  alCambiarNumero: () => void
  alPedirOtro: () => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const casillas = Array.from({ length: 6 }, (_, indice) => codigo[indice] ?? "")
  const activa = Math.min(codigo.length, 5)

  return (
    <Marco bienvenida={false} arriba>
      <div className="acceso-columna">
        <h2>Escribe el código</h2>
        <p className="acceso-subtitulo">Te lo mandamos por SMS al {telefonoVisible}.</p>
        <button className="boton-fantasma" type="button" onClick={alCambiarNumero}>
          Cambiar número
        </button>
        <div
          className="casillas"
          onClick={() => entrada.current?.focus()}
          onKeyDown={() => entrada.current?.focus()}
        >
          {casillas.map((numero, indice) => (
            <span
              key={indice}
              className={
                error ? "casilla casilla-error" : indice === activa && !numero ? "casilla casilla-activa" : "casilla"
              }
            >
              {numero}
            </span>
          ))}
          <input
            ref={entrada}
            className="casillas-entrada"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Código de 6 números"
            value={codigo}
            onChange={(evento) => alCambiar(evento.target.value)}
          />
        </div>
        {error ? (
          <p className="acceso-error" role="alert">
            {error === TEXTO_FALLO_ENVIO ? null : <img src={iconoAlerta} alt="" width={20} height={20} />}
            {error}
          </p>
        ) : (
          <p className="acceso-ayuda">{espera ? TEXTO_AYUDA_CODIGO : TEXTO_AYUDA_REENVIO}</p>
        )}
        {error === TEXTO_CODIGO_VENCIDO ? (
          <button className="boton-principal" type="button" onClick={alPedirOtro} disabled={ocupado}>
            {TEXTO_REENVIAR}
          </button>
        ) : espera ? (
          <p className="acceso-espera">
            <img src={iconoReloj} alt="" width={20} height={20} />
            {espera}
          </p>
        ) : (
          <button className="boton-secundario" type="button" onClick={alPedirOtro} disabled={ocupado}>
            {TEXTO_REENVIAR}
          </button>
        )}
      </div>
    </Marco>
  )
}

export function PantallaCorreo({
  valor,
  error,
  ocupado,
  dialogo,
  alCambiar,
  alGuardar,
  alCerrarDialogo,
  alContinuarCoincidencia,
}: {
  valor: string
  error: string | null
  ocupado: boolean
  dialogo: DialogoAcceso | null
  alCambiar: (valor: string) => void
  alGuardar: () => void
  alCerrarDialogo: () => void
  alContinuarCoincidencia: () => void
}) {
  return (
    <Marco bienvenida arriba={false}>
      <form
        className="acceso-columna"
        onSubmit={(evento) => {
          evento.preventDefault()
          alGuardar()
        }}
      >
        <h2>{TEXTO_CORREO_TITULO}</h2>
        <p className="acceso-subtitulo">{TEXTO_CORREO_APOYO}</p>
        <label className="acceso-campo">
          <span>{TEXTO_CORREO_ETIQUETA}</span>
          <span className="acceso-entrada acceso-entrada-correo">
            <input
              type="email"
              autoComplete="email"
              value={valor}
              onChange={(evento) => alCambiar(evento.target.value)}
            />
          </span>
        </label>
        {error ? (
          <p className="acceso-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="boton-principal" type="submit" disabled={ocupado}>
          {TEXTO_CORREO_BOTON}
        </button>
        <AvisoLegal />
      </form>
      {dialogo ? (
        <DialogoSobreAcceso dialogo={dialogo} alCerrar={alCerrarDialogo} alContinuar={alContinuarCoincidencia} />
      ) : null}
    </Marco>
  )
}

export function PantallaConfirmaCorreo({
  valor,
  ocupado,
  dialogo,
  alConfirmar,
  alCambiar,
  alCerrarDialogo,
  alContinuarCoincidencia,
}: {
  valor: string
  ocupado: boolean
  dialogo: DialogoAcceso | null
  alConfirmar: () => void
  alCambiar: () => void
  alCerrarDialogo: () => void
  alContinuarCoincidencia: () => void
}) {
  return (
    <Marco bienvenida arriba={false}>
      <div className="acceso-columna">
        <h2>{TEXTO_CONFIRMA_TITULO}</h2>
        <p className="acceso-subtitulo">{TEXTO_CORREO_APOYO}</p>
        <p className="acceso-correo">{valor}</p>
        <button className="boton-principal" type="button" onClick={alConfirmar} disabled={ocupado}>
          {TEXTO_CONFIRMA_BOTON}
        </button>
        <button className="boton-fantasma" type="button" onClick={alCambiar}>
          {TEXTO_CAMBIAR_CORREO}
        </button>
        <AvisoLegal />
      </div>
      {dialogo ? (
        <DialogoSobreAcceso dialogo={dialogo} alCerrar={alCerrarDialogo} alContinuar={alContinuarCoincidencia} />
      ) : null}
    </Marco>
  )
}

export function PantallaAjustes({
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
  const entroCon = textoEntrasteCon(usuario, metodo)

  return (
    <main className="ajustes">
      <header className="ajustes-encabezado">
        <button className="ajustes-catalogo" type="button">
          <img src={iconoRegresar} alt="" width={24} height={24} />
          Catálogo
        </button>
        <div>
          <h1>Ajustes</h1>
        </div>
      </header>
      <div className="ajustes-contenido">
        <section className="ajustes-tarjeta" aria-label="Tu negocio">
          <h2>Tu negocio</h2>
          <p className="ajustes-fila">
            <span>Negocio</span>
            <img src={iconoChevron} alt="" width={24} height={24} />
          </p>
          <p className="ajustes-fila">
            <span>Cuenta para cobrar</span>
            <img src={iconoChevron} alt="" width={24} height={24} />
          </p>
          {hayCobroActivo ? <p className="ajustes-bloqueo">{TEXTO_CUENTA_BLOQUEADA}</p> : null}
          <p className="ajustes-fila">
            <span>Entraste con</span>
            <strong>{entroCon}</strong>
          </p>
          {!usuario.telefono ? (
            <button className="boton-principal" type="button" onClick={alVincular}>
              {TEXTO_VINCULAR_NUMERO}
            </button>
          ) : null}
        </section>
        <section className="ajustes-tarjeta" aria-label="Catálogo">
          <h2>Catálogo</h2>
          <p>{TEXTO_CATALOGO_APOYO}</p>
          <p className="ajustes-fila">
            <span>Editar catálogo</span>
            <img src={iconoChevron} alt="" width={24} height={24} />
          </p>
        </section>
        <section className="ajustes-tarjeta ajustes-sesion" aria-label="Sesión">
          <h2>Sesión</h2>
          <p>Ciérrala si vas a prestar o cambiar la tablet.</p>
          <button
            className={hayCobroActivo ? "boton-cerrar boton-cerrar-bloqueado" : "boton-cerrar"}
            type="button"
            onClick={alPedirCierre}
            disabled={hayCobroActivo}
          >
            {hayCobroActivo ? null : <img src={iconoCerrar} alt="" width={22} height={22} />}
            Cerrar sesión
          </button>
          {hayCobroActivo && avisoCierre ? <p className="ajustes-bloqueo">{avisoCierre}</p> : null}
        </section>
      </div>
      {confirmarCierre ? (
        <div className="ajustes-velo" role="presentation">
          <div className="dialogo-cierre" role="dialog" aria-modal="true" aria-labelledby="titulo-cierre">
            <h2 id="titulo-cierre">{TEXTO_CIERRE_TITULO}</h2>
            <p>{textoCierre || textoDeCierre(metodo)}</p>
            <div className="dialogo-acciones">
              <button className="boton-cancelar" type="button" onClick={alCancelarCierre}>
                Cancelar
              </button>
              <button className="boton-confirmar-cierre" type="button" onClick={alConfirmarCierre} disabled={ocupado}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
