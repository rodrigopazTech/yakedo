# Proposal

## Why

Yakedo (antes CodiPey) es un punto de venta gratuito para comercios de México que cobra con CoDi, sin comisión por transacción, a través de la API de Pey, y también en efectivo. Para el Hackatón México (postulación hasta el 10 de diciembre de 2026 a las 23:59, entrega el 12 de diciembre a la misma hora, zona America/Mexico_City) hace falta una demo pública, con Pey en productivo reaccionando de verdad al resultado del cobro. No se construye el núcleo sin esta spec (ROD-368), y solo cuentan como aprobación las palabras de Rodrigo.

## What Changes

Este cambio especifica el núcleo completo, en el orden de construcción acordado en las instrucciones del bot de programación:

- Acceso por teléfono con código SMS y por Google; datos aislados por negocio (ROD-378, ROD-379).
- Alta del negocio con CLABE, nombre del negocio y nombre legal; sección «Tu negocio» en Ajustes; estados de la cuenta en Pey y CoDi apagado mientras la cuenta no esté activa (ROD-387).
- Catálogo en Firestore con categorías y productos, foto opcional en Firebase Storage con iniciales de respaldo, «Agotado hoy» (ROD-386).
- Venta en una app web de diseño horizontal (primero escritorio y tablet horizontal, la versión de Figma), ticket, número de pedido con contador en transacción de Firestore, elegir método de pago y cobro en efectivo con cambio.
- Cobro con QR de CoDi vía Pey, con reloj propio de 360 s y expiración de 360 s enviada a Pey en cada cobro.
- Pendientes, estados del pedido, cancelación manual, historial y totales del día por fecha de pago.
- Pagos duplicados y pagos no esperados, con «Devuélvelo desde la app de tu banco». Un QR vencido nunca se paga: el banco lo rechaza.
- Cobro libre (monto sin producto, concepto opcional).
- Cambio de CLABE con cuenta nueva en trámite: el comercio elige si sigue con la cuenta actual (`ACTIVE`) hasta que la nueva quede `ACTIVE`.
- Lista de bancos con CoDi en `config/bancosCodi` (ROD-382).
- Arquitectura: Cloud Functions como único punto de contacto con Pey, webhooks con Standard Webhooks, reglas de Firestore por negocio.

**Después del hackatón** (decisión de Rodrigo del 21 de noviembre de 2026, 22:52): todo lo que dependa de ser app, en particular el modo sin internet (venta sin conexión, copia local, service worker). La capacidad `venta-sin-internet` se quitó de este cambio; el producto necesita internet para operar.

Queda fuera del núcleo y se tratará como **cambios de OpenSpec aparte**: la adaptación a pantallas chicas (`pantallas-chicas`, con diseños de Figma), el aviso push (cobro por `POST /codi/pn`) y la cuenta dividida, que entran a la demo si da tiempo, cada uno como cambio aparte después del núcleo; para el push sigue aplicando el corte del 29 de noviembre de 2026. Quedan fuera del todo: link de pago por WhatsApp, Alexa, impresora de tickets, caja física, Apple, correo con contraseña y el diseño para celular (entra en `pantallas-chicas`).

Los textos de pantalla se toman de las decisiones aprobadas en Linear y de Figma (archivo `UvhM8bq7kjQbTWdggchZAh`, tablero `18:29`) y se citan tal cual.

## Capabilities

### New Capabilities
- `acceso-y-negocio`: entrar con teléfono (SMS) o Google (misma cuenta si comparten correo), sesión, cerrar sesión, alta del negocio con CLABE, «Tu negocio» en Ajustes, cambio de CLABE con cuenta nueva en trámite y estados de la cuenta en Pey.
- `catalogo`: categorías y productos del negocio en Firestore, foto opcional en Firebase Storage, iniciales, «Agotado hoy», entradas a «Editar catálogo».
- `venta-y-pedidos`: pantalla de venta horizontal y diseño responsivo por fases, ticket, número de pedido consecutivo, método de pago, efectivo con cambio, estados del pedido, Pendientes y cancelación manual.
- `cobro-codi`: cobro con QR de CoDi, reloj de 360 s, cobro vencido, «Cobrar otra vez», un QR vencido nunca se paga, pago duplicado, pago no esperado, ayudas al cobrador.
- `cobro-libre`: cobrar un monto sin elegir producto, con concepto opcional.
- `historial-y-totales`: historial por día, detalle del ticket, intentos de cobro y tarjetas «Vendido hoy», CoDi y «Efectivo cobrado hoy».
- `bancos-codi`: lista de bancos con CoDi en `config/bancosCodi`, línea corta y hoja en la pantalla del QR.
- `integracion-pey`: Cloud Functions como único cliente de Pey, endpoints confirmados, webhooks firmados, idempotencia, enrutamiento por `bankAccountId`.
- `aislamiento-de-datos`: reglas de Firestore por negocio, unicidad de la CLABE, secretos fuera del repo.

### Modified Capabilities

Ninguna: es el primer cambio del proyecto y `openspec/specs` está vacío.

## Impact

- Código nuevo (aún no se escribe): app web React, Vite y TypeScript; Cloud Functions; reglas e índices de Firestore; configuración de Firebase Hosting.
- Sistemas externos: Pey (`api.pey.mx`, producción, una sola llave del equipo), Firebase (Auth con SMS exige plan Blaze), Banxico/codi.org.mx como fuente de la lista de bancos.
- Dependencias de Rodrigo: conectar el conector de Firebase con su cuenta, activar Blaze, dar acceso al repo público `yakedo`, cargar la llave de Pey y el secreto del webhook en la caja de secretos, usar una cuenta de Pey que ya esté `ACTIVE` para las pruebas productivas (la cuenta personal de Rodrigo puede seguir `PENDING`) y activar Firebase Storage para las fotos del catálogo.
- Issues de Linear relacionados: ROD-368, ROD-369, ROD-372, ROD-378, ROD-379, ROD-380, ROD-381, ROD-382, ROD-383, ROD-386, ROD-387, ROD-388.

## Decisiones de Rodrigo del 21 de noviembre de 2026 (22:52)

A. Lo que dependa de ser app queda fuera del hackatón: el modo sin internet se hace después. Se quitó `venta-sin-internet` y todo lo ligado (ventas que suben al volver la señal, CoDi que se apaga o prende según la conexión). El consecutivo de pedido ya no es problema: contador en una transacción de Firestore.
B. Diseño responsivo: primero escritorio y tablet horizontal (Figma); pantallas chicas en un cambio aparte, sin improvisar.
C. Un QR vencido nunca se paga. Se quitó el pago tardío y el texto «Venció 11:28 · pagó 11:31». Si llega el webhook de un QR que Yakedo ya dio por vencido por relojes distintos, es pago válido si el pedido sigue Pendiente.
D. Cambio de CLABE: aviso para elegir si se sigue con la cuenta actual hasta que la nueva quede `ACTIVE`; durante el trámite de la primera cuenta solo efectivo; «¡Ya quedó!…» sale cuando la cuenta nueva queda `ACTIVE`; los textos nuevos están pendientes de Diseño UI/UX.
E. Stack: Firebase, React, Vite y TypeScript, confirmado por Rodrigo el 21 de noviembre de 2026 a las 23:05.

## Decisiones de Rodrigo del 21 de noviembre de 2026 (23:05)

1. **Stack confirmado:** Firebase con React, Vite y TypeScript (P25).
2. **Cómo se entera la tablet (P6):** escucha el cobro en Firestore solo mientras está activo. No hay botón «Revisar pago». La consulta de respaldo a Pey queda solo en el servidor. Esto no es sincronización en vivo entre aparatos.
3. **Push y cuenta dividida (P4):** entran a la demo si da tiempo, cada uno como cambio de OpenSpec aparte después del núcleo. Para el push sigue el corte del 29 de noviembre de 2026.
4. **Pruebas productivas (P9):** se hacen con otra cuenta de Pey que ya esté `ACTIVE`. Ya no están bloqueadas por la cuenta personal de Rodrigo.
5. **Autorización de Pey (P8, cerrada):** Pey confirmó que no hace falta autorización por escrito para dar de alta cuentas de terceros; se puede hacer con la API key del equipo. La demo no se limita a CLABEs del equipo.
6. **Foto del producto (P11):** foto opcional en Firebase Storage, con reglas por negocio; si no hay foto, se muestran las iniciales.
7. **Monto máximo del cobro libre (P10):** $1,000.00 MXN; no se aceptan montos mayores. El texto de error está pendiente de Diseño UI/UX.
8. **Teléfono y Google (P15):** se vinculan por correo. Como el login por teléfono no trae correo, la app lo pide después de entrar con teléfono y pide confirmarlo con el aviso de Firebase. Rodrigo confirmó el 21 de noviembre de 2026 a las 23:13 que el correo se pide con confirmación del aviso de Firebase.

## Decidido por propuesta (Rodrigo puede cambiarlo)

- **P3 · Consecutivo de pedido:** contador por negocio en `negocios/{uid}/contadores/pedidos`, incrementado dentro de la transacción que crea el pedido; cuatro cifras.
- **P5 · Resuelta por la decisión C:** QR vencido nunca se paga; webhook tardío por relojes distintos: válido si el pedido sigue Pendiente, duplicado si estaba Pagado, no esperado si estaba Cancelado.
- **P1 · Resuelta por la decisión D.** Si el comercio responde que no sigue con la cuenta actual, CoDi se apaga hasta que la nueva quede `ACTIVE`. Un solo cambio de CLABE a la vez.
- **P2, P19, P22 · Obsoletas** por la decisión A (modo sin internet después del hackatón). Cancelar y cobrar en efectivo son operaciones en línea con transacción de Firestore.
- **P7 · Estados `PROCESSING` y `ERROR`:** CoDi apagado (primera cuenta) o se sigue con la cuenta actual (cambio de CLABE); los textos los entrega Diseño.
- **P12 y P24 · Textos y datos de ejemplo viejos de Figma:** rige lo aprobado en Linear; Diseño actualiza y quita «Venció 11:28 · pagó 11:31».
- **P13 · Campos de Pey:** nombre del negocio a `alias`, nombre legal a `name`, Persona física a `PERSON`, Persona moral a `BUSINESS`; se confirma con la respuesta real de Pey.
- **P14 · Banco de la CLABE:** se toma de los tres primeros números (clave de banco) y se valida el número de control con el algoritmo público de la CLABE; la lista de claves vive en la app.
- **P16 · Código SMS:** se usan los tiempos reales de Firebase Authentication; Diseño ajusta la cuenta regresiva.
- **P17 · «Hoy»:** zona America/Mexico_City para todos los negocios.
- **P18 · Bancos:** la hoja usa los cinco nombres de Figma; Dondé, Invex y BaBien no se nombran; el Banco del Bienestar queda en `porConfirmar` sin mostrarse como sí ni como no.
- **P20 · Issues cerrados con APK o sin internet** (ROD-365, ROD-383): no se reescriben.
- **P21 · «Regresar al carrito»:** el pedido queda solo en Pendientes y el carrito vuelve vacío.
- **P23 · Pago sin asignar:** se guarda solo para el servidor y se responde 200; Rodrigo lo revisa en la consola.
- **P8 · Cerrada:** Pey confirmó que no hace falta autorización por escrito para dar de alta cuentas de terceros; se registran con la API key del equipo. La demo no se limita a CLABEs del equipo.
- **P25, P6, P4, P9, P11, P10 y P15 · Resueltas** el 21 de noviembre de 2026 a las 23:05, como en la sección de arriba. El 21 de noviembre de 2026 a las 23:13 Rodrigo aprobó la spec con las palabras «Apruebo la spec» y confirmó la confirmación del correo después del login por teléfono.
