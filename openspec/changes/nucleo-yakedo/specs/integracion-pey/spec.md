# Spec Delta

## Purpose

Define cómo Yakedo habla con Pey desde Cloud Functions: qué endpoints usa, cómo se reciben y verifican los webhooks con Standard Webhooks, cómo se evitan duplicados y cómo se manejan los estados de la cuenta, sin inventar nada que la documentación de Pey no confirme.

## ADDED Requirements

### Requirement: Solo Cloud Functions hablan con Pey
Toda llamada a Pey SHALL salir de una Cloud Function de Yakedo; la app web nunca SHALL tener ni usar la llave de la API ni el secreto del webhook.

#### Scenario: Secretos
- **WHEN** se despliegan las funciones
- **THEN** la llave de la API y el secreto del webhook se leen de secretos de las funciones o variables de entorno, y nunca están en el repositorio, en el navegador ni en el chat

#### Scenario: Llamada desde la app
- **WHEN** la app necesita crear un cobro o dar de alta una cuenta
- **THEN** llama a una función de Yakedo con la sesión del usuario y la función valida que el negocio sea suyo antes de llamar a Pey

### Requirement: Endpoints permitidos
El núcleo SHALL usar únicamente `POST /bank-account`, `GET /bank-account/:id`, `POST /codi/qr` y las consultas de transacciones de solo lectura; `POST /codi/pn` queda para el cambio `aviso-push`, y ningún otro endpoint ni regla de Pey se supone.

#### Scenario: Endpoint no documentado
- **WHEN** una tarea necesita un endpoint de Pey que no está en la lista
- **THEN** se registra como pregunta abierta y no se implementa hasta que Pey lo confirme

### Requirement: Alta de la cuenta del negocio en Pey
Al terminar el alta, una función SHALL llamar a `POST /bank-account` con `alias`, `name`, `clabe` y `entity` (`BUSINESS` o `PERSON`) y guardar el `bankAccountId` y el estado del negocio (ver P13).

#### Scenario: Alta aceptada
- **WHEN** Pey acepta la cuenta
- **THEN** la función guarda el `bankAccountId` y el estado `PENDING` en el negocio (como cuenta actual si es la primera, como cuenta nueva si es un cambio de CLABE)

#### Scenario: Alta rechazada
- **WHEN** Pey rechaza la alta
- **THEN** el negocio queda sin cuenta activa, la app muestra un error claro y permite reintentar sin perder lo escrito

### Requirement: Estados de la cuenta
La función SHALL reflejar los estados `PENDING`, `PROCESSING`, `ACTIVE` y `ERROR`; la cuenta pasa a `ACTIVE` al recibir `bank.account.updated`, y CoDi queda apagado hasta entonces.

#### Scenario: Activación por webhook
- **WHEN** llega un `bank.account.updated` válido con estado `ACTIVE`
- **THEN** la función marca la cuenta del negocio como `ACTIVE`

#### Scenario: Cuenta nueva por cambio de CLABE
- **WHEN** el comercio cambia su CLABE
- **THEN** la función registra una cuenta nueva con `POST /bank-account`, guarda su `bankAccountId` como cuenta en trámite sin quitar la actual, y solo cuando llega `bank.account.updated` de la nueva cambia la cuenta de cobro

#### Scenario: Consulta del estado
- **WHEN** la app necesita saber el estado y no ha llegado el webhook
- **THEN** una función consulta `GET /bank-account/:id` y guarda el estado devuelto

#### Scenario: Estados sin pantalla
- **WHEN** la cuenta está `PROCESSING` o `ERROR`
- **THEN** CoDi sigue apagado y la app informa el estado; el texto exacto es la pregunta abierta P7

### Requirement: Un solo webhook, verificado con Standard Webhooks
Una función HTTP SHALL recibir todos los webhooks de Pey (hay uno por llave de API), verificar la firma con `webhook-id`, `webhook-timestamp` y `webhook-signature` sobre el cuerpo crudo y con el secreto del webhook, y responder 200 solo si la firma es válida.

#### Scenario: Firma válida
- **WHEN** llega un webhook con firma válida
- **THEN** la función lo procesa y responde 200

#### Scenario: Firma inválida
- **WHEN** la firma no coincide o el cuerpo fue modificado
- **THEN** la función no procesa nada y no responde 200

#### Scenario: Cuerpo crudo
- **WHEN** la función verifica la firma
- **THEN** usa el cuerpo exacto recibido, sin volver a serializar el JSON

### Requirement: Idempotencia por webhook-id
La función SHALL usar `webhook-id` como llave de idempotencia y registrar los ya procesados, para que un reintento no duplique pagos.

#### Scenario: Reintento
- **WHEN** Pey reenvía un webhook ya procesado
- **THEN** la función responde 200 sin cambiar ningún pedido ni total

### Requirement: Eventos que consume el núcleo
El núcleo SHALL procesar `codi.qr.payment_received` y `bank.account.updated`; los demás eventos (`codi.pn.payment_received`, `payment_link.status_updated`) SHALL ignorarse con 200 si la firma es válida, salvo los de push que consume `aviso-push`.

#### Scenario: Evento ajeno
- **WHEN** llega un evento que el núcleo no usa y la firma es válida
- **THEN** la función lo registra y responde 200 sin modificar pedidos

### Requirement: Identificar el negocio y el cobro del pago
Para asignar un pago, la función SHALL usar el `codiQrId` del payload (el `id` que Pey devolvió al crear el QR), el `bankAccountId` (solo viene si se mandó al crear el cobro) y el `metadata` que Yakedo mandó.

#### Scenario: Pago asignable
- **WHEN** llega un `codi.qr.payment_received` cuyo `codiQrId` corresponde a un cobro guardado de Yakedo
- **THEN** la función aplica las reglas de pago del cobro al pedido correcto

#### Scenario: Pago no asignable
- **WHEN** el pago no corresponde a ningún cobro de Yakedo
- **THEN** la función lo guarda como «pago sin asignar» visible solo para el servidor y responde 200 (la regla es propuesta, ver P23)

### Requirement: Resolución de pagos en transacción
La función SHALL aplicar cada pago en una transacción de Firestore que decide si es normal, duplicado o no esperado según el estado del pedido en ese momento.

#### Scenario: Pedido Pendiente o Cobrando
- **WHEN** llega el primer pago de un pedido Pendiente o Cobrando
- **THEN** el pedido pasa a Pagado con la hora de entrada del pago

#### Scenario: Pedido Pagado
- **WHEN** llega un pago de un pedido ya Pagado
- **THEN** el pago se guarda como «Pago duplicado» y el pedido no cambia

#### Scenario: Pedido Cancelado
- **WHEN** llega un pago de un pedido Cancelado
- **THEN** el pago se guarda como «Pago no esperado» y el pedido no se reabre

#### Scenario: Dos pagos casi al mismo tiempo
- **WHEN** dos webhooks del mismo pedido se procesan a la vez
- **THEN** solo uno cierra la venta y el otro queda duplicado

### Requirement: Lo que Pey no avisa
Yakedo NO SHALL esperar webhook de rechazo ni de vencimiento, ni de errores de la app del banco del cliente, porque Pey no los manda; el vencimiento lo marca el reloj propio.

#### Scenario: Cobro rechazado por el banco
- **WHEN** el banco del cliente rechaza el pago
- **THEN** Yakedo no recibe aviso y el cobro vence con el reloj

### Requirement: Consulta de respaldo del cobro
Una función del servidor, y no la app, SHALL poder consultar a Pey con `GET /transaction/codi/qr/:id` (el `id` es el identificador del QR, no un ULID) si un cobro ya fue pagado cuando el webhook no llegó, por ejemplo al vencer el reloj de Yakedo. No hay botón «Revisar pago» en la tablet.

#### Scenario: Webhook perdido
- **GIVEN** un cobro cuyo webhook no llegó
- **WHEN** se hace la consulta de respaldo y Pey devuelve una transacción con estado `PAID`
- **THEN** el pago se resuelve con las mismas reglas y la misma transacción que un webhook

### Requirement: Manejo de errores de Pey
Cuando Pey falla o no responde, la función SHALL devolver un error claro a la app, no dejar cobros a medias y no registrar secretos en logs.

#### Scenario: Pey caído
- **WHEN** Pey no responde al crear un cobro
- **THEN** la app puede reintentar o cobrar en efectivo y el pedido sigue Pendiente
