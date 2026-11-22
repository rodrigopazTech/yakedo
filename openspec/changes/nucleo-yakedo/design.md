## Context

Yakedo es una app web (React, Vite, TypeScript) para tablet y pantalla grande, con Firebase (Auth con teléfono y Google, Firestore, Cloud Functions, Hosting y Storage) y Pey como proveedor de CoDi. El repositorio `yakedo` es público, así que nada secreto puede vivir en él. Rodrigo confirmó el 21 de noviembre de 2026 el stack (Firebase, React, Vite y TypeScript), la expiración de 360 s, que no hay sincronización en vivo entre aparatos (los datos se bajan al iniciar sesión, recargar o abrir su pantalla) y que push y cuenta dividida son cambios aparte que entran a la demo si da tiempo, después del núcleo.

Hechos de Pey que condicionan el diseño (solo lo que está documentado): un QR no es una transacción; `POST /codi/qr` devuelve `id` y `qrString` (Pey recomienda dibujar el QR en el cliente); no hay webhook de rechazo ni de vencimiento; el webhook `codi.qr.payment_received` trae `codiQrId`, `bankAccountId` (solo si se mandó), `metadata`, `datePaid`, `transactionId`; hay un solo webhook por llave; la firma es Standard Webhooks sobre el cuerpo crudo; `bank.account.updated` solo se manda al pasar a `ACTIVE`.

## Goals / Non-Goals

**Goals:**
- Que un negocio se dé de alta, arme su catálogo, venda en efectivo o con CoDi, y vea su historial, con Pey en productivo reaccionando al pago real.
- Que ningún negocio pueda ver ni tocar datos de otro, y que ningún secreto llegue al repositorio.
- Que el comercio pueda cambiar su CLABE sin dejar de cobrar con la cuenta actual.

**Non-Goals:**
- Aviso push (`POST /codi/pn`) y cuenta dividida dentro de esta spec: van como cambios `aviso-push` y `cuenta-dividida` después del núcleo, y entran a la demo si da tiempo (el push sigue sujeto al corte del 29 de noviembre de 2026).
- Link de pago por WhatsApp, Alexa, impresora de tickets, caja física, Apple, correo con contraseña, diseño para celular.
- Modo sin internet (venta sin conexión, copia local, service worker): queda para **después del hackatón** por decisión de Rodrigo del 21 de noviembre de 2026. La app requiere conexión.
- Adaptación a pantallas chicas: cambio aparte `pantallas-chicas`, con diseños de Figma.
- Sincronización en vivo entre aparatos: no forma parte del núcleo. La escucha de Firestore de un cobro activo es solo en la tablet que lo tiene en pantalla, para mostrar «¡Ya quedó!».
- Cualquier endpoint o regla de Pey que no esté confirmado.

## Decisions

### 1. Un documento de negocio por usuario
`negocios/{uid}` guarda el nombre, el nombre legal, el tipo de persona, el correo (el que se pide después de entrar con teléfono, o el de Google) y los últimos números de la CLABE con el nombre del banco. Colgando de él: `categorias`, `productos`, `pedidos` y, dentro de cada pedido, `cobros`. La cuenta de Pey vive aparte, en `negocios/{uid}/cuenta/pey`, con dos bloques: `actual` y `nueva` (cada uno con `bankAccountId`, estado `PENDING | PROCESSING | ACTIVE | ERROR`, banco y últimos 4 números) y la elección del comercio `seguirConActual`. Es de solo lectura para el dueño y la escriben solo las funciones; así las reglas no necesitan filtrar campos. Al activarse `nueva` pasa a ser `actual`. La CLABE completa se guarda solo en un documento privado del servidor (propuesta; el cliente solo ve los últimos números).

Alternativa descartada: negocio y usuario separados con un campo de pertenencia; añade una consulta y una regla más sin beneficio, porque una persona tiene un solo negocio.

### 2. Estados del pedido
El pedido guarda `pendiente`, `pagado` o `cancelado`. «Cobrando» no se guarda: es un pedido Pendiente cuyo cobro más reciente aún no vence. Así un reloj que llega a cero no deja un estado viejo guardado.

Campos principales de `pedidos/{id}`: `numero` (del contador `negocios/{uid}/contadores/pedidos`, incrementado en la misma transacción que crea el pedido), `tipo` (`venta` o `libre`), `concepto`, `items`, `total`, `estado`, `creadoEn`, `pagadoEn`, `metodo` (`efectivo` o `codi`), `efectivo` (`recibido`, `cambio`), `cobroActivoId`. Los totales se calculan siempre del pedido guardado.

### 3. Cobros y pagos
`pedidos/{id}/cobros/{cobroId}` guarda `codiQrId`, `qrString`, `monto`, `creadoEn` (hora del servidor), `venceEn` (`creadoEn` más 360 s), `estado` (`activo`, `vencido`, `pagado`) y los pagos recibidos. Los pagos se guardan como subdocumentos `pagos/{webhookId}` con `tipo` (`normal`, `duplicado`, `no_esperado`), `monto`, `datePaid` y `transactionId`.

El reloj del cliente toma `venceEn` y la diferencia con la hora del servidor devuelta por la función al crear el cobro, así que un aparato con la hora mal puesta no cambia el vencimiento. Como la app siempre está en línea, siempre hay hora de servidor. Un QR vencido nunca se paga porque el banco lo rechaza; si aun así llega el webhook por relojes distintos, se resuelve con la tabla de abajo.

### 4. Resolución de pagos
Una sola transacción de Firestore, dentro de la función del webhook, decide:

| Estado del pedido al llegar el pago | Resultado |
|---|---|
| Pendiente (cobro activo; o vencido solo por diferencia de relojes) | Pedido Pagado con CoDi; pago `normal` |
| Pagado | Pago `duplicado`; el pedido no cambia |
| Cancelado | Pago `no_esperado`; el pedido no se reabre |

Los totales suman el pago en el día de `datePaid`. Los pagos `duplicado` y `no_esperado` suman solo en la tarjeta de CoDi como «por devolver».

### 5. Funciones de Cloud Functions
- `registrarNegocio` (callable): valida CLABE y unicidad, crea el negocio y llama a `POST /bank-account`.
- `consultarCuenta` (callable): `GET /bank-account/:id` y actualiza el estado.
- `crearCobroQr` (callable): lee el pedido, valida que no esté cancelado ni pagado y que la cuenta sea `ACTIVE`, llama a `POST /codi/qr` con `expiration: 360`, `bankAccountId` y `metadata` con `negocioId`, `pedidoId` y `cobroId`, y guarda el cobro.
- `cancelarPedido` (callable): cancela en una transacción solo si no hay un cobro activo (propuesta).
- `cambiarClabe` (callable): valida unicidad, registra la cuenta nueva con `POST /bank-account` y la guarda como `nueva` sin quitar la `actual`.
- `webhookPey` (HTTP): verifica Standard Webhooks, aplica idempotencia por `webhook-id`, enruta por `codiQrId` y resuelve el pago; con `bank.account.updated` activa la cuenta (`actual` o `nueva`, y si era la `nueva` hace el cambio).
- `consultarCobro` (solo servidor, no es callable desde la app ni hay botón «Revisar pago»): consulta de respaldo con `GET /transaction/codi/qr/:id`, por ejemplo cuando el reloj de Yakedo vence el cobro.

La llave de la API y el secreto del webhook se leen de secretos de las funciones; no existen en el cliente.

### 6. Reglas de Firestore
Se escriben por negocio: un usuario solo accede a `negocios/{su uid}/**`. Los documentos `cuenta`, `cobros`, `pagos` y el campo `cobroActivoId` son de solo lectura para el cliente. El cliente puede dejar un pedido como `pagado` solo con `metodo == 'efectivo'`, dentro de una transacción que comprueba que el pedido no estaba ya pagado o cancelado. `config/bancosCodi` es de lectura para cualquier sesión y sin escritura. Los índices de CLABE, los webhooks procesados y los pagos sin asignar no son accesibles al cliente. Se prueban con el emulador.

### 7. Conexión
La app requiere internet. Se usan las transacciones de Firestore para el contador de pedidos, el cobro en efectivo y la cancelación, y no se activa la caché persistente ni un service worker. El modo sin internet es un cambio posterior al hackatón.

### 8. Cómo se entera la tablet del pago (decidido)
Mientras hay un cobro activo, la pantalla de esa tablet escucha solo el documento de ese cobro en Firestore para pasar a «¡Ya quedó!» en cuanto el webhook lo marque pagado. Al llegar el reloj a cero, deja de escuchar. Esto no es sincronización en vivo entre aparatos: el catálogo, el historial y los demás pedidos se bajan al iniciar sesión, al recargar o al abrir su pantalla. No hay botón «Revisar pago». Si el webhook llega después de que Yakedo dio el cobro por vencido (relojes distintos) y el pedido seguía Pendiente, el servidor lo marca Pagado y la tablet se entera al volver a leer de la nube. La consulta de respaldo a Pey vive solo en el servidor.

### 8b. Teléfono y Google se vinculan por correo
El login por teléfono de Firebase no trae correo. Después de entrar con teléfono, si la cuenta no tiene correo, la app lo pide, lo guarda en el usuario (`updateEmail`) y en el negocio, y pide confirmarlo con el aviso de Firebase (`sendEmailVerification`) antes de considerarlo ligado. Cuando más tarde entra con Google con ese mismo correo, se enlaza el proveedor al mismo `uid` (`linkWithCredential` / el flujo de cuenta existente con distinto proveedor). Si entra primero con Google y después con teléfono, escribe el mismo correo: no se crea un segundo negocio; se le pide entrar con Google y vincular el número desde Ajustes con `linkWithPhoneNumber`. Dos correos distintos son dos cuentas. Los textos están pendientes de Diseño UI/UX. Rodrigo confirmó el 21 de noviembre de 2026 a las 23:13 que el correo se confirma con el aviso de Firebase.

### 8c. Fotos en Firebase Storage
Las fotos opcionales del producto viven en `negocios/{uid}/productos/{productoId}/foto`. Las reglas de Storage solo dejan leer y escribir al dueño. Sin foto, la tarjeta muestra las iniciales.

### 9. Lista de bancos
`config/bancosCodi` con `actualizado`, `fuente`, `destacados`, `siSirven`, `porConfirmar`, `noSirven` y `notaOpcional`. La app lo lee al abrir la hoja.

### 9b. Stack: Firebase, React, Vite y TypeScript (confirmado el 21 de noviembre de 2026, 23:05)
Rodrigo preguntó si conviene Supabase en vez de Firebase, creyendo que Firebase hace falta por el login con teléfono. Análisis breve:

- **Login por SMS en México:** Firebase Authentication lo trae integrado, México está entre las regiones con buena entrega, cuesta $0.05 por SMS y los primeros 10 SMS por día no se cobran (documentación de Firebase e Identity Platform); exige plan Blaze desde septiembre de 2024. Supabase ofrece login por teléfono pero necesita un proveedor externo (Twilio, MessageBird, Vonage o TextLocal) con su propia cuenta y costo, o un Send SMS Hook con Edge Function; es más piezas que armar.
- **Webhooks de Pey:** las dos opciones sirven. Cloud Functions (Node y TypeScript) o Edge Functions (Deno) pueden verificar Standard Webhooks sobre el cuerpo crudo. Las funciones de Firebase comparten lenguaje con la app.
- **Hosting y costos:** Firebase Hosting ya está en el plan aprobado. Blaze es obligatorio de todos modos para SMS y para Cloud Functions, y la capa gratuita de funciones (2 millones de invocaciones al mes) cubre la demo; se recomienda poner alertas de presupuesto. Supabase tiene plan gratis (los proyectos gratis se pausan tras una semana sin actividad), pero no quita la necesidad de pagar un proveedor de SMS.
- **Tiempo:** quedan unos 21 días hasta la entrega del 12 de diciembre de 2026 y Rodrigo dispone de menos de ocho horas a la semana. Cambiar de backend obliga a reescribir reglas, contador, funciones y pruebas ya especificadas (Firestore, transacciones, reglas por negocio) sin ganar nada visible en la demo.

**Decisión:** Firebase (Auth con teléfono y Google, Firestore, Cloud Functions, Hosting y Storage), con React, Vite y TypeScript tanto en la app como en las funciones. No hace falta un framework de servidor como Next.js porque Hosting sirve archivos estáticos y toda la lógica sensible vive en las funciones.

### 10. Pruebas y secretos
Pruebas unitarias de reglas de cobro (resolución de pagos, reloj, totales), pruebas del emulador para las reglas, pruebas de la función del webhook con firmas válidas e inválidas, pruebas de las reglas de Storage, y una prueba de punta a punta con Pey en productivo usando una cuenta que ya esté `ACTIVE` (no la cuenta personal de Rodrigo, que puede seguir `PENDING`). `.env` y equivalentes están en `.gitignore`; solo se versiona `.env.example`.

## Risks / Trade-offs

- **Cuenta personal de Rodrigo en Pey en `PENDING`** → las pruebas productivas se hacen con otra cuenta ya `ACTIVE`; el webhook también se prueba con firmas del SDK de Standard Webhooks.
- **Webhook perdido** → la venta queda Pendiente aunque el cliente pagó; mitigación: consulta de respaldo solo en el servidor y la advertencia «¿Dice que ya pagó? Revisa tu banco antes de cobrar otra vez.»
- **Dos pagos casi simultáneos** → la transacción deja un solo pago normal.
- **Cambio de CLABE** → la cuenta nueva en Pey puede tardar días hábiles en activarse; mientras tanto el comercio elige seguir con la cuenta actual (decisión D). Los textos del aviso esperan a Diseño UI/UX.
- **Foto de producto** → se guarda en Firebase Storage, con reglas por negocio y pruebas en el emulador.
- **Pey puede fallar o cambiar** → solo se usan endpoints confirmados y todo pasa por funciones, así que el cambio queda en un lugar.

## Migration Plan

No hay datos previos. El despliegue es de cero: reglas e índices de Firestore, reglas de Storage, funciones y hosting. Si una función falla en producción, se vuelve a la versión anterior de las funciones y los pedidos no se pierden porque el cliente guarda primero en Firestore.

## Open Questions

Las decisiones del 21 de noviembre de 2026 (22:52 y 23:05) y lo decidido por propuesta están en `proposal.md`. Rodrigo aprobó la spec el 21 de noviembre de 2026 a las 23:13 y confirmó la confirmación del correo con el aviso de Firebase. No quedan preguntas abiertas de producto en este cambio.
