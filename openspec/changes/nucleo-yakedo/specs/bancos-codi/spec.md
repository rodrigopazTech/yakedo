# Spec Delta

## Purpose

Muestra al comercio y a su cliente qué bancos aceptan pagar con CoDi, leyendo la lista de un documento global de Firestore, `config/bancosCodi`, que se actualiza sin volver a publicar la app, y da una salida inmediata a efectivo cuando el banco del cliente no sirve.

## ADDED Requirements

### Requirement: Documento config/bancosCodi
La lista de bancos SHALL vivir en el documento global `config/bancosCodi` con los campos `actualizado`, `fuente`, `destacados`, `siSirven`, `porConfirmar`, `noSirven` y `notaOpcional`; la app solo lo lee y Rodrigo lo edita desde la consola de Firebase.

#### Scenario: Lectura con sesión
- **GIVEN** una persona con sesión iniciada
- **WHEN** la app pide `config/bancosCodi`
- **THEN** Firestore permite leerlo

#### Scenario: Escritura desde la app
- **WHEN** cualquier cliente de la app intenta escribir `config/bancosCodi`
- **THEN** las reglas de Firestore lo rechazan

#### Scenario: Lista inicial
- **WHEN** se crea el documento
- **THEN** contiene la lista del 17 de noviembre de 2026 (Banxico del 10 de julio de 2026 y codi.org.mx) y los destacados BBVA, Banorte, Santander, Banamex, HSBC y Azteca (ver P18)

### Requirement: Línea corta y enlace en la pantalla del QR
La pantalla del QR SHALL mostrar debajo del código una línea corta con los bancos destacados y el enlace «¿Qué bancos sirven?», sin tapar el QR ni el contador.

#### Scenario: Línea visible
- **WHEN** se muestra el QR
- **THEN** se lee «Escanéalo con la app de tu banco: BBVA, Banorte, Santander, Banamex, HSBC, Azteca y más.» y el enlace «¿Qué bancos sirven?»

### Requirement: Hoja de bancos
El enlace SHALL abrir una hoja con «Estos bancos sí aceptan CoDi», la lista de bancos que sirven, el grupo de los que aún no están, la fecha de actualización y el botón «Mejor cobrar en efectivo».

#### Scenario: Abrir la hoja
- **WHEN** el comercio toca «¿Qué bancos sirven?»
- **THEN** la hoja muestra «Estos bancos sí aceptan CoDi», «Tu cliente paga desde la app de su banco, en la parte de CoDi o de Transferencias.» y la lista de `siSirven`

#### Scenario: Bancos que aún no están
- **WHEN** la hoja muestra los bancos que no sirven
- **THEN** dice «Aún no están en la lista de CoDi de Banxico: Nu, Mercado Pago, Klar, Stori y Ualá. Si tu cliente usa una de estas, cóbrale en efectivo.»

#### Scenario: Fecha de los datos
- **WHEN** se abre la hoja con los datos del 17 de noviembre
- **THEN** el pie dice «Datos de Banxico. Actualizado el 17 de noviembre de 2026.»

### Requirement: Salida a efectivo desde la hoja
El botón «Mejor cobrar en efectivo» de la hoja SHALL cambiar a efectivo el método del mismo pedido, sin cancelarlo ni duplicarlo, con las reglas de cobro-codi.

#### Scenario: Cambiar a efectivo
- **WHEN** el comercio toca «Mejor cobrar en efectivo» en la hoja
- **THEN** el mismo pedido pasa a cobro en efectivo y, si el QR sigue vigente, la app avisa cuánto falta para que venza

### Requirement: Actualizar sin volver a publicar
Un cambio en `config/bancosCodi` SHALL verse en la app, a más tardar al volver a abrir la hoja, sin publicar otra versión.

#### Scenario: Cambio desde la consola
- **WHEN** Rodrigo edita el documento en la consola de Firebase
- **THEN** la app muestra la lista nueva al abrir otra vez la hoja

### Requirement: Bancos por confirmar
Los bancos de `porConfirmar` SHALL mostrarse sin afirmar que sirven ni que no sirven (por ejemplo, el Banco del Bienestar, ver P18), y el texto de la app SHALL decir «aún no están en la lista de CoDi de Banxico» en vez de afirmar que un banco no tiene CoDi.

#### Scenario: Banco por confirmar
- **WHEN** un banco está en `porConfirmar`
- **THEN** la hoja no lo pone entre los que sí aceptan ni entre los que no
