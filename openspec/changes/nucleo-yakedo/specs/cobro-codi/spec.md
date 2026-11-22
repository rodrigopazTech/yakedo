# Spec Delta

## Purpose

Define el cobro con QR de CoDi a través de Pey: cómo se crea, su reloj de 360 segundos, qué ve el comercio en cada estado y cómo se resuelven los pagos duplicados y no esperados, sabiendo que un cobro CoDi no se puede anular y que un QR vencido nunca se paga.

## ADDED Requirements

### Requirement: Crear el cobro con QR
Al elegir CoDi, la app SHALL pedir a una Cloud Function que cree un cobro QR con `POST /codi/qr` usando el total del pedido guardado en Firestore (no el que diga el cliente), el `bankAccountId` activo del negocio y la expiración de 360 segundos.

#### Scenario: Cobro creado
- **GIVEN** que la cuenta del negocio está `ACTIVE` y el pedido está Pendiente
- **WHEN** el comercio elige CoDi
- **THEN** la función crea el cobro en Pey con `amount` igual al total, `expiration` igual a 360, `bankAccountId` del negocio y `metadata` que identifica el pedido y el cobro, y la app dibuja el QR a partir del `qrString` recibido

#### Scenario: Pey no responde
- **WHEN** la creación del cobro falla
- **THEN** la app no muestra un QR, conserva el pedido Pendiente y ofrece reintentar o cobrar en efectivo

### Requirement: Pantalla del QR
La pantalla del QR SHALL mostrar «Cobro con CoDi», el número del ticket, «Total a pagar», el QR, la cuenta regresiva desde 6:00 con la hora de vencimiento, y la advertencia «Un cobro CoDi no se puede anular: vence solo a los 6 minutos. La venta se cierra cuando CoDi confirma el pago.»

#### Scenario: QR esperando pago
- **WHEN** se crea el cobro a las 12:41
- **THEN** la app muestra «6:00 para pagar · vence 12:47» y la cuenta baja cada segundo

#### Scenario: Indicación al cliente
- **WHEN** se muestra el QR
- **THEN** la app dice «Escanéalo con la app de tu banco: BBVA, Banorte, Santander, Banamex, HSBC, Azteca y más.» y «Pídele al cliente que abra la app de su banco y busque CoDi. La cámara del celular no lee este código.»

#### Scenario: Ver ticket
- **WHEN** el comercio toca «Ver ticket»
- **THEN** ve los productos del pedido sin interrumpir el cobro

### Requirement: Reloj propio de 360 segundos
Yakedo SHALL llevar su propio reloj de 360 segundos por cobro, porque Pey no marca cobros vencidos ni manda webhook de vencimiento, y SHALL mandar a Pey la expiración de 360 segundos en cada cobro; el banco rechaza un QR vencido (probado por Rodrigo el 21 de noviembre de 2026).

#### Scenario: Cobro activo
- **WHEN** el reloj de un cobro tiene tiempo
- **THEN** el cobro está activo y el pedido muestra «Cobrando» con la cuenta regresiva

#### Scenario: Reloj en cero
- **WHEN** el reloj llega a cero sin pago confirmado
- **THEN** el cobro queda vencido y el pedido sigue Pendiente y ese QR ya no se puede pagar

#### Scenario: Hora de referencia
- **WHEN** se calcula el vencimiento
- **THEN** se usa la hora de creación guardada por el servidor más 360 segundos, no la hora del aparato

### Requirement: Cobro vencido
Cuando el cobro vence, la app SHALL decir que el cobro venció y que la venta sigue abierta, y ofrecer cobrar otra vez, cobrar en efectivo o regresar al carrito.

#### Scenario: Pantalla de vencido
- **WHEN** el reloj llega a cero
- **THEN** la app muestra «El cobro venció», «No llegó el pago de $122. La venta sigue abierta.», «Cobrar otra vez», «Cobrar en efectivo» y «¿Dice que ya pagó? Revisa tu banco antes de cobrar otra vez.»

#### Scenario: Regresar al carrito
- **WHEN** el comercio toca «Regresar al carrito»
- **THEN** el pedido sigue Pendiente en Pendientes (ver P21)

### Requirement: Un cobro CoDi no se anula
La app SHALL tratar cada cobro CoDi como no anulable; si se necesita otro, SHALL crear un cobro nuevo y avisar con la frase exacta «Es otro cobro. Que pague solo uno.»

#### Scenario: Cobrar otra vez
- **WHEN** el comercio toca «Cobrar otra vez»
- **THEN** se crea un cobro nuevo con su propio reloj de 360 segundos y el pedido conserva el historial de intentos

#### Scenario: Otro cobro con uno activo
- **GIVEN** que ya hay un cobro activo del pedido
- **WHEN** el comercio crea otro
- **THEN** la app muestra «Es otro cobro. Que pague solo uno.»

### Requirement: Reusar el QR vigente
Mientras un QR siga vigente, la app SHALL poder mostrar el mismo QR sin crear otro cobro.

#### Scenario: Volver a un pedido con cobro vigente
- **GIVEN** un pedido Cobrando cuyo QR de las 12:41 sigue vigente
- **WHEN** el comercio vuelve a ese pedido desde Pendientes
- **THEN** la app muestra «Ticket #0043 · el mismo QR de las 12:41» y «Es el mismo QR: no se generó otro cobro.»

### Requirement: Pago confirmado por webhook
La app SHALL cerrar la venta con el primer pago que confirme CoDi, recibido por el webhook `codi.qr.payment_received`, y marcar el pedido Pagado con método «CoDi · QR».

#### Scenario: Pago dentro del reloj
- **GIVEN** un cobro activo
- **WHEN** llega el webhook firmado de ese cobro
- **THEN** el pedido pasa a Pagado, la app muestra «¡Ya quedó!» y el historial dice «Confirmado por Webhook del banco» con la hora

### Requirement: La tablet escucha el cobro activo
Mientras un cobro está activo, la pantalla del QR SHALL escuchar solo el documento de ese cobro en Firestore para mostrar «¡Ya quedó!» en cuanto el servidor lo marque pagado. Eso no es sincronización en vivo entre aparatos: el catálogo, el historial y los demás pedidos se siguen bajando al iniciar sesión, al recargar o al abrir su pantalla. No hay botón «Revisar pago».

#### Scenario: Pago con el cobro activo
- **GIVEN** que la tablet tiene en pantalla un cobro activo y está escuchando su documento
- **WHEN** la función del webhook marca ese cobro como pagado
- **THEN** la misma tablet muestra «¡Ya quedó!» sin recargar

#### Scenario: El reloj llega a cero
- **WHEN** el reloj de Yakedo llega a cero
- **THEN** la tablet deja de escuchar ese documento

#### Scenario: Webhook después de que Yakedo dio por vencido el cobro
- **WHEN** el servidor marca el pedido Pagado porque llegó el webhook con relojes distintos y el pedido seguía Pendiente
- **THEN** la tablet se entera al volver a leer de la nube (Pendientes, historial o recargar), no por una escucha en vivo

#### Scenario: Otro aparato
- **WHEN** el mismo negocio está abierto en otro navegador que no tiene ese cobro en pantalla
- **THEN** ese aparato no recibe el pago al instante; lo ve al recargar o al abrir Pendientes o el historial

#### Scenario: Pago del mismo cobro dos veces
- **WHEN** llega otra vez el mismo webhook (mismo `webhook-id`)
- **THEN** no se registra un segundo pago

### Requirement: Un QR vencido nunca se paga
Un QR vencido SHALL darse por imposible de pagar, porque el banco lo rechaza (confirmado por Rodrigo el 21 de noviembre de 2026); la app no SHALL mostrar ningún flujo de pago tardío, y la única forma de cobrar un pedido con QR vencido es un cobro nuevo o efectivo.

#### Scenario: Pedido con QR vencido
- **GIVEN** un pedido Pendiente cuyo cobro venció
- **WHEN** el comercio quiere cobrarlo
- **THEN** la app ofrece «Cobrar otra vez» (cobro nuevo) o «Cobrar en efectivo», nunca esperar el QR viejo

#### Scenario: Historial de un intento vencido
- **WHEN** el comercio abre un pedido con un intento vencido
- **THEN** el intento dice que venció y la hora (texto pendiente de Diseño UI/UX; el texto «Venció 11:28 · pagó 11:31» ya no existe)

### Requirement: Webhook de un QR que Yakedo ya dio por vencido
Si llega el webhook de un QR que Yakedo ya da por vencido porque los relojes no coinciden, la función SHALL tratarlo como pago válido si el pedido sigue Pendiente, como «Pago duplicado» si ya estaba Pagado y como «Pago no esperado» si estaba Cancelado.

#### Scenario: Relojes distintos con el pedido Pendiente
- **GIVEN** un pedido Pendiente cuyo cobro Yakedo da por vencido
- **WHEN** llega el webhook firmado de ese cobro con `datePaid` dentro de la vigencia de Pey
- **THEN** el pedido pasa a Pagado como cualquier pago normal y el historial dice «Confirmado por Webhook del banco»

#### Scenario: Relojes distintos con el pedido cancelado
- **GIVEN** un pedido que se canceló después de que Yakedo dio por vencido el cobro
- **WHEN** llega el webhook de ese cobro
- **THEN** el pago queda como «Pago no esperado» y el pedido sigue Cancelado

### Requirement: Pago duplicado
Un segundo pago de un pedido que ya estaba pagado SHALL marcarse como «Pago duplicado» y acompañarse de «Devuélvelo desde la app de tu banco»; no cambia el estado del pedido.

#### Scenario: CoDi dos veces
- **GIVEN** un pedido Pagado con CoDi por $95
- **WHEN** entra un segundo pago CoDi del mismo pedido
- **THEN** el pedido sigue Pagado, el segundo pago queda como «Pago duplicado» y la app dice «Devuélvelo desde la app de tu banco.»

#### Scenario: Efectivo y luego CoDi
- **GIVEN** un pedido Pagado en efectivo con un QR que seguía activo
- **WHEN** el cliente paga también el QR
- **THEN** el segundo pago queda como «Pago duplicado» con «Devuélvelo desde la app de tu banco.»

### Requirement: Pago no esperado
Un pago CoDi que llega a un pedido ya Cancelado SHALL marcarse como «Pago no esperado», sin reabrir la venta, con «Devuélvelo desde la app de tu banco».

#### Scenario: Aviso en pantalla
- **WHEN** llega un pago de $65 al pedido cancelado #0041
- **THEN** la app muestra «Te llegó un pago no esperado del pedido #0041 · $65», «El pedido estaba cancelado: no se reabre la venta. Devuélvelo desde la app de tu banco.» y los botones «Ver pedido» y «Entendido»

#### Scenario: En el historial
- **WHEN** el comercio abre el pedido #0041
- **THEN** sigue Cancelado («Cancelado a las 12:35») y el intento aparece como «No esperado»

### Requirement: Cobrar en efectivo con un QR activo
«Mejor cobrar en efectivo» SHALL cambiar a efectivo el método del mismo pedido, sin cancelarlo ni duplicarlo, y la app SHALL avisar cuánto tiempo sigue activo el QR.

#### Scenario: Efectivo con QR vigente
- **WHEN** el comercio cobra en efectivo con el QR vigente
- **THEN** la app muestra «El QR sigue activo 4:12 min. Pídele que ya no lo escanee.»

#### Scenario: Explicación de efectivo y duplicado
- **WHEN** el comercio abre «¿Qué es esto?» en «Cobro CoDi activo»
- **THEN** la app dice «Si lo paga antes, queda en este ticket como pagado con CoDi.» y «Si ya cobraste en efectivo, sale como Pago duplicado y lo devuelves desde tu banco.»

### Requirement: Ayuda cuando el banco del cliente falla
La app SHALL ofrecer una ayuda al cobrador cuando el banco del cliente muestra «Operación no realizada», sin presentarla como un error de Yakedo.

#### Scenario: Abrir la ayuda
- **WHEN** el comercio abre la ayuda del banco
- **THEN** la app dice «A veces la app del banco falla. Eso no cancela el cobro: puede intentarlo otra vez.», «Que vuelva a escanear este mismo QR. No generes otro.», «Que revise su saldo y que su app esté actualizada.», «Si sigue fallando, cobra en efectivo.» y «Yakedo no recibe este error del banco. Solo te avisa cuando CoDi confirma el pago.»

### Requirement: CoDi solo con cuenta activa
El método CoDi SHALL estar disponible solo si el negocio tiene una cuenta de Pey `ACTIVE` con la que cobrar (ver acceso-y-negocio para la cuenta nueva en trámite).

#### Scenario: Cuenta no activa
- **GIVEN** un negocio cuya primera cuenta está `PENDING`, `PROCESSING` o `ERROR`
- **WHEN** el comercio elige el método de pago
- **THEN** CoDi aparece deshabilitado, no se crea ningún cobro y solo se cobra en efectivo

### Requirement: Aviso push fuera del núcleo
El panel «¿No puede escanear?» con «Mándale el cobro a su celular.» y «Enviar aviso», el estado «Aviso enviado» y los textos «CoDi · Aviso» y «Aviso enviado a» SHALL pertenecer al cambio aparte `aviso-push`; en el núcleo NO SHALL crearse cobros con `POST /codi/pn` (ver P4).

#### Scenario: Push fuera de la demo
- **WHEN** el push no pasa el corte del 29 de noviembre de 2026
- **THEN** la pantalla del QR no muestra el panel de aviso y el cobro se hace solo con QR o efectivo
