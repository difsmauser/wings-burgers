# Documento de Requisitos - Sistema de Gestión para Alitas y Hamburguesas

## Introducción

Sistema integral de gestión para un negocio de alitas y hamburguesas que abarca cuatro módulos principales: Administración, Vendedor, Cliente y Repartidor. El sistema permite la gestión completa del negocio desde la carga de productos hasta la entrega a domicilio con rastreo en tiempo real. Implementado con arquitectura hexagonal, infraestructura de bajo costo y una experiencia de usuario profesional e interactiva.

## Glosario

- **Sistema**: El sistema completo de gestión del restaurante de alitas y hamburguesas
- **Módulo_Admin**: Interfaz web/app para la administración del negocio (productos, precios, gastos, inventario, cortes, clientes)
- **Módulo_Vendedor**: Interfaz para captura y gestión de pedidos en el local o remotamente
- **Módulo_Cliente**: Interfaz interactiva donde el cliente visualiza el menú, personaliza y realiza pedidos
- **Módulo_Repartidor**: Interfaz para el repartidor que gestiona entregas a domicilio con rastreo en tiempo real
- **Producto**: Artículo del menú (alitas, hamburguesas, bebidas u otros) con nombre, descripción, imagen y precio
- **Pedido**: Solicitud de uno o más productos realizada por un cliente, con estado rastreable
- **Corte**: Reporte financiero de ventas y gastos en un período determinado (día, semana o mes)
- **Inventario**: Control de existencias de ingredientes y productos disponibles
- **Estado_Pedido**: Fase actual del pedido (recibido, en preparación, empacado, servido/en camino, entregado)
- **Modalidad_Servicio**: Tipo de servicio seleccionado por el cliente (comer en el local o entrega a domicilio)
- **MercadoPago**: Plataforma de pagos electrónicos integrada al sistema
- **Transferencia_Bancaria**: Método de pago donde el cliente envía un comprobante de transferencia
- **Arquitectura_Hexagonal**: Patrón de diseño de software que separa la lógica de negocio de los adaptadores externos (puertos y adaptadores)

## Requisitos

### Requisito 1: Gestión de Productos

**Historia de Usuario:** Como administrador, quiero gestionar el catálogo de productos del negocio (alitas, hamburguesas, bebidas y otros), para mantener el menú actualizado con información completa.

#### Criterios de Aceptación

1. WHEN el administrador crea un producto, THE Módulo_Admin SHALL almacenar el producto con nombre (máximo 100 caracteres), descripción (máximo 500 caracteres), imagen, categoría y precio (valor numérico entre 0.01 y 99,999.99)
2. WHEN el administrador edita un producto existente, THE Módulo_Admin SHALL actualizar los campos modificados y reflejar los cambios en el Módulo_Cliente
3. WHEN el administrador elimina un producto, THE Módulo_Admin SHALL marcar el producto como inactivo y ocultarlo del menú visible para el cliente
4. WHEN el administrador carga una imagen para un producto, THE Módulo_Admin SHALL validar que la imagen tenga formato válido (JPG, PNG o WebP) y tamaño menor a 5MB
5. THE Módulo_Admin SHALL categorizar los productos en al menos: alitas, hamburguesas, bebidas y otros
6. IF el administrador intenta crear o editar un producto sin completar los campos obligatorios (nombre, categoría y precio), THEN THE Módulo_Admin SHALL impedir el guardado y mostrar un mensaje de error indicando los campos faltantes
7. IF el administrador carga una imagen con formato no válido o tamaño superior a 5MB, THEN THE Módulo_Admin SHALL rechazar la carga, conservar la imagen anterior si existía, y mostrar un mensaje de error indicando la restricción incumplida

### Requisito 2: Gestión de Precios

**Historia de Usuario:** Como administrador, quiero configurar y actualizar los precios de los productos, para reflejar cambios en costos y estrategias comerciales.

#### Criterios de Aceptación

1. WHEN el administrador actualiza el precio de un producto, THE Módulo_Admin SHALL aplicar el nuevo precio (valor numérico con hasta 2 decimales entre 0.01 y 99,999.99) a todos los pedidos futuros sin afectar los precios de pedidos existentes ya confirmados
2. THE Módulo_Admin SHALL mostrar el historial de cambios de precio de cada producto ordenado por fecha descendente, incluyendo fecha del cambio, precio anterior y precio nuevo
3. WHEN el administrador configura un precio, THE Módulo_Admin SHALL validar que el valor sea mayor a cero y no exceda 99,999.99
4. IF el administrador ingresa un precio con más de 2 decimales, THEN THE Módulo_Admin SHALL rechazar el valor y mostrar un mensaje indicando que el precio debe tener máximo 2 decimales
5. IF el administrador ingresa un valor de precio igual a cero, negativo o superior a 99,999.99, THEN THE Módulo_Admin SHALL rechazar el valor y mostrar un mensaje indicando el rango permitido

### Requisito 3: Control de Gastos

**Historia de Usuario:** Como administrador, quiero registrar y controlar los gastos del negocio, para tener visibilidad financiera completa.

#### Criterios de Aceptación

1. WHEN el administrador registra un gasto, THE Módulo_Admin SHALL almacenar el monto (valor entre $0.01 y $999,999.99), concepto (máximo 200 caracteres), categoría y fecha del gasto
2. IF el administrador intenta registrar un gasto con monto fuera del rango permitido, concepto vacío o sin categoría seleccionada, THEN THE Módulo_Admin SHALL rechazar el registro y mostrar un mensaje de error indicando el campo inválido
3. THE Módulo_Admin SHALL permitir la consulta de gastos filtrados por categoría, rango de fechas (hasta 365 días) y rango de monto (mínimo y máximo), mostrando los resultados ordenados por fecha descendente
4. IF la consulta de gastos no encuentra resultados para los filtros aplicados, THEN THE Módulo_Admin SHALL mostrar un mensaje indicando que no se encontraron gastos con los criterios seleccionados
5. WHEN el administrador solicita un resumen de gastos, THE Módulo_Admin SHALL mostrar el total de gastos agrupados por categoría en el período seleccionado, incluyendo el número de registros y la suma por cada categoría

### Requisito 4: Gestión de Inventario

**Historia de Usuario:** Como administrador, quiero controlar el inventario de ingredientes y productos, para evitar vender productos sin existencia.

#### Criterios de Aceptación

1. WHEN el administrador registra un artículo de inventario, THE Módulo_Admin SHALL almacenar nombre (máximo 100 caracteres), cantidad (valor numérico entre 0 y 999,999), unidad de medida y nivel mínimo de alerta (valor numérico mayor o igual a 1 en la unidad correspondiente)
2. WHEN la cantidad de un artículo de inventario alcanza o desciende por debajo del nivel mínimo de alerta, THE Módulo_Admin SHALL mostrar una alerta visual en el panel de administración indicando el nombre del artículo y la cantidad actual
3. WHEN el administrador actualiza la cantidad de un artículo, THE Módulo_Admin SHALL registrar en un historial la fecha, la cantidad anterior, la cantidad nueva, el tipo de movimiento (entrada o salida) y el administrador que realizó el cambio
4. IF un producto del menú depende de un artículo de inventario con cantidad igual a cero, THEN THE Módulo_Admin SHALL marcar el producto como no disponible en el menú dentro de los 5 segundos posteriores al cambio de inventario
5. WHEN la cantidad de un artículo de inventario con cantidad cero se actualiza a un valor mayor que cero y todos los artículos requeridos por un producto tienen cantidad mayor que cero, THE Módulo_Admin SHALL marcar el producto como disponible en el menú dentro de los 5 segundos posteriores al cambio
6. WHEN se confirma un pedido, THE Módulo_Admin SHALL decrementar automáticamente la cantidad de cada artículo de inventario asociado al producto según la receta definida
7. IF el administrador intenta registrar un artículo con nombre vacío, cantidad negativa o nivel mínimo de alerta menor a 1, THEN THE Módulo_Admin SHALL rechazar el registro y mostrar un mensaje de error indicando el campo inválido

### Requisito 5: Cortes Financieros

**Historia de Usuario:** Como administrador, quiero generar cortes de caja por día, semana y mes, para conocer el desempeño financiero del negocio.

#### Criterios de Aceptación

1. WHEN el administrador solicita un corte diario, THE Módulo_Admin SHALL generar un reporte con total de ventas, total de gastos y ganancia neta (ventas menos gastos) del día natural seleccionado (00:00:00 a 23:59:59) en un tiempo no mayor a 10 segundos
2. WHEN el administrador solicita un corte semanal, THE Módulo_Admin SHALL generar un reporte con totales de ventas, gastos y ganancia neta (ventas menos gastos) de los 7 días naturales previos a la fecha seleccionada, con desglose por día, en un tiempo no mayor a 15 segundos
3. WHEN el administrador solicita un corte mensual, THE Módulo_Admin SHALL generar un reporte con totales de ventas, gastos y ganancia neta (ventas menos gastos) del mes calendario seleccionado (día 1 al último día del mes), con desglose por semana, en un tiempo no mayor a 15 segundos
4. THE Módulo_Admin SHALL incluir en cada corte el número de pedidos completados, el ticket promedio (total de ventas dividido entre número de pedidos) y los 5 productos más vendidos del período ordenados por cantidad de unidades vendidas de mayor a menor
5. IF no existen registros de ventas ni gastos en el período seleccionado para el corte, THEN THE Módulo_Admin SHALL mostrar el reporte con todos los valores en cero e indicar un mensaje informando que no se encontraron movimientos en el período

### Requisito 6: Gestión de Clientes

**Historia de Usuario:** Como administrador, quiero gestionar la información de los clientes del negocio, para ofrecer un mejor servicio y fidelización.

#### Criterios de Aceptación

1. WHEN un cliente realiza su primer pedido, THE Sistema SHALL crear un registro de cliente con nombre (máximo 100 caracteres), número de teléfono (10 dígitos) y dirección de entrega (máximo 200 caracteres), donde nombre y teléfono son obligatorios
2. IF el número de teléfono ingresado ya existe en el registro de clientes, THEN THE Sistema SHALL asociar el pedido al cliente existente en lugar de crear un registro duplicado
3. IF el pedido no incluye nombre o teléfono del cliente, THEN THE Sistema SHALL impedir la creación del registro y mostrar un mensaje indicando los campos obligatorios faltantes
4. WHEN el administrador selecciona un cliente, THE Módulo_Admin SHALL mostrar el historial de pedidos de ese cliente ordenado por fecha descendente, mostrando fecha, monto y productos de cada pedido, con un máximo de 50 registros por página
5. WHEN el administrador consulta la lista de clientes, THE Módulo_Admin SHALL permitir filtrar por nombre, número de pedidos realizados en los últimos 30 días y monto total gastado acumulado en moneda local

### Requisito 7: Captura de Pedidos por Vendedor

**Historia de Usuario:** Como vendedor, quiero capturar pedidos de forma rápida y dinámica, para atender eficientemente a los clientes en el local.

#### Criterios de Aceptación

1. WHEN el vendedor inicia un nuevo pedido, THE Módulo_Vendedor SHALL asignar un número de pedido visible y permitir agregar productos seleccionándolos del catálogo activo, con un máximo de 50 productos por pedido
2. WHEN el vendedor agrega un producto al pedido, THE Módulo_Vendedor SHALL actualizar el total de la cuenta en no más de 1 segundo
3. WHILE un pedido está abierto, THE Módulo_Vendedor SHALL permitir agregar productos, eliminar productos o modificar la cantidad de un producto existente en el pedido
4. WHEN el cliente solicita agregar productos a un pedido existente, THE Módulo_Vendedor SHALL permitir buscar el pedido por su número y actualizar la cuenta total sin necesidad de crear un nuevo pedido
5. WHEN el vendedor captura un pedido, THE Módulo_Vendedor SHALL registrar la modalidad de servicio (local o domicilio) antes de confirmar el pedido
6. IF el vendedor intenta agregar un producto que no está disponible en el catálogo activo, THEN THE Módulo_Vendedor SHALL indicar al vendedor que el producto no está disponible y no agregarlo al pedido

### Requisito 8: Pedidos por QR

**Historia de Usuario:** Como vendedor, quiero que los clientes puedan acceder al menú escaneando un código QR, para agilizar la toma de pedidos en el local.

#### Criterios de Aceptación

1. WHEN un cliente escanea el código QR del menú, THE Sistema SHALL redirigir al cliente al Módulo_Cliente mostrando el menú con todos los productos disponibles, sus precios, descripciones y cantidades, identificando la mesa o zona asociada al QR escaneado, en un tiempo máximo de 5 segundos
2. WHEN un cliente realiza un pedido desde el QR, THE Módulo_Vendedor SHALL recibir una notificación del nuevo pedido en un máximo de 10 segundos, incluyendo la identificación de mesa o zona, los productos seleccionados con sus cantidades, y las observaciones del cliente
3. THE Sistema SHALL generar códigos QR únicos por mesa o zona del local
4. IF un cliente escanea un código QR inválido o no reconocido por el sistema, THEN THE Sistema SHALL mostrar un mensaje de error indicando que el código no es válido e invitando al cliente a solicitar asistencia al personal del local
5. WHILE un producto se encuentra marcado como no disponible en el sistema, THE Módulo_Cliente SHALL mostrar dicho producto como no disponible e impedir su selección en el menú accedido por QR

### Requisito 9: Envío de Cuenta al Cliente

**Historia de Usuario:** Como vendedor, quiero enviar la cuenta al cliente por diferentes medios, para facilitar el pago y dar un servicio profesional.

#### Criterios de Aceptación

1. WHEN el vendedor cierra un pedido, THE Módulo_Vendedor SHALL generar un resumen de cuenta que incluya: nombre del cliente, listado de productos con cantidades y precios unitarios, subtotal, impuestos aplicables y total a pagar
2. WHEN el vendedor selecciona envío por WhatsApp, THE Módulo_Vendedor SHALL enviar el resumen de cuenta al número de teléfono del cliente mediante WhatsApp y mostrar una confirmación de envío exitoso al vendedor en un máximo de 30 segundos
3. WHEN el vendedor selecciona envío por correo electrónico, THE Módulo_Vendedor SHALL enviar el resumen de cuenta al correo del cliente y mostrar una confirmación de envío exitoso al vendedor en un máximo de 30 segundos
4. WHEN el vendedor selecciona envío por app, THE Módulo_Vendedor SHALL enviar una notificación con el resumen de cuenta al Módulo_Cliente del usuario y mostrar una confirmación de envío exitoso al vendedor en un máximo de 30 segundos
5. IF el cliente no tiene registrado el dato de contacto requerido por el canal seleccionado (número de teléfono para WhatsApp, correo electrónico para correo, o cuenta en la app para notificación), THEN THE Módulo_Vendedor SHALL mostrar un mensaje de error indicando el dato faltante y permitir al vendedor seleccionar un canal alternativo o registrar el dato de contacto
6. IF el envío del resumen de cuenta falla por error del servicio de mensajería o tiempo de espera agotado, THEN THE Módulo_Vendedor SHALL mostrar un mensaje de error indicando la falla al vendedor y permitir reintentar el envío o seleccionar un canal alternativo

### Requisito 10: Visualización del Menú por el Cliente

**Historia de Usuario:** Como cliente, quiero ver el menú completo con descripciones e imágenes de cada producto, para tomar una decisión informada sobre mi pedido.

#### Criterios de Aceptación

1. THE Módulo_Cliente SHALL mostrar todos los productos activos organizados por categoría, presentando para cada producto: nombre, descripción (máximo 200 caracteres visibles), imagen y precio en formato numérico con dos decimales y símbolo de moneda
2. WHEN el cliente selecciona una categoría, THE Módulo_Cliente SHALL filtrar los productos mostrando solo los de la categoría seleccionada, y SHALL ofrecer una opción visible para volver a mostrar todos los productos de todas las categorías
3. THE Módulo_Cliente SHALL mostrar para cada producto un indicador de disponibilidad con dos estados distinguibles: "disponible" (el producto puede agregarse al pedido) y "no disponible" (el producto es visible pero no puede agregarse al pedido)
4. WHEN el cliente accede al Módulo_Cliente, THE Módulo_Cliente SHALL preguntar la modalidad de servicio (comer en el local o entrega a domicilio) antes de mostrar el menú
5. IF un producto no cuenta con imagen registrada, THEN THE Módulo_Cliente SHALL mostrar una imagen genérica de marcador de posición en lugar del espacio vacío

### Requisito 11: Personalización de Pedido por el Cliente

**Historia de Usuario:** Como cliente, quiero personalizar mis alimentos y agregar comentarios especiales, para recibir mi pedido exactamente como lo deseo.

#### Criterios de Aceptación

1. WHEN el cliente selecciona un producto, THE Módulo_Cliente SHALL mostrar opciones de personalización configuradas por el administrador (nivel de picante, ingredientes extra, acompañamientos) con el precio adicional visible para cada opción que tenga costo extra
2. WHEN el cliente agrega un comentario especial a un producto, THE Módulo_Cliente SHALL almacenar el comentario (máximo 250 caracteres) y mostrarlo al vendedor y cocina en el detalle del pedido
3. WHILE el pedido no ha sido confirmado, THE Módulo_Cliente SHALL permitir al cliente modificar personalizaciones y comentarios
4. IF un producto no tiene opciones de personalización configuradas, THEN THE Módulo_Cliente SHALL mostrar únicamente el campo de comentarios especiales sin sección de personalización

### Requisito 12: Rastreo de Estado del Pedido por el Cliente

**Historia de Usuario:** Como cliente, quiero ver en tiempo real el estado de mi pedido, para saber cuándo estará listo o llegará a mi domicilio.

#### Criterios de Aceptación

1. WHEN el cliente confirma un pedido, THE Módulo_Cliente SHALL mostrar un indicador visual del estado actual del pedido dentro de los 3 segundos posteriores a la confirmación, representando los estados posibles en orden secuencial: recibido, en preparación, empacado, servido (para consumo en local) o en camino (para domicilio), y entregado
2. WHEN el estado del pedido cambia, THE Módulo_Cliente SHALL actualizar el indicador visual en un máximo de 5 segundos desde que ocurrió el cambio de estado, sin necesidad de que el cliente recargue la página
3. WHILE el pedido tiene modalidad de domicilio y estado "en camino", THE Módulo_Cliente SHALL mostrar la ubicación del repartidor en un mapa con actualizaciones cada 15 segundos como máximo
4. IF la conexión del cliente se interrumpe mientras visualiza el estado del pedido, THEN THE Módulo_Cliente SHALL mostrar un mensaje indicando pérdida de conexión y reintentar la conexión automáticamente cada 10 segundos hasta un máximo de 5 reintentos, conservando el último estado conocido del pedido en pantalla
5. IF la ubicación del repartidor no está disponible mientras el pedido está "en camino", THEN THE Módulo_Cliente SHALL mostrar un mensaje indicando que la ubicación no está disponible temporalmente y mantener visible el último punto de ubicación conocido en el mapa

### Requisito 13: Proceso de Pago

**Historia de Usuario:** Como cliente, quiero pagar mi pedido de forma segura mediante diferentes métodos, para completar mi compra de manera conveniente.

#### Criterios de Aceptación

1. WHEN el cliente confirma su pedido, THE Sistema SHALL mostrar las opciones de pago disponibles: MercadoPago y transferencia bancaria en un máximo de 3 segundos
2. WHEN el cliente selecciona MercadoPago, THE Sistema SHALL redirigir al cliente a la pasarela de MercadoPago con el monto total del pedido
3. WHEN el cliente selecciona transferencia bancaria, THE Sistema SHALL mostrar los datos bancarios del negocio y permitir al cliente subir una imagen del comprobante de transferencia en formato JPG, PNG o PDF con un tamaño máximo de 5 MB
4. WHEN MercadoPago confirma un pago exitoso, THE Sistema SHALL actualizar el estado del pedido a "pagado" y notificar al vendedor mediante una notificación en el panel de administración
5. WHEN el administrador verifica un comprobante de transferencia, THE Módulo_Admin SHALL marcar el pedido como "pagado" y notificar al cliente que su pago fue confirmado
6. IF el pago mediante MercadoPago falla, THEN THE Sistema SHALL mostrar al cliente un mensaje indicando el error y permitir reintentar el pago hasta un máximo de 3 intentos
7. IF el administrador rechaza un comprobante de transferencia, THEN THE Módulo_Admin SHALL marcar el pedido como "pago rechazado", notificar al cliente indicando el motivo del rechazo, y permitir al cliente subir un nuevo comprobante
8. IF el cliente no sube un comprobante de transferencia dentro de las 24 horas siguientes a la selección del método de pago, THEN THE Sistema SHALL cancelar el pedido automáticamente y notificar al cliente de la cancelación
9. IF el cliente intenta subir un archivo que no cumple con el formato permitido o excede el tamaño máximo de 5 MB, THEN THE Sistema SHALL rechazar la carga y mostrar un mensaje indicando las restricciones de formato y tamaño aceptados

### Requisito 14: Gestión de Entregas por Repartidor

**Historia de Usuario:** Como repartidor, quiero ver los pedidos asignados para entrega y gestionar el proceso de entrega, para cumplir con los tiempos y dar buen servicio.

#### Criterios de Aceptación

1. WHEN un pedido con modalidad domicilio está en estado "empacado", THE Módulo_Repartidor SHALL mostrar el pedido en la lista de entregas pendientes incluyendo nombre del cliente, dirección completa de entrega y número de teléfono de contacto
2. WHEN el repartidor acepta una entrega, THE Módulo_Repartidor SHALL actualizar el estado del pedido a "en camino" y activar el rastreo de ubicación
3. WHILE el repartidor está en camino, THE Módulo_Repartidor SHALL transmitir la ubicación GPS del repartidor al Sistema cada 10 segundos
4. IF el Módulo_Repartidor no puede obtener señal GPS durante más de 60 segundos, THEN THE Módulo_Repartidor SHALL mostrar una alerta al repartidor indicando pérdida de señal y registrar la última ubicación conocida en el Sistema
5. WHEN el repartidor marca la entrega como completada, THE Módulo_Repartidor SHALL actualizar el estado del pedido a "entregado" y desactivar el rastreo de ubicación
6. IF el repartidor no puede completar la entrega, THEN THE Módulo_Repartidor SHALL permitir registrar el motivo de no entrega, actualizar el estado del pedido a "entrega fallida" y desactivar el rastreo de ubicación
7. WHILE el repartidor tiene 3 entregas en estado "en camino", THE Módulo_Repartidor SHALL impedir que acepte entregas adicionales

### Requisito 15: Rastreo en Tiempo Real para Cliente a Domicilio

**Historia de Usuario:** Como cliente con pedido a domicilio, quiero rastrear la ubicación de mi repartidor en tiempo real, para saber exactamente cuándo llegará mi pedido.

#### Criterios de Aceptación

1. WHEN el pedido cambia a estado "en camino", THE Módulo_Cliente SHALL mostrar un mapa con la ubicación del repartidor y el tiempo estimado de llegada en minutos
2. WHILE el pedido está en estado "en camino", THE Módulo_Cliente SHALL actualizar la posición del repartidor en el mapa y el tiempo estimado de llegada cada 10 segundos
3. IF la ubicación del repartidor no se puede obtener durante 30 segundos o más, THEN THE Módulo_Cliente SHALL mostrar un indicador de señal no disponible en el mapa conservando la última posición conocida del repartidor
4. WHEN el pedido cambia a estado "entregado", THE Módulo_Cliente SHALL ocultar el mapa de rastreo y mostrar una confirmación de entrega que incluya la hora de entrega y el nombre del repartidor

### Requisito 16: Arquitectura Hexagonal

**Historia de Usuario:** Como equipo de desarrollo, quiero que el sistema esté construido con arquitectura hexagonal, para mantener el código desacoplado, testeable y fácil de mantener.

#### Criterios de Aceptación

1. THE Sistema SHALL separar la lógica de negocio (dominio) de los adaptadores de infraestructura, donde el código de la capa de dominio no importará ni referenciará directamente código de la capa de adaptadores
2. THE Sistema SHALL definir puertos (interfaces) declarados dentro de la capa de dominio para toda comunicación entre el dominio y los adaptadores externos
3. THE Sistema SHALL permitir reemplazar cualquier adaptador externo (base de datos, servicio de pagos, servicio de mensajería) sin requerir cambios en los archivos fuente de las capas de dominio y aplicación
4. THE Sistema SHALL organizar el código en directorios físicos separados por capa: dominio, aplicación (casos de uso) y adaptadores (entrada/salida)
5. THE Sistema SHALL permitir ejecutar las pruebas unitarias de la capa de dominio sin requerir conexión a base de datos, servicios externos ni infraestructura real
6. THE Sistema SHALL aplicar inversión de dependencias donde los adaptadores dependen del dominio y nunca el dominio de los adaptadores

### Requisito 17: Infraestructura de Bajo Costo

**Historia de Usuario:** Como dueño del negocio, quiero que el sistema funcione con infraestructura gratuita o de muy bajo costo, para mantener la inversión tecnológica mínima.

#### Criterios de Aceptación

1. THE Sistema SHALL ejecutarse con un costo total de infraestructura (hosting, base de datos, almacenamiento y servicios auxiliares combinados) que no exceda $10 USD mensuales bajo la carga operativa esperada de hasta 100 pedidos diarios y 5 usuarios concurrentes
2. THE Sistema SHALL utilizar una base de datos con nivel gratuito que soporte al menos 500 MB de almacenamiento y 10,000 registros de pedidos sin degradación en tiempos de respuesta por debajo de 2 segundos por consulta
3. THE Sistema SHALL consumir no más del 80% de las cuotas gratuitas disponibles (almacenamiento, ancho de banda, tiempo de cómputo) bajo la carga operativa normal del negocio
4. IF el consumo de recursos alcanza el 90% de los límites del nivel gratuito del servicio, THEN THE Sistema SHALL notificar al administrador indicando el recurso próximo a agotarse y el porcentaje de uso actual

### Requisito 18: Diseño Visual Profesional

**Historia de Usuario:** Como dueño del negocio, quiero que el sistema tenga un diseño profesional y atractivo con colores asociados al concepto de alitas y hamburguesas, para proyectar una imagen de calidad.

#### Criterios de Aceptación

1. THE Sistema SHALL utilizar una paleta de colores cálidos asociados a la gastronomía (tonos naranjas, rojos, amarillos y marrones) aplicada de forma uniforme en todos los módulos
2. THE Módulo_Cliente SHALL ser responsive, adaptando su layout sin scroll horizontal en viewports desde 320px hasta 1920px de ancho, con elementos interactivos de al menos 44x44px en dispositivos táctiles
3. THE Sistema SHALL mantener consistencia visual en todos los módulos utilizando la misma familia tipográfica, la misma escala de espaciado y el mismo estilo de iconografía
4. THE Módulo_Cliente SHALL incluir animaciones y transiciones con una duración entre 150ms y 400ms en interacciones de navegación y retroalimentación al usuario
5. IF el usuario tiene habilitada la preferencia de sistema "prefers-reduced-motion", THEN THE Módulo_Cliente SHALL desactivar o minimizar las animaciones mostrando los cambios de estado de forma inmediata

### Requisito 19: Notificaciones del Sistema

**Historia de Usuario:** Como usuario del sistema (administrador, vendedor, cliente o repartidor), quiero recibir notificaciones relevantes en tiempo real, para estar informado de los eventos importantes.

#### Criterios de Aceptación

1. WHEN se recibe un nuevo pedido, THE Sistema SHALL notificar al vendedor con un sonido audible y una alerta visual que persista en pantalla hasta que el vendedor la reconozca manualmente o hasta un máximo de 5 minutos, lo que ocurra primero
2. WHEN el estado de un pedido cambia, THE Sistema SHALL enviar una notificación push al cliente dentro de los 10 segundos siguientes al cambio, incluyendo el nombre del pedido y el nuevo estado; IF el cliente se encuentra con la aplicación abierta, THEN THE Sistema SHALL mostrar la notificación en pantalla en lugar de push
3. WHEN un pedido está listo para entrega a domicilio, THE Sistema SHALL notificar al repartidor que esté marcado con estado "activo" y sin pedido en curso asignado; IF ningún repartidor cumple estas condiciones, THEN THE Sistema SHALL notificar al administrador indicando que no hay repartidores disponibles para el pedido
4. WHEN el inventario de un artículo alcanza el nivel mínimo configurado por el administrador, THE Sistema SHALL notificar al administrador mediante alerta visual en el panel de administración y notificación push, indicando el nombre del artículo y la cantidad actual
5. IF una notificación push no puede ser entregada después de 3 reintentos en un período de 2 minutos, THEN THE Sistema SHALL registrar la notificación como pendiente y mostrarla al usuario la próxima vez que acceda al sistema
