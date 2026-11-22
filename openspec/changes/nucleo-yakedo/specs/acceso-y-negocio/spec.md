# Spec Delta

## Purpose

Define cómo entra el comercio a Yakedo, cómo da de alta su negocio con la CLABE donde recibe sus cobros CoDi, qué datos puede cambiar después en «Tu negocio» y qué muestra la app según el estado de su cuenta en Pey.

## ADDED Requirements

### Requirement: Entrar con teléfono y código SMS
La app SHALL permitir entrar con un número de celular de México (+52 fijo, 10 números) y un código de 6 números enviado por SMS, sin contraseña, mediante Firebase Authentication.

#### Scenario: Entrada correcta con el número
- **GIVEN** que el comercio está en la bienvenida y toca «Entrar con tu número»
- **WHEN** escribe 10 números y luego el código de 6 números que recibió por SMS
- **THEN** entra en cuanto escribe el último número del código, sin tocar otro botón

#### Scenario: Número incompleto
- **GIVEN** que el comercio escribió «55 1234 5»
- **WHEN** intenta continuar
- **THEN** la app muestra «Te faltan 3 números. Tu número es de 10.» y no envía SMS

#### Scenario: Código incorrecto
- **WHEN** el comercio escribe un código que no es el enviado
- **THEN** la app muestra «Ese código no es. Revísalo y escríbelo otra vez.» y permite volver a escribirlo

#### Scenario: Código vencido
- **WHEN** el comercio escribe un código que ya venció (ver P16)
- **THEN** la app muestra «Este código ya venció. Pide uno nuevo.»

#### Scenario: Reenviar o cambiar número
- **GIVEN** que el comercio está en la pantalla del código
- **WHEN** pasa la espera visible («Puedes pedir otro código en 0:24») o toca cambiar número
- **THEN** puede pedir otro código o regresar a escribir su número, y mientras dure la espera la app muestra la cuenta regresiva

### Requirement: Número de prueba para los jueces
Firebase Authentication SHALL tener configurado un número de teléfono de prueba con código fijo para que los jueces entren sin recibir un SMS real; ese número y su código no se guardan en el repo.

#### Scenario: Entrada de un juez
- **WHEN** un juez escribe el número de prueba y el código fijo que recibió en las credenciales de entrega
- **THEN** entra a una cuenta de demostración sin que se envíe un SMS

### Requirement: Continuar con Google como atajo
La app SHALL ofrecer «Continuar con Google» como opción secundaria en la bienvenida. Teléfono y Google SHALL ser la misma cuenta cuando comparten correo: el `uid` de Firebase es uno solo y el negocio es el mismo.

#### Scenario: Usuario de Google existente
- **WHEN** el comercio toca «Continuar con Google» y elige una cuenta de Google cuyo correo ya está ligado a un negocio de Yakedo
- **THEN** entra directo a vender con sus datos, en la misma cuenta

#### Scenario: Primera vez con Google
- **WHEN** el comercio entra con Google por primera vez, con un correo que no está ligado a ninguna cuenta de Yakedo
- **THEN** la app lo lleva al alta de su negocio

### Requirement: Pedir el correo después de entrar con teléfono
El login por teléfono de Firebase Authentication no trae correo. Para poder vincularlo con Google, la app SHALL pedir un correo después de entrar con teléfono si esa cuenta aún no tiene uno, guardarlo en el usuario de Firebase y en el negocio, y SHALL pedir confirmación de ese correo con el aviso de Firebase antes de considerarlo ligado. Los textos de esta pantalla están pendientes de Diseño UI/UX.

#### Scenario: Primera vez con teléfono
- **WHEN** el comercio entra con teléfono y su cuenta no tiene correo
- **THEN** la app pide el correo y no lo lleva a vender ni al alta hasta que lo escriba

#### Scenario: Correo ya guardado
- **WHEN** el comercio entra otra vez con el mismo teléfono y su cuenta ya tiene correo
- **THEN** no se lo vuelve a pedir

#### Scenario: Entra con Google con el mismo correo
- **GIVEN** una cuenta creada con teléfono cuyo correo ya está guardado y confirmado
- **WHEN** el comercio entra con Google usando ese mismo correo
- **THEN** Firebase enlaza el proveedor de Google al mismo `uid` y el comercio ve el mismo negocio

#### Scenario: Entra con teléfono con un correo que ya es de Google
- **GIVEN** una cuenta creada con Google
- **WHEN** el comercio entra después con teléfono y escribe ese mismo correo
- **THEN** no se crea un segundo negocio: la app le pide entrar con Google y, ya dentro, vincular su número desde Ajustes (textos pendientes de Diseño UI/UX)

#### Scenario: Dos correos distintos
- **WHEN** el correo de Google no es el que se guardó después del teléfono
- **THEN** son cuentas distintas, cada una con su negocio

### Requirement: Primera vez contra cuenta con negocio
Después de entrar, la app SHALL llevar al alta del negocio si la cuenta no tiene negocio, y directo a la pantalla de venta si ya lo tiene. La CLABE no es el usuario: primero existe la cuenta y después se da de alta la CLABE.

#### Scenario: Cuenta sin negocio
- **WHEN** entra una cuenta que nunca dio de alta su negocio
- **THEN** la app muestra «Da de alta tu negocio» con el mensaje «Con tu CLABE te llega el dinero directo.»

#### Scenario: Cuenta con negocio
- **WHEN** entra una cuenta que ya tiene negocio
- **THEN** la app muestra la pantalla de venta con su catálogo

### Requirement: Sesión que se queda abierta
La sesión SHALL permanecer abierta en el navegador hasta que el comercio cierre sesión, y al entrar con la misma cuenta en otro aparato o navegador SHALL aparecer la CLABE enmascarada, el catálogo y el historial.

#### Scenario: Otro aparato
- **WHEN** el comercio entra con su misma cuenta en otro navegador
- **THEN** la app descarga lo que hay en la nube y muestra su negocio, su catálogo y su historial

#### Scenario: Recargar la página
- **WHEN** el comercio recarga la página con sesión abierta
- **THEN** la app descarga de nuevo lo que hay en la nube y no pide volver a entrar

### Requirement: Cerrar sesión sin borrar datos
Ajustes SHALL tener «Cerrar sesión» con confirmación «¿Cerrar sesión?» que aclara que las ventas se quedan guardadas y dice cómo volver a entrar según cómo entró el comercio; cerrar sesión no borra datos de la nube.

#### Scenario: Entró con número
- **WHEN** el comercio toca «Cerrar sesión» y entró con su número
- **THEN** la app muestra «Tus ventas se quedan guardadas. Para volver a entrar usa tu número.»

#### Scenario: Entró con Google
- **WHEN** el comercio toca «Cerrar sesión» y entró con Google
- **THEN** la app muestra «Tus ventas se quedan guardadas. Para volver a entrar usa tu cuenta de Google.»

#### Scenario: Confirmar el cierre
- **WHEN** el comercio confirma
- **THEN** la app regresa a la bienvenida y los datos del negocio siguen en la nube

#### Scenario: Con un cobro activo
- **GIVEN** que el negocio tiene un cobro activo
- **WHEN** el comercio abre Ajustes
- **THEN** «Cerrar sesión» queda bloqueado con «Hay un cobro activo. Espera a que se pague o venza para cerrar sesión.»

### Requirement: Alta del negocio
El alta SHALL pedir, en este orden, la CLABE, el nombre del negocio (obligatorio, hasta 40 caracteres), el nombre legal y el tipo de persona (física o moral). No pide RFC: basta con la CLABE, el nombre y el tipo de persona (confirmado por Rodrigo el 21 de noviembre de 2026).

#### Scenario: Alta completa
- **GIVEN** que el comercio escribió una CLABE de 18 números con banco reconocido (ver P14)
- **WHEN** escribe el nombre del negocio, su nombre legal y elige tipo de persona y toca «Continuar»
- **THEN** la app registra la cuenta en Pey a través de una Cloud Function y muestra el estado de la cuenta

#### Scenario: CLABE incompleta
- **WHEN** el comercio escribió 15 de 18 números
- **THEN** la app muestra «Faltan 3 números (15 de 18).» y no continúa

#### Scenario: CLABE válida
- **WHEN** el comercio completa los 18 números
- **THEN** la app muestra «18 de 18 números · CLABE válida de [banco]» con el banco de la CLABE

#### Scenario: Nombre del negocio vacío
- **WHEN** el comercio deja vacío el nombre del negocio
- **THEN** la app muestra «Escribe el nombre de tu negocio.» y deshabilita «Continuar»

#### Scenario: Nombre del negocio al límite
- **WHEN** el nombre del negocio llega a 40 caracteres
- **THEN** la app muestra «40 de 40 · Ya no caben más letras.» y no acepta más caracteres

#### Scenario: Ayuda del nombre
- **WHEN** el nombre del negocio es válido
- **THEN** la app muestra «20 de 40 · Así aparece en tus tickets.» con el número de caracteres escritos

### Requirement: Datos que se mandan a Pey al registrar la CLABE
La Cloud Function de alta SHALL registrar la CLABE con `POST /bank-account` enviando `alias`, `name`, `clabe` y `entity` (`BUSINESS` o `PERSON`) y SHALL guardar el `bankAccountId` devuelto ligado al negocio (ver P13).

#### Scenario: Persona física
- **WHEN** el comercio elige «Persona física» («A tu nombre»)
- **THEN** la función manda `entity` igual a `PERSON`

#### Scenario: Persona moral
- **WHEN** el comercio elige «Persona moral» («Empresa o sociedad»)
- **THEN** la función manda `entity` igual a `BUSINESS`

#### Scenario: Sin RFC
- **WHEN** la función registra la cuenta
- **THEN** no pide ni manda RFC

### Requirement: CLABE única en Yakedo
Una CLABE SHALL pertenecer a un solo negocio en Yakedo, aunque la API de Pey acepte registrar la misma CLABE dos veces. La verificación SHALL hacerla una Cloud Function con visibilidad de todos los negocios, no el cliente.

#### Scenario: CLABE ya registrada en el alta
- **GIVEN** que otra cuenta de Yakedo ya registró esa CLABE
- **WHEN** el comercio intenta continuar en el alta
- **THEN** la app muestra «Esta CLABE ya está registrada en Yakedo» sin texto ni botón extra, y no llama a `POST /bank-account`

#### Scenario: CLABE ya registrada al cambiarla
- **WHEN** el comercio escribe en «Cambiar CLABE» una CLABE registrada por otro negocio
- **THEN** la app muestra el mismo error y no cambia la cuenta

### Requirement: Estados de la cuenta en Pey
La app SHALL representar la cuenta del negocio con los estados `PENDING`, `PROCESSING`, `ACTIVE` y `ERROR` de Pey, y, durante el trámite de la primera cuenta (la del alta), SHALL mantener CoDi apagado y permitir solo cobro en efectivo; el efectivo funciona siempre.

#### Scenario: Cuenta pendiente
- **GIVEN** que la cuenta está `PENDING`
- **WHEN** el comercio abre su cuenta
- **THEN** la app muestra «Estamos revisando tu cuenta», «Ya puedes vender y cobrar en efectivo» y «Cobrar con CoDi: en cuanto tu cuenta esté activa»

#### Scenario: CoDi apagado al cobrar
- **GIVEN** que la primera cuenta del negocio no está `ACTIVE`
- **WHEN** el comercio elige el método de pago
- **THEN** CoDi aparece deshabilitado con «Se activa cuando tu cuenta quede lista.», «Mientras la revisamos, cobra en efectivo.» y la etiqueta «En revisión»

#### Scenario: Catálogo con cuenta en revisión
- **WHEN** el comercio está en la pantalla de venta con la cuenta en revisión
- **THEN** la app muestra «Cuenta en revisión: cobra en efectivo por ahora.» con «Ver estado»

#### Scenario: Cuenta activa
- **WHEN** Pey avisa con `bank.account.updated` que la cuenta pasó a `ACTIVE`
- **THEN** la app muestra «¡Ya quedó! Tu cuenta está activa.» y CoDi se habilita para cobrar

#### Scenario: Estados sin pantalla definida
- **WHEN** la cuenta está `PROCESSING` o `ERROR`
- **THEN** CoDi sigue apagado y se aplica el comportamiento de P7 una vez aprobado

### Requirement: Datos del negocio en Ajustes
Ajustes SHALL tener la sección «Tu negocio» con el nombre del negocio (editable hasta 40 caracteres), la CLABE activa enmascarada (por ejemplo, «•••• 1234»), «Entraste con» y «Editar catálogo».

#### Scenario: Editar el nombre
- **WHEN** el comercio edita el nombre del negocio y guarda
- **THEN** el nuevo nombre aparece en la app y en el historial

#### Scenario: Nombre vacío al editar
- **WHEN** el comercio borra el nombre
- **THEN** «Guardar» queda deshabilitado

#### Scenario: Nombre editable con un cobro activo
- **GIVEN** que hay un cobro activo
- **WHEN** el comercio abre «Tu negocio»
- **THEN** puede editar el nombre, pero «Cambiar CLABE» queda bloqueado con «Hay un cobro activo. Espera a que se pague o venza para cambiar la cuenta.»

### Requirement: Cambiar la CLABE
El comercio SHALL poder cambiar su CLABE; hay una sola CLABE de cobro activa a la vez y la nueva la reemplaza cuando Pey la deja `ACTIVE`. Cambiarla pide confirmación con el banco de la cuenta nueva, registra la cuenta nueva en Pey y se bloquea mientras haya un cobro activo.

#### Scenario: CLABE nueva válida
- **WHEN** el comercio escribe 18 números de una CLABE nueva válida
- **THEN** la app muestra «18 de 18 números · CLABE válida de [banco]» y habilita el cambio

#### Scenario: Confirmación
- **WHEN** el comercio pide cambiar la CLABE
- **THEN** la app muestra «¿Cambiar la CLABE?» con el detalle «[banco] · •••• [4 números]» y los botones «Cancelar» y «Cambiar CLABE»; la frase aprobada «Desde ahora tus cobros llegan a esta cuenta.» deja de ser cierta mientras la cuenta nueva está en trámite y queda pendiente de Diseño UI/UX

#### Scenario: CLABE vacía
- **WHEN** el comercio abre «Cambiar CLABE» sin escribir nada
- **THEN** la ayuda dice «18 números.»

### Requirement: Cuenta nueva en trámite
Mientras Pey tramita la cuenta nueva (puede tardar días hábiles), la app SHALL mostrar un aviso para que el comercio elija si sigue operando con la cuenta actual (`ACTIVE`); los textos de ese aviso son nuevos y están pendientes de Diseño UI/UX, no son finales.

#### Scenario: Aviso al cambiar
- **WHEN** el comercio confirma el cambio y Pey registra la cuenta nueva como `PENDING`
- **THEN** la app pregunta si quiere seguir operando con la cuenta actual mientras se tramita la nueva (texto pendiente de Diseño UI/UX)

#### Scenario: Sigue con la cuenta actual
- **WHEN** el comercio responde que sí
- **THEN** CoDi sigue cobrando a la cuenta actual (`ACTIVE`) y el efectivo funciona igual

#### Scenario: No sigue con la cuenta actual
- **WHEN** el comercio responde que no
- **THEN** CoDi queda apagado y solo se cobra en efectivo hasta que la cuenta nueva quede `ACTIVE` (propuesta, ver «decidido por propuesta»)

#### Scenario: La cuenta nueva queda activa
- **WHEN** llega `bank.account.updated` con estado `ACTIVE` de la cuenta nueva
- **THEN** los cobros nuevos se hacen a la cuenta nueva, la cuenta anterior deja de usarse para cobros nuevos y la app muestra «¡Ya quedó! Tus cobros llegan a [banco] •••• [4 números].» con el banco y los últimos 4 números de la cuenta nueva

#### Scenario: Cobros creados antes del cambio
- **GIVEN** un cobro creado con la cuenta anterior que sigue vigente al activarse la nueva
- **WHEN** se paga
- **THEN** el dinero llega a la cuenta anterior, porque el cobro lleva el `bankAccountId` con que se creó

#### Scenario: La cuenta nueva falla
- **WHEN** la cuenta nueva pasa a `ERROR`
- **THEN** el negocio sigue con la cuenta actual y el aviso del error queda pendiente de Diseño UI/UX (ver P7)

#### Scenario: Un cambio a la vez
- **WHEN** hay una cuenta nueva en trámite
- **THEN** «Cambiar CLABE» queda bloqueado hasta que la nueva quede `ACTIVE` o falle (propuesta)

#### Scenario: Tu negocio durante el trámite
- **WHEN** el comercio abre «Tu negocio» con una cuenta nueva en trámite
- **THEN** ve la CLABE actual enmascarada y que hay una cuenta nueva en trámite (texto pendiente de Diseño UI/UX)

### Requirement: Textos de ayuda del alta
El alta SHALL incluir «¿Qué es esto?» junto a la CLABE, que explica «¿Qué es la CLABE?», y la leyenda «Nunca te pedimos contraseñas.».

#### Scenario: Abrir la ayuda de la CLABE
- **WHEN** el comercio toca «¿Qué es esto?»
- **THEN** la app muestra «Son los 18 números de tu cuenta de banco.», «La ves en la app de tu banco o en tu estado de cuenta.» y «Ahí te llegan tus cobros CoDi.»

### Requirement: Vocabulario de la app
Todos los textos visibles SHALL decir «números» y no «dígitos», «aviso» y no «notificación», y «activo» y no «vivo».

#### Scenario: Revisión de textos
- **WHEN** se revisan los textos visibles de la app
- **THEN** no aparecen las palabras «dígitos», «notificación» ni «vivo»
