# Spec Delta

## Purpose

Define el historial de ventas por día, el detalle de cada ticket con sus intentos de cobro y las tarjetas de totales, contando cada venta en el día en que entró el pago.

## ADDED Requirements

### Requirement: Historial por día
El historial SHALL listar los pedidos del día elegido («Hoy», «Ayer», fechas anteriores o «Elegir fecha») con hora, número de ticket, detalle, monto y estado.

#### Scenario: Día actual
- **WHEN** el comercio abre «Historial»
- **THEN** ve «Hoy · lunes 16 de noviembre» con sus tickets, el nombre del negocio y los chips de fecha

#### Scenario: Otra fecha
- **WHEN** el comercio toca «Elegir fecha» o un chip de fecha
- **THEN** ve las ventas de ese día

### Requirement: Detalle del ticket
Al tocar un ticket, el historial SHALL mostrar sus productos con cantidad y precio, «Total», «Método» y, según el caso, recibido y cambio (efectivo), «Confirmado por», «Referencia» y «Cobro generado».

#### Scenario: Pagado con CoDi
- **WHEN** se abre un ticket pagado con CoDi
- **THEN** muestra «Pagado con CoDi», «Método CoDi · QR», «Confirmado por Webhook del banco · 12:43:18» y «Cobro generado 12:41 · vencía 12:47»

#### Scenario: Pagado en efectivo
- **WHEN** se abre un ticket pagado en efectivo
- **THEN** muestra «Pagado en efectivo», «Método Efectivo», «Recibido $100.00» y «Cambio $43.00»

#### Scenario: Ticket cancelado
- **WHEN** se abre un pedido cancelado
- **THEN** muestra «Cancelado a las 11:40»

#### Scenario: Pedido sin pagar
- **WHEN** se abre un pedido con cobro activo
- **THEN** muestra «Sin pagar», «Cobrando 3:40» y «Cancelar pedido» deshabilitado con «Hay un cobro activo. Espera a que venza (3:40) o cóbralo.»

### Requirement: Intentos de cobro
El detalle SHALL listar los intentos de cobro del pedido (QR) con su hora de creación, su vencimiento y, si hubo pago, la hora en que entró.

#### Scenario: Intento vencido
- **WHEN** un intento de cobro venció sin pago
- **THEN** el intento muestra que venció y la hora (texto pendiente de Diseño UI/UX; ya no existe «Venció 11:28 · pagó 11:31»)

#### Scenario: Pago no esperado
- **WHEN** hay un pago a un pedido cancelado
- **THEN** el intento se etiqueta «No esperado»

### Requirement: Las ventas cuentan el día que entró el pago
Cada venta SHALL contarse en el día en que entró el pago, no en el día en que se creó el pedido (ver P17).

#### Scenario: Pedido de ayer pagado hoy
- **GIVEN** un pedido del 16 de noviembre que siguió Pendiente
- **WHEN** se cobra el 17 de noviembre con un cobro nuevo o en efectivo
- **THEN** cuenta en las ventas del 17 y el historial dice «Pedido 16 nov 12:20 · Pagado 17 nov 10:32 con CoDi»

### Requirement: Tarjetas de totales
El historial SHALL mostrar «Vendido hoy» (monto y número de tickets pagados), la tarjeta de CoDi (monto y número de pagos) y «Efectivo cobrado hoy» (monto y número de pagos).

#### Scenario: Día normal
- **WHEN** hay 4 tickets pagados, 2 con CoDi por $217 y efectivo por $107
- **THEN** muestra «Vendido hoy $324 · 4 tickets», «CoDi $217 · 2 pagos» y «Efectivo cobrado hoy $107»

#### Scenario: Pendientes
- **WHEN** hay pedidos Pendientes
- **THEN** su monto se suma en «Pendiente» y no en «Vendido hoy» ni en CoDi

#### Scenario: Cancelados
- **WHEN** un pedido está Cancelado
- **THEN** no suma en «Vendido hoy»

### Requirement: Lo que hay que devolver
Lo que hay que devolver por pagos duplicados o no esperados SHALL sumarse solo en la tarjeta de CoDi, con la nota «Incluye $X por devolver», y no en «Vendido hoy».

#### Scenario: Pago duplicado
- **GIVEN** que «Vendido hoy» es $488 y CoDi $381
- **WHEN** entra un pago duplicado de $95
- **THEN** CoDi muestra $476 con «Incluye $95 por devolver» y «Vendido hoy» sigue en $488

#### Scenario: Duplicado de efectivo más CoDi
- **WHEN** un pedido pagado en efectivo recibe además un pago CoDi de $50
- **THEN** CoDi suma $50 con «Incluye $50 por devolver» y «Vendido hoy» no cambia

#### Scenario: Pago no esperado
- **WHEN** entra un pago de $65 a un pedido cancelado
- **THEN** CoDi suma $65 con «Incluye $65 por devolver» y la fila del ticket dice «pago no esperado»
