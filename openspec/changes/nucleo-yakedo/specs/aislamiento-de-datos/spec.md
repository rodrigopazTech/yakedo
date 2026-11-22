# Spec Delta

## Purpose

Garantiza con reglas de Firestore y de Firebase Storage que cada negocio solo vea y modifique sus propios datos, que solo el servidor pueda registrar pagos de CoDi y estados de cuenta, y que ningún secreto llegue al repositorio.

## ADDED Requirements

### Requirement: Datos por negocio
Los datos del negocio (catálogo, pedidos, cobros, historial, ajustes) SHALL guardarse bajo el negocio de su dueño y las reglas de Firestore SHALL permitir leer y escribir solo a ese dueño.

#### Scenario: Dueño lee lo suyo
- **GIVEN** una persona con sesión iniciada
- **WHEN** lee el catálogo de su negocio
- **THEN** Firestore lo permite

#### Scenario: Otro negocio
- **WHEN** una persona intenta leer o escribir datos de otro negocio
- **THEN** Firestore lo rechaza

#### Scenario: Sin sesión
- **WHEN** alguien sin sesión intenta leer o escribir
- **THEN** Firestore lo rechaza

### Requirement: Pagos CoDi y estados solo desde el servidor
Los cobros CoDi, los pagos confirmados, los pagos duplicados o no esperados, el `bankAccountId` y el estado de la cuenta de Pey SHALL escribirse solo desde Cloud Functions; el cliente no puede escribirlos.

#### Scenario: Cliente marca un pedido pagado con CoDi
- **WHEN** el cliente intenta guardar un pedido como Pagado con método CoDi
- **THEN** las reglas lo rechazan

#### Scenario: Pago en efectivo desde el cliente
- **WHEN** el cliente guarda un pedido de su negocio como Pagado en efectivo
- **THEN** las reglas lo permiten, porque el efectivo no pasa por Pey, y la escritura se hace en una transacción que comprueba que el pedido no estaba ya pagado o cancelado

#### Scenario: Estado de la cuenta
- **WHEN** el cliente intenta cambiar el estado de la cuenta de Pey de su negocio
- **THEN** las reglas lo rechazan

### Requirement: Cancelar solo sin cobro activo
Las reglas y las funciones SHALL impedir cancelar un pedido con un cobro CoDi activo.

#### Scenario: Cancelación con cobro activo
- **WHEN** se intenta cancelar un pedido con cobro activo
- **THEN** la operación se rechaza

### Requirement: CLABE única y privada
El servidor SHALL mantener un índice de CLABE para impedir que dos negocios usen la misma, sin exponer la CLABE de un negocio a otro.

#### Scenario: CLABE repetida
- **WHEN** un negocio intenta registrar una CLABE ya usada por otro
- **THEN** el alta se rechaza con «Esta CLABE ya está registrada en Yakedo» y no se revela de quién es

### Requirement: Configuración global de solo lectura
`config/bancosCodi` SHALL poder leerlo cualquier persona con sesión y nadie escribirlo desde la app.

#### Scenario: Escritura de config
- **WHEN** un cliente intenta escribir en `config`
- **THEN** las reglas lo rechazan

### Requirement: Fotos de producto en Storage
Las fotos de producto SHALL guardarse en Firebase Storage bajo el negocio dueño, y las reglas de Storage SHALL permitir leerlas y escribirlas solo a ese dueño.

#### Scenario: Dueño sube la foto
- **GIVEN** una persona con sesión iniciada
- **WHEN** sube la foto de un producto de su negocio
- **THEN** las reglas de Storage lo permiten

#### Scenario: Otro negocio o sin sesión
- **WHEN** otra persona, o alguien sin sesión, intenta leer o escribir esa foto
- **THEN** las reglas de Storage lo rechazan

### Requirement: Reglas probadas
Las reglas de Firestore y de Storage SHALL tener pruebas con el emulador que cubran lectura propia, acceso ajeno, usuario sin sesión, escrituras reservadas al servidor, `config/bancosCodi` y fotos de producto.

#### Scenario: Suite de reglas
- **WHEN** se corren las pruebas de reglas en el emulador
- **THEN** todos los casos de este capítulo pasan

### Requirement: Cero secretos en el repositorio
El repositorio SHALL ignorar `.env`, `.env.local` y equivalentes, llaves y credenciales de servicio, y solo SHALL incluir un `.env.example` sin valores reales.

#### Scenario: Revisión antes de publicar
- **WHEN** se revisa el repositorio público y su historial antes de publicarlo
- **THEN** no hay llaves de Pey, secretos de webhook, números de prueba de jueces ni credenciales de servicio
