# Spec Delta

## Purpose

Define la pantalla de venta horizontal, el ticket, el pedido con sus estados, el método de pago (efectivo con cambio o CoDi), el panel de Pendientes y la cancelación manual, que son el corazón del punto de venta.

## ADDED Requirements

### Requirement: App web con diseño horizontal
Yakedo SHALL ser una app web con diseño horizontal primero, pensada para tablet o pantalla grande y publicada con una URL pública en Firebase Hosting; el diseño para celular queda fuera de este cambio.

#### Scenario: Abrir la URL pública
- **WHEN** una persona abre la URL de la demo sin invitación
- **THEN** ve la bienvenida de Yakedo en diseño horizontal

#### Scenario: Celular
- **WHEN** se abre la app en un celular
- **THEN** no hay diseño específico para celular en este cambio (lo hará Rodrigo después)

### Requirement: Diseño responsivo por fases
La interfaz SHALL construirse primero para escritorio y tablet horizontal, que es la versión diseñada en Figma (marcos «Tablet H», proporción 16:10); la adaptación a pantallas chicas SHALL hacerse después, como un cambio aparte, con diseños aprobados en Figma y sin improvisar pantallas.

#### Scenario: Fase uno
- **WHEN** se construye el núcleo
- **THEN** las pantallas siguen los diseños de Figma y se comprueban en tablet horizontal y en escritorio, con el mismo diseño escalando al tamaño disponible

#### Scenario: Pantallas chicas
- **WHEN** el ancho de la pantalla es menor que el de una tablet horizontal
- **THEN** el núcleo no define ni improvisa un diseño propio; queda para el cambio `pantallas-chicas`, que espera diseños de Figma

### Requirement: La app requiere conexión
Yakedo SHALL requerir conexión a internet para operar; el modo sin internet (ventas sin conexión, copia local y service worker) queda para después del hackatón.

#### Scenario: Sin conexión
- **WHEN** el navegador pierde la conexión
- **THEN** la app no deja crear ni cobrar pedidos y avisa que necesita internet (texto pendiente de Diseño UI/UX), sin perder lo que ya está guardado en la nube

### Requirement: Armar el ticket tocando productos
La pantalla de venta SHALL mostrar las categorías, los productos y el ticket actual; tocar un producto lo agrega y tocar otra vez suma uno más.

#### Scenario: Ticket vacío
- **WHEN** el ticket no tiene productos
- **THEN** muestra «Sin productos», «Todo listo para vender.» y «Toca la foto de un producto para agregarlo. Toca otra vez para sumar uno más.»

#### Scenario: Agregar productos
- **WHEN** el comercio toca «Café americano» dos veces
- **THEN** el ticket muestra «2×», el precio por pieza («$35 c/u») y el total actualizado

#### Scenario: Total y botón de cobrar
- **WHEN** el ticket tiene productos
- **THEN** muestra «Total», «Vaciar» y el botón «Cobrar $122» con el total real

#### Scenario: Vaciar
- **WHEN** el comercio toca «Vaciar»
- **THEN** el ticket queda sin productos

### Requirement: Pedido con número y estados
Al tocar «Cobrar», el ticket SHALL convertirse en un pedido con número visible («Ticket #0043») y estado Pendiente; un pedido está Pendiente hasta que se paga o se cancela a mano (ver P21).

#### Scenario: Pedido nuevo
- **WHEN** el comercio toca «Cobrar $122»
- **THEN** se crea el pedido con sus productos, su total y el estado Pendiente, y aparece la pantalla «Cobrar»

#### Scenario: Número consecutivo por negocio
- **WHEN** se crea un pedido
- **THEN** su número sale de un contador del negocio que se incrementa dentro de una transacción de Firestore, de modo que dos aparatos del mismo negocio nunca reciben el mismo número, y se muestra con cuatro cifras («#0043»)

#### Scenario: Estados visibles
- **WHEN** se muestra un pedido
- **THEN** su estado es uno de: Pendiente (sin pagar), Cobrando (con cobro activo y cuenta regresiva), Pagado (con CoDi o en efectivo) o Cancelado

#### Scenario: Cobro vencido
- **GIVEN** que el cobro CoDi de un pedido venció sin pago
- **WHEN** el comercio ve el pedido
- **THEN** sigue Pendiente («Pendiente · cobro vencido»)

### Requirement: Elegir método de pago
La pantalla «Cobrar» SHALL mostrar el total («Total a cobrar») y dos métodos: Efectivo y CoDi.

#### Scenario: Con la cuenta activa
- **WHEN** el comercio abre «Cobrar»
- **THEN** ve «Efectivo» («Captura cuánto te dan y te decimos el cambio.» con la etiqueta «Sin comisión») y «CoDi» («QR en pantalla o aviso al celular del cliente.»; el aviso pertenece al cambio `aviso-push`)

#### Scenario: CoDi no disponible
- **WHEN** la cuenta del negocio no está activa (primera cuenta en trámite)
- **THEN** CoDi aparece deshabilitado con el motivo y Efectivo sigue disponible

### Requirement: Cobro en efectivo con cambio
El cobro en efectivo SHALL pedir cuánto entregó el cliente y calcular el cambio; al confirmar, el pedido pasa a Pagado y se guarda en el historial.

#### Scenario: Calcular el cambio
- **GIVEN** que el total es $122.00
- **WHEN** el comercio captura que recibió $200
- **THEN** la app muestra «Total $122.00», «Recibido $200.00» y «Cambio a entregar $78.00»

#### Scenario: Atajos de monto
- **WHEN** el comercio toca «Exacto», «$150» o «$500»
- **THEN** el monto recibido toma ese valor

#### Scenario: Confirmar
- **WHEN** el comercio confirma el cobro en efectivo
- **THEN** el pedido queda Pagado con método Efectivo, y la app muestra «¡Ya quedó!» con el total y «Nueva venta»

#### Scenario: Pedido ya pagado por CoDi
- **GIVEN** que mientras el comercio capturaba el efectivo entró el pago CoDi del mismo pedido
- **WHEN** confirma el efectivo
- **THEN** la confirmación se hace en una transacción de Firestore que ve el pedido ya Pagado, no lo vuelve a cobrar y avisa que ya estaba pagado (texto pendiente de Diseño UI/UX)

#### Scenario: Aviso al confirmar
- **WHEN** el comercio está en «Cobro en efectivo»
- **THEN** la app dice «Al confirmar se cierra la venta y se guarda en el historial.»

### Requirement: Confirmación de pago recibido
Cuando un pedido queda Pagado, la app SHALL mostrar «¡Ya quedó!» con el monto y «Detalle del cobro», y regresar al catálogo en 5 segundos o con «Nueva venta».

#### Scenario: Regreso automático
- **WHEN** aparece «¡Ya quedó!»
- **THEN** la app muestra «Regresando al catálogo en 5 s» y regresa al catálogo al terminar la cuenta

### Requirement: Panel de Pendientes
La venta SHALL mostrar el contador «Pendientes (N)» y un panel con los pedidos sin pagar, que se quedan ahí hasta que se cobren o se cancelen, aunque pasen días; si N es 0 el contador se oculta.

#### Scenario: Panel con pedidos
- **WHEN** el comercio abre Pendientes
- **THEN** ve «Ventas sin pagar. Se quedan hasta que las cobres o canceles.» y por cada pedido su hora, número, productos, su estado («Cobrando 3:40» o «Pendiente · cobro vencido»), «Cancelar pedido» y «Cobrar»

#### Scenario: Sin pendientes
- **WHEN** no hay pedidos Pendientes
- **THEN** el contador no aparece

#### Scenario: Pedido de otro día
- **WHEN** un pedido del día anterior sigue Pendiente
- **THEN** sigue en Pendientes hasta que se cobre o se cancele

### Requirement: Retomar un pedido con cobro activo
Al tocar «Cobrar» en un pedido con cobro activo, la app SHALL avisar que ya hay un cobro y ofrecer mostrar el mismo QR u otro método.

#### Scenario: Retomar
- **WHEN** el comercio toca «Cobrar» en un pedido con cobro activo
- **THEN** la app muestra «Hay un cobro activo», «Muestra el mismo QR. Si haces otro, serían dos cobros.», el vencimiento («Vence en 3:40 · a las 13:01») y los botones «Elegir otro método» y «Mostrar el mismo QR»

### Requirement: Cancelar un pedido
Cancelar SHALL ser manual y definitivo, y SHALL estar bloqueado mientras el pedido tenga un cobro activo.

#### Scenario: Cancelar sin cobro activo
- **WHEN** el comercio toca «Cancelar pedido» en un pedido sin cobro activo
- **THEN** la app pregunta «¿Cancelar el pedido #0037?» con «Sale de Pendientes. No se puede deshacer.» y los botones «Sí, cancelar pedido» y «Volver»

#### Scenario: Confirmar la cancelación
- **WHEN** el comercio confirma
- **THEN** el pedido sale de Pendientes y queda en el historial como Cancelado, y no se puede reabrir

#### Scenario: Cancelar con cobro activo
- **WHEN** el pedido tiene un cobro activo
- **THEN** «Cancelar pedido» queda deshabilitado con «Hay un cobro activo. Espera a que venza (3:40) o cóbralo.»

### Requirement: Alcance excluido de la venta
La spec del núcleo SHALL dejar fuera de forma explícita el aviso push, la cuenta dividida, el link de pago por WhatsApp, Alexa, la impresora de tickets y la caja física.

#### Scenario: Cambios aparte
- **WHEN** hay tiempo después del núcleo, y en el caso del push si además se pudo pagar en algún banco el 29 de noviembre de 2026
- **THEN** se especifican en cambios de OpenSpec aparte (`aviso-push` y `cuenta-dividida`) y pueden entrar a la demo sin modificar esta spec del núcleo

#### Scenario: Ticket
- **WHEN** se cierra una venta
- **THEN** el ticket se ve en pantalla y en el historial; no hay impresión
