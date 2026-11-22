import { useRef, type ReactNode } from "react"
import logoGoogle from "./activos/google-g.png"
import iconoAlerta from "./activos/icono-alerta.svg"
import iconoCerrar from "./activos/icono-cerrar-sesion.svg"
import iconoApp from "./activos/icono-yakedo.svg"
import iconoRegresar from "./activos/icono-regresar.svg"
import iconoReloj from "./activos/icono-reloj.svg"
import logoInverso from "./activos/logo-yakedo-inverso.svg"
import logoYakedo from "./activos/logo-yakedo.svg"
import { formatearNumero } from "./numero.ts"
import { textoDeCierre, textoEntrasteCon } from "./sesion.ts"
import {
  TEXTO_AVISO_CORREO,
  TEXTO_AVISO_LISTO,
  TEXTO_AVISO_OTRA_VEZ,
  TEXTO_AVISO_SEGUIR,
  TEXTO_AYUDA_CODIGO,
  TEXTO_AYUDA_NUMERO,
  TEXTO_AYUDA_NUMERO_PARCIAL,
  TEXTO_AYUDA_REENVIO,
  TEXTO_CATALOGO_APOYO,
  TEXTO_CIERRE_TITULO,
  TEXTO_CODIGO_VENCIDO,
  TEXTO_CUENTA_BLOQUEADA,
  TEXTO_CORREO_APOYO,
  TEXTO_CORREO_BOTON,
  TEXTO_CORREO_DE_GOOGLE_APOYO,
  TEXTO_CORREO_DE_GOOGLE_TITULO,
  TEXTO_CORREO_ETIQUETA,
  TEXTO_CORREO_TITULO,
  TEXTO_ENLAZAR_GOOGLE_APOYO,
  TEXTO_ENLAZAR_GOOGLE_TITULO,
  TEXTO_ESLOGAN,
  TEXTO_FALTA_CONFIRMAR_CORREO,
  TEXTO_REENVIAR,
  TEXTO_VINCULAR_APOYO,
  TEXTO_VINCULAR_NUMERO,
} from "./textos.ts"
import type { MetodoEntrada, UsuarioSesion } from "./tipos.ts"

export function PantallaArranque() {
  return (
    <main className="arranque">
      <img src={iconoApp} alt="" width={128} height={128} />
      <img className="arranque-logo" src={logoInverso} alt="Yakedo" width={264} height={72} />
      <p>{TEXTO_ESLOGAN}</p>
    </main>
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
  error,
  ocupado,
  alNumero,
  alGoogle,
}: {
  error: string | null
  ocupado: boolean
  alNumero: () => void
  alGoogle: () => void
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
        <p className="acceso-legal">Al entrar aceptas los Términos y el Aviso de privacidad.</p>
        {/* UI PROVISIONAL: falta en Figma el fallo de red o de configuración */}
        {error ? <p className="acceso-error">{error}</p> : null}
      </div>
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
        {/* UI PROVISIONAL: falta en Figma el título de vinculación */}
        <h2>{vinculando ? "Vincula tu número" : "¿Cuál es tu número?"}</h2>
        <p className="acceso-subtitulo">
          {vinculando
            ? TEXTO_VINCULAR_APOYO
            : "Te mandamos un código por SMS para entrar."}
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
            <img src={iconoAlerta} alt="" width={20} height={20} />
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
          Enviar código
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
            <img src={iconoAlerta} alt="" width={20} height={20} />
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

// UI PROVISIONAL: falta en Figma
export function PantallaCorreo({
  valor,
  error,
  ocupado,
  alCambiar,
  alGuardar,
}: {
  valor: string
  error: string | null
  ocupado: boolean
  alCambiar: (valor: string) => void
  alGuardar: () => void
}) {
  return (
    <Marco bienvenida={false} arriba>
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
          <span className="acceso-entrada">
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
      </form>
    </Marco>
  )
}

// UI PROVISIONAL: falta en Figma
export function PantallaAvisoCorreo({
  ocupado,
  alReenviar,
  alConfirmar,
  alSeguir,
}: {
  ocupado: boolean
  alReenviar: () => void
  alConfirmar: () => void
  alSeguir: () => void
}) {
  return (
    <Marco bienvenida={false} arriba>
      <div className="acceso-columna">
        <h2>{TEXTO_CORREO_TITULO}</h2>
        <p className="acceso-subtitulo">{TEXTO_AVISO_CORREO}</p>
        <button className="boton-principal" type="button" onClick={alConfirmar} disabled={ocupado}>
          {TEXTO_AVISO_LISTO}
        </button>
        <button className="boton-texto" type="button" onClick={alReenviar} disabled={ocupado}>
          {TEXTO_AVISO_OTRA_VEZ}
        </button>
        <button className="boton-texto" type="button" onClick={alSeguir}>
          {TEXTO_AVISO_SEGUIR}
        </button>
      </div>
    </Marco>
  )
}

// UI PROVISIONAL: falta en Figma
export function PantallaCorreoDeGoogle({ alGoogle, ocupado }: { alGoogle: () => void; ocupado: boolean }) {
  return (
    <Marco bienvenida={false} arriba>
      <div className="acceso-columna">
        <h2>{TEXTO_CORREO_DE_GOOGLE_TITULO}</h2>
        <p className="acceso-subtitulo">{TEXTO_CORREO_DE_GOOGLE_APOYO}</p>
        <button className="boton-google" type="button" onClick={alGoogle} disabled={ocupado}>
          <img src={logoGoogle} alt="" width={24} height={24} />
          Continuar con Google
        </button>
      </div>
    </Marco>
  )
}

// UI PROVISIONAL: falta en Figma
export function PantallaEnlazarGoogle({ alNumero }: { alNumero: () => void }) {
  return (
    <Marco bienvenida={false} arriba>
      <div className="acceso-columna">
        <h2>{TEXTO_ENLAZAR_GOOGLE_TITULO}</h2>
        <p className="acceso-subtitulo">{TEXTO_ENLAZAR_GOOGLE_APOYO}</p>
        <button className="boton-principal" type="button" onClick={alNumero}>
          Entrar con tu número
        </button>
      </div>
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
  faltaConfirmarCorreo,
  ocupado,
  alPedirCierre,
  alCancelarCierre,
  alConfirmarCierre,
  alVincular,
  alReenviarAviso,
  seccionNegocio,
  alCatalogo,
  alEditarCatalogo,
}: {
  usuario: UsuarioSesion
  metodo: MetodoEntrada
  hayCobroActivo: boolean
  avisoCierre: string | null
  confirmarCierre: boolean
  textoCierre: string
  faltaConfirmarCorreo: boolean
  ocupado: boolean
  alPedirCierre: () => void
  alCancelarCierre: () => void
  alConfirmarCierre: () => void
  alVincular: () => void
  alReenviarAviso: () => void
  seccionNegocio?: ReactNode
  alCatalogo?: () => void
  alEditarCatalogo?: () => void
}) {
  const entroCon = textoEntrasteCon(usuario, metodo)

  return (
    <main className="ajustes">
      <header className="ajustes-encabezado">
        {alCatalogo ? (
          <button className="boton-regresar ajustes-regreso-boton" type="button" onClick={alCatalogo}>
            <img src={iconoRegresar} alt="" width={22} height={22} />
            Catálogo
          </button>
        ) : (
          <p className="ajustes-regreso">Catálogo</p>
        )}
        <div>
          <h1>Ajustes</h1>
        </div>
      </header>
      <div className="ajustes-contenido">
        <section className="ajustes-tarjeta" aria-label="Tu negocio">
          <h2>Tu negocio</h2>
          {seccionNegocio}
          <p className="ajustes-fila">
            <span>Entraste con</span>
            <strong>{entroCon}</strong>
          </p>
          {hayCobroActivo ? <p className="ajustes-bloqueo">{TEXTO_CUENTA_BLOQUEADA}</p> : null}
        </section>
        <section className="ajustes-tarjeta" aria-label="Catálogo">
          <h2>Catálogo</h2>
          <p>{TEXTO_CATALOGO_APOYO}</p>
          <button className="fila-ajuste" type="button" onClick={alEditarCatalogo}>
            <span>Editar catálogo</span>
            <strong>Categorías y productos</strong>
          </button>
        </section>
        {!usuario.telefono ? (
          // UI PROVISIONAL: falta en Figma
          <section className="ajustes-tarjeta ajustes-vincular">
            <p>{TEXTO_VINCULAR_APOYO}</p>
            <button className="boton-principal" type="button" onClick={alVincular}>
              {TEXTO_VINCULAR_NUMERO}
            </button>
          </section>
        ) : null}
        {faltaConfirmarCorreo || (usuario.correo && !usuario.correoVerificado) ? (
          // UI PROVISIONAL: falta en Figma
          <section className="ajustes-tarjeta ajustes-vincular">
            <p>{TEXTO_FALTA_CONFIRMAR_CORREO}</p>
            <button className="boton-texto" type="button" onClick={alReenviarAviso} disabled={ocupado}>
              {TEXTO_AVISO_OTRA_VEZ}
            </button>
          </section>
        ) : null}
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
