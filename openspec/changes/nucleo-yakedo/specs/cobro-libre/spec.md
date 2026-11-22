# Spec Delta

## Purpose

Permite cobrar un monto sin elegir ningún producto del catálogo (por ejemplo, un abono o algo que no está en el catálogo), con concepto opcional, y después seguir el mismo flujo de pago que cualquier pedido.

## ADDED Requirements

### Requirement: Acceso a Cobro libre
La pantalla de venta SHALL tener un acceso claro a «Cobro libre», sin estorbar el flujo del catálogo.

#### Scenario: Abrir Cobro libre
- **WHEN** el comercio toca «Cobro libre» en la venta
- **THEN** la app abre la pantalla «Cobro libre» con «Cobra un monto sin elegir productos»

### Requirement: Monto con teclado numérico
La pantalla SHALL pedir el monto con un teclado numérico grande, con pesos y centavos (punto decimal), botón para borrar y validación de monto mayor a cero.

#### Scenario: Monto vacío
- **WHEN** la pantalla se abre
- **THEN** muestra «¿Cuánto vas a cobrar?», «$0» y «Escribe el monto con los números. Para centavos usa el punto.» y el botón de cobrar deshabilitado

#### Scenario: Monto válido
- **WHEN** el comercio escribe 85
- **THEN** la app muestra «$85» y «Son $85.00. Para centavos usa el punto.»

#### Scenario: Monto en cero
- **WHEN** el monto es $0.00
- **THEN** la app muestra «El monto tiene que ser mayor a $0.» y «Cobrar» queda deshabilitado

### Requirement: Monto máximo por operación
El cobro libre SHALL tener un máximo de $1,000.00 MXN y no SHALL aceptar montos mayores.

#### Scenario: Arriba del máximo
- **WHEN** el monto es mayor a $1,000.00
- **THEN** la app no permite cobrar y muestra un aviso de error cuyo texto está pendiente de Diseño UI/UX (no se usa un texto inventado)

### Requirement: Concepto opcional
El cobro libre SHALL aceptar un concepto opcional de máximo 40 caracteres que sale en el ticket y en el historial; si se deja vacío, se cobra igual.

#### Scenario: Con concepto
- **WHEN** el comercio escribe «Abono de Don Pepe»
- **THEN** el concepto aparece en el ticket y en el historial

#### Scenario: Sin concepto
- **WHEN** el comercio deja vacío el concepto
- **THEN** el cobro continúa y el historial muestra solo «Cobro libre»

#### Scenario: Concepto al límite
- **WHEN** el concepto llega a 40 caracteres
- **THEN** la app muestra «Máximo 40 letras. Ya no caben más.» con el contador «40/40»

### Requirement: Ticket con productos guardado aparte
Si ya hay productos en el ticket al abrir Cobro libre, ese ticket SHALL guardarse aparte y no mezclarse con el cobro libre.

#### Scenario: Ticket guardado
- **GIVEN** un ticket con 4 productos
- **WHEN** el comercio abre Cobro libre
- **THEN** la app muestra «Tu ticket con 4 productos se queda guardado. Al terminar, vuelves a él.»

#### Scenario: Regreso al ticket
- **WHEN** termina el cobro libre
- **THEN** la app regresa al ticket y muestra «Cobro libre listo. Aquí sigue tu ticket con 4 productos.»

### Requirement: Mismo flujo de pago que un pedido
Después del monto, el cobro libre SHALL usar el mismo flujo de pago que un pedido normal (método, QR, espera, éxito, vencido, error) y SHALL poder quedar Pendiente con las mismas reglas.

#### Scenario: Después del monto
- **WHEN** el comercio confirma el monto
- **THEN** la app dice «Después eliges efectivo o CoDi, como en cualquier venta.» y muestra «Cobrar» con el pedido «Ticket #0045 · Cobro libre · Abono de Don Pepe»

#### Scenario: Cobro libre Pendiente
- **WHEN** un cobro libre con CoDi vence sin pago
- **THEN** queda Pendiente como cualquier pedido y suma en «Pendiente», no en «Vendido hoy»

### Requirement: Cobro libre en el historial
El historial SHALL mostrar el cobro libre con la etiqueta «Cobro libre» (y el concepto si lo tiene), y sumarlo igual que cualquier venta en los totales del día.

#### Scenario: Etiqueta en el historial
- **WHEN** se paga un cobro libre de $85 con concepto «Abono de Don Pepe»
- **THEN** el historial muestra «Cobro libre · Abono de Don Pepe» con $85 y suma en «Vendido hoy»
