# Spec Delta

## Purpose

Define el catálogo del negocio (categorías y productos) guardado en Firestore y aislado por negocio, cómo se arma y edita, y cómo se ve en la venta, para que el comercio venda sin escribir cada precio.

## ADDED Requirements

### Requirement: Catálogo en la nube por negocio
El catálogo SHALL vivir en Firestore desde el primer día, aislado por negocio; cada producto tiene nombre, precio y categoría, y foto opcional guardada en Firebase Storage.

#### Scenario: Entrar desde otro aparato
- **WHEN** el comercio entra con su cuenta en otro navegador
- **THEN** la app descarga su catálogo y lo muestra

### Requirement: Catálogo vacío en la primera vez
Si el catálogo está vacío, la venta SHALL invitar a agregar el primer producto y SHALL permitir vender con Cobro libre mientras tanto.

#### Scenario: Primera vez
- **WHEN** el negocio no tiene productos
- **THEN** la app muestra «Arma tu catálogo», «Agrega tu primer producto para vender más rápido.» y el botón «Agregar producto»

#### Scenario: Ticket sin productos en catálogo vacío
- **WHEN** el negocio no tiene productos
- **THEN** el ticket muestra «Aún no hay productos.» y «Mientras, usa cobro libre.»

#### Scenario: Sin chip Editar en catálogo vacío
- **WHEN** el catálogo está vacío
- **THEN** no aparece el chip «Editar» y el camino es «Agregar producto»

### Requirement: Entradas a Editar catálogo
Se SHALL poder entrar a «Editar catálogo» desde el chip «Editar» con lápiz al final de la fila de categorías de la venta y desde la fila «Editar catálogo» de Ajustes; la venta no lleva filtro «Todas».

#### Scenario: Desde la venta
- **WHEN** el comercio toca el chip «Editar»
- **THEN** la app abre «Tu catálogo»

#### Scenario: Desde Ajustes
- **WHEN** el comercio toca «Editar catálogo» («Categorías y productos») en «Tu negocio»
- **THEN** la app abre «Tu catálogo»

#### Scenario: Filtro Todas
- **WHEN** el comercio ve la fila de categorías de la venta
- **THEN** no hay chip «Todas»; el chip «Todas» solo existe dentro de «Editar catálogo»

### Requirement: Categorías
El comercio SHALL poder crear, renombrar y borrar categorías; los productos de una categoría borrada pasan a «Sin categoría».

#### Scenario: Crear categoría
- **WHEN** el comercio toca «Nueva categoría», escribe un nombre y toca «Crear categoría»
- **THEN** la categoría aparece en el catálogo; el diálogo dice «Así se agrupan tus productos.» con la ayuda «Ejemplo: Café, Tamales, Bebidas.»

#### Scenario: Nombre de categoría vacío
- **WHEN** el comercio intenta crear una categoría sin nombre
- **THEN** la app muestra «Escribe un nombre.»

#### Scenario: Renombrar
- **WHEN** el comercio toca «Renombrar» y guarda con «Guardar nombre»
- **THEN** el nombre se actualiza en todos los productos de la categoría

#### Scenario: Borrar categoría con productos
- **WHEN** el comercio toca «Borrar» en una categoría con 4 productos
- **THEN** la app pide confirmación con «¿Borrar Café?», «Los 4 productos pasan a Sin categoría.», «Sí, borrar categoría» y «Volver»

#### Scenario: Borrar categoría vacía
- **WHEN** el comercio toca «Borrar» en una categoría sin productos
- **THEN** la categoría se quita de inmediato, sin confirmación

### Requirement: Alta y edición de productos
El comercio SHALL poder crear y editar productos con nombre (máximo 40 letras), precio (acepta centavos), categoría y foto opcional; «Guardar producto» queda deshabilitado hasta tener nombre y un precio distinto de $0.

#### Scenario: Producto nuevo
- **WHEN** el comercio escribe «Café con leche», precio «38.50», elige categoría y toca «Guardar producto»
- **THEN** el producto queda en el catálogo con precio $38.50

#### Scenario: Nombre vacío
- **WHEN** el comercio deja el nombre vacío
- **THEN** la app muestra «Escribe un nombre.»

#### Scenario: Nombre al límite
- **WHEN** el nombre llega a 40 letras
- **THEN** la app muestra «40 de 40 · Ya no caben más letras.»

#### Scenario: Precio en cero
- **WHEN** el precio es $0
- **THEN** la app muestra «Ponle un precio.»

#### Scenario: Teclado de precio
- **WHEN** el comercio toca el precio
- **THEN** aparece el teclado numérico grande con punto decimal, el mismo del cobro libre, con la ayuda «Toca para escribirlo.»

#### Scenario: Guardando
- **WHEN** el comercio toca «Guardar producto»
- **THEN** el botón muestra «Guardando…» hasta terminar

### Requirement: Foto opcional e iniciales
El producto SHALL aceptar una foto opcional tomada con la cámara o elegida de la galería («Foto opcional», «Se ve bien sin ella.»), guardada en Firebase Storage bajo el negocio, con reglas que solo dejan leerla y escribirla a su dueño; sin foto, la tarjeta muestra las iniciales del producto sobre fondo claro.

#### Scenario: Sin foto
- **WHEN** un producto no tiene foto
- **THEN** su tarjeta muestra sus iniciales, por ejemplo «CH», «GQ» o «CO»

#### Scenario: Elegir foto
- **WHEN** el comercio abre «Foto del producto»
- **THEN** la app muestra «Tómala o elígela de la galería.» con «Tomar foto» y «Elegir de la galería»

#### Scenario: Foto de otro negocio
- **WHEN** una persona autenticada intenta leer o escribir la foto de un producto de otro negocio
- **THEN** las reglas de Storage lo rechazan

### Requirement: Agotado hoy
El comercio SHALL poder marcar un producto como «Agotado hoy» sin borrarlo; se ve apagado en la venta, no se puede agregar al ticket y vuelve solo al día siguiente.

#### Scenario: Marcar agotado
- **WHEN** el comercio enciende «Agotado hoy» en «Editar producto»
- **THEN** la ayuda dice «Se ve apagado en la venta. Mañana vuelve solo.» y la tarjeta muestra la pastilla «Agotado hoy»

#### Scenario: Tocar un producto agotado
- **WHEN** el comercio toca un producto agotado en la venta
- **THEN** el producto no se agrega al ticket

#### Scenario: Día siguiente
- **WHEN** llega el día siguiente
- **THEN** el producto deja de estar agotado sin que el comercio haga nada

### Requirement: Quitar un producto
Quitar un producto SHALL pedir confirmación, y los tickets viejos conservan el nombre y el precio con que se vendió.

#### Scenario: Confirmar quitar
- **WHEN** el comercio toca «Quitar producto» en «Café americano»
- **THEN** la app muestra «¿Quitar Café americano?», «Sale del catálogo. Los tickets viejos no cambian.», «Sí, quitar producto» y «Volver»

#### Scenario: Tickets viejos intactos
- **WHEN** se quita o se cambia el precio de un producto
- **THEN** los pedidos ya hechos conservan el nombre y el precio con que se vendieron, y «Editar producto» dice «Los tickets viejos no cambian.»
