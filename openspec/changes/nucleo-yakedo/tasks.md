## 1. Base y acceso (ROD-369, ROD-378, ROD-379)

- [x] 1.1 Crear el proyecto React, Vite y TypeScript, con Firebase (Auth, Firestore, Functions, Hosting, Storage) y el emulador local. Verificación: `npm run build` y el emulador arrancan sin errores.
- [x] 1.2 Configurar Plus Jakarta Sans y la paleta de marca (#1F4FD1, #163AA8, #FFB020, #1C1915, #F4EFE6) en un solo archivo de estilos. Verificación: una pantalla de prueba se ve con la fuente y los colores.
- [x] 1.3 Entrada con teléfono (+52, 10 números, código de 6 números) con los textos de error aprobados. Verificación: pruebas del flujo con el emulador de Auth. Bloqueada hasta que Rodrigo active Blaze.
- [x] 1.4 Entrada con Google como atajo, persistencia de la sesión y vinculación con el teléfono por correo: pedir el correo (y su confirmación) después de entrar con teléfono si no lo tiene; si el correo de Google coincide, es la misma cuenta; si entra primero con Google y luego con teléfono, vincular el número desde Ajustes. Verificación: pruebas de los cuatro escenarios de acceso-y-negocio (mismo correo, correos distintos, Google primero, correo ya guardado). Los textos esperan a Diseño UI/UX.
- [x] 1.5 Cerrar sesión con sus dos variantes de texto y bloqueo con un cobro activo. Verificación: prueba con y sin cobro activo.
- [x] 1.6 Reglas de Firestore y de Storage por negocio y su suite de pruebas con el emulador (propio, ajeno, sin sesión, config de solo lectura, fotos). Verificación: la suite pasa.
- [x] 1.7 `.env.example`, revisión de `.gitignore` y revisión del historial sin secretos antes de publicar. Verificación: búsqueda de llaves en el repo sin resultados.
- [x] 1.8 Alta del negocio («Tu negocio»): CLABE, nombre del negocio (40 máximo), nombre legal y tipo de persona, sin RFC; unicidad de la CLABE. Verificación: pruebas de validación y de CLABE repetida. Depende de P13 y P14.
- [x] 1.9 Función `registrarNegocio` (`POST /bank-account`), `consultarCuenta` y recepción de `bank.account.updated`; CoDi apagado fuera de `ACTIVE`. Verificación: pruebas con respuestas simuladas de Pey. Depende de P7.
- [x] 1.10 «Tu negocio» en Ajustes y función `cambiarClabe` con cuenta nueva en trámite (elección de seguir con la cuenta actual, cambio al quedar `ACTIVE`, un cambio a la vez). Verificación: pruebas con Pey simulado de cada escenario. Los textos del aviso esperan a Diseño UI/UX.
- [ ] 1.11 Documentación: README con cómo correr, probar y desplegar, sin secretos. Verificación: otra persona sigue el README en limpio.

## 2. Catálogo y núcleo de venta (ROD-386)

- [x] 2.1 Categorías y productos en Firestore con las validaciones aprobadas (40 letras, centavos). Verificación: pruebas de validación y de reglas.
- [x] 2.2 Catálogo vacío («Arma tu catálogo»), «Editar» y Ajustes como entradas; sin filtro «Todas» en la venta. Verificación: pruebas de pantalla.
- [x] 2.3 «Agotado hoy», quitar un producto y foto opcional en Firebase Storage, con iniciales si no hay foto. Verificación: subir, mostrar e impedir el acceso de otro negocio en el emulador de Storage.
- [x] 2.4 Pantalla de venta horizontal con el ticket y el número de pedido. Verificación: se ve bien en tablet horizontal y pantalla grande; el número sale del contador por negocio dentro de una transacción de Firestore (prueba con dos pedidos simultáneos).
- [x] 2.5 Método de pago y cobro en efectivo con cambio y «¡Ya quedó!». Verificación: pruebas de cálculo de cambio y de estados.
- [x] 2.6 Pendientes, estados del pedido y cancelación manual bloqueada con un cobro activo. Verificación: pruebas de cada estado. Depende de P21.
- [x] 2.7 Historial por día, detalle del ticket y tarjetas de totales por fecha de pago, con «por devolver» solo en CoDi. Verificación: pruebas de totales con los ejemplos de la spec (P17 para la zona horaria).
- [x] 2.8 Pruebas unitarias del cálculo de estados y totales. Verificación: la suite pasa.
- [x] 2.9 Diseño responsivo fase uno: escritorio y tablet horizontal según los marcos «Tablet H» de Figma. Verificación: revisión en esos dos tamaños; no se improvisan pantallas chicas.

## 3. Cobro con CoDi y Pey

- [x] 3.1 Función `crearCobroQr` con `expiration` de 360 y `bankAccountId`. Verificación: prueba con Pey simulado que revisa el cuerpo enviado.
- [x] 3.2 Pantalla del QR con reloj de 360 s, línea de bancos y advertencia de no anular. Verificación: prueba del reloj con hora simulada, incluido un aparato con la hora mal.
- [x] 3.3 Cobro vencido, «Cobrar otra vez» y «Es otro cobro. Que pague solo uno.» Verificación: pruebas de cada pantalla.
- [x] 3.4 Función `webhookPey`: firma Standard Webhooks sobre el cuerpo crudo, idempotencia por `webhook-id`, 200 solo con firma válida. Verificación: pruebas con firmas válidas, inválidas y reintentos.
- [x] 3.5 Resolución de pagos en transacción: normal (incluido el webhook de un QR que Yakedo ya dio por vencido con el pedido Pendiente), duplicado y no esperado. Verificación: pruebas de cada fila de la tabla de `design.md`, incluidos dos webhooks simultáneos.
- [x] 3.6 Avisos y textos de pago no esperado y pago duplicado. Verificación: pruebas de pantalla con los textos aprobados.
- [x] 3.7 «Mejor cobrar en efectivo» con un QR activo y el aviso «El QR sigue activo 4:12 min. Pídele que ya no lo escanee.» Verificación: prueba del cambio de método sin duplicar el pedido.
- [x] 3.8 Ayuda cuando el banco del cliente falla. Verificación: prueba de pantalla.
- [x] 3.9 Consulta de respaldo del cobro solo en el servidor (por ejemplo al vencer el reloj), sin botón «Revisar pago». Verificación: prueba con respuesta simulada `PAID` y prueba de que la tablet escucha el cobro solo mientras está activo.
- [x] 3.10 Pagos sin asignar y efectivo en transacción contra un pago CoDi simultáneo. Verificación: pruebas. Depende de P23.

## 4. Cobro libre

- [ ] 4.1 Pantalla «Cobro libre» con teclado, concepto de 40 letras y textos aprobados. Verificación: pruebas de monto en cero, con centavos y con concepto al límite.
- [ ] 4.2 Ticket guardado aparte y regreso al ticket. Verificación: prueba con 4 productos.
- [ ] 4.3 Cobro libre en el flujo de pago y en el historial, con máximo de $1,000.00 MXN. Verificación: prueba de totales y de que un monto mayor a $1,000.00 no se cobra. El texto de error espera a Diseño UI/UX.

## 5. Lista de bancos con CoDi (ROD-382)

- [x] 5.1 Crear `config/bancosCodi` con la lista inicial del 17 de noviembre de 2026. Verificación: el documento existe y sus campos coinciden con la spec. Depende de P18.
- [x] 5.2 Línea corta, hoja de bancos y «Mejor cobrar en efectivo». Verificación: pruebas de pantalla con la lista cargada.
- [ ] 5.3 Lista nueva sin republicar. Verificación: cambiar el documento en la consola y reabrir la hoja.

## 6. Pruebas productivas y entrega (ROD-372)

- [ ] 6.1 Cerrar ROD-372: pagar un aviso de $0.01 desde un banco que no sea BBVA y capturar el webhook, usando una cuenta de Pey que ya esté `ACTIVE` (no hace falta esperar la de Rodrigo). El aviso pertenece al cambio `aviso-push`.
- [ ] 6.2 Prueba de punta a punta de un QR real con Pey en productivo, con una cuenta que ya esté `ACTIVE`. Verificación: se paga un QR de monto bajo y llega el webhook.
- [ ] 6.3 Publicar en Hosting con URL pública y cuenta de prueba para los jueces, sin guardar el número de prueba en el repositorio. Verificación: abrir la URL en una ventana privada y completar una venta.
- [ ] 6.4 Video de máximo 3 minutos y revisión final del repositorio público. Verificación: lista de revisión contra las instrucciones del bot.

## 7. Cambios separados y después del hackatón (fuera de este cambio)

- [ ] 7.1 Si da tiempo después del núcleo, y si el 29 de noviembre de 2026 el push se pudo pagar en algún banco, crear el cambio `aviso-push` para que entre a la demo. Verificación: el cambio existe y se valida con OpenSpec.
- [ ] 7.2 Si da tiempo después del núcleo, crear el cambio `cuenta-dividida` para que entre a la demo. Verificación: el cambio existe y se valida con OpenSpec.
- [ ] 7.3 Después del hackatón: modo sin internet (ventas sin conexión, copia local, service worker, CoDi según la conexión). Verificación: nuevo cambio de OpenSpec propio.
- [ ] 7.4 Después del hackatón: adaptación a pantallas chicas como cambio `pantallas-chicas`. Verificación: diseños de Figma aprobados antes de construir.
