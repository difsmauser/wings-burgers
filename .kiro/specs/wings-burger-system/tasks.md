# Implementation Plan: Sistema de Gestión Wings & Burgers

## Overview

Implementación incremental del sistema de gestión para un negocio de alitas y hamburguesas usando Next.js 14+ (App Router), Supabase, arquitectura hexagonal, y despliegue en Vercel. Se construyen primero las capas de dominio y aplicación, luego adaptadores, y finalmente las interfaces de usuario de los cuatro módulos.

## Tasks

- [x] 1. Configuración del proyecto y estructura base
  - [x] 1.1 Inicializar proyecto Next.js 14+ con TypeScript y configurar dependencias
    - Crear proyecto con `create-next-app` usando App Router y TypeScript
    - Instalar dependencias: `@supabase/supabase-js`, `tailwindcss`, `vitest`, `fast-check`, `leaflet`, `next-pwa`
    - Configurar `tsconfig.json` con path aliases (`@/domain`, `@/application`, `@/adapters`, `@/shared`)
    - Configurar Vitest en `vitest.config.ts`
    - Configurar Tailwind CSS con paleta de colores cálidos (naranjas, rojos, amarillos, marrones)
    - _Requirements: 16.4, 17.1, 18.1_

  - [x] 1.2 Crear estructura de directorios de arquitectura hexagonal
    - Crear directorios: `src/domain/entities`, `src/domain/value-objects`, `src/domain/ports/repositories`, `src/domain/ports/services`
    - Crear directorios: `src/domain/services`, `src/domain/events`
    - Crear directorios: `src/application/use-cases`, `src/application/dtos`
    - Crear directorios: `src/adapters/driven/persistence/supabase`, `src/adapters/driven/payment`, `src/adapters/driven/messaging`
    - Crear directorios: `src/adapters/driven/storage`, `src/adapters/driven/notification`, `src/adapters/driven/geolocation`
    - Crear directorios: `src/adapters/driving/api`, `src/adapters/driving/realtime`
    - Crear directorios: `src/shared/config`, `src/shared/errors`, `src/shared/validators`, `src/shared/types`
    - Crear directorios: `src/tests/unit/domain`, `src/tests/property/domain`, `src/tests/integration`
    - _Requirements: 16.1, 16.4, 16.6_

  - [x] 1.3 Definir interfaces (puertos) del dominio
    - Crear `IProductoRepository.ts` con métodos: crear, actualizar, desactivar, obtenerPorId, listarActivos, listarPorCategoria
    - Crear `IPedidoRepository.ts` con métodos: crear, actualizar, obtenerPorId, obtenerPorNumero, listarPorEstado, listarPorCliente, listarPorPeriodo
    - Crear `IClienteRepository.ts` con métodos: crear, obtenerPorTelefono, obtenerPorId, listar con filtros
    - Crear `IInventarioRepository.ts` con métodos: registrar, actualizar, listarBajoMinimo, obtenerArticulosPorProducto
    - Crear `IGastoRepository.ts` con métodos: registrar, consultar, sumarPorCategoria, totalPorPeriodo
    - Crear `IPagoGateway.ts`, `IMensajeriaService.ts`, `INotificacionService.ts`, `IStorageService.ts`, `IGeolocalizacionService.ts`
    - _Requirements: 16.2, 16.3, 16.5, 16.6_

  - [x] 1.4 Configurar jerarquía de errores de dominio
    - Crear clase base abstracta `DomainError` con `code` y `statusCode`
    - Implementar errores: `ValidacionError`, `PrecioFueraDeRangoError`, `PrecioDecimalesInvalidosError`
    - Implementar errores: `TelefonoInvalidoError`, `ArchivoInvalidoError`, `ProductoNoDisponibleError`
    - Implementar errores: `TransicionEstadoInvalidaError`, `LimiteEntregasExcedidoError`, `PedidoMaximoItemsError`
    - Implementar errores: `RecursoNoEncontradoError`, `ServicioExternoError`, `PagoFallidoError`
    - _Requirements: 1.6, 1.7, 2.4, 2.5, 4.7, 7.6, 14.7_

- [x] 2. Implementar Value Objects y Entidades de Dominio
  - [x] 2.1 Implementar Value Objects (Precio, Telefono, Direccion, EstadoPedido)
    - Crear `Precio.ts`: validación rango 0.01-99999.99, máximo 2 decimales, métodos sumar/multiplicar/esIgual
    - Crear `Telefono.ts`: validación 10 dígitos, limpieza de caracteres no numéricos
    - Crear `Direccion.ts`: validación máximo 200 caracteres
    - Crear enums: `Categoria`, `EstadoPedido`, `ModalidadServicio`, `MetodoPago`, `EstadoPago`, `EstadoEntrega`, `TipoMovimiento`
    - _Requirements: 2.3, 2.4, 2.5, 6.1_

  - [x] 2.2 Write property test: Validación del Value Object Precio (Property 1)
    - **Property 1: Validación del Value Object Precio (Round-Trip)**
    - Generar valores válidos (0.01-99999.99, max 2 decimales) y verificar round-trip
    - Generar valores inválidos (fuera de rango, más de 2 decimales) y verificar rechazo
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [x] 2.3 Implementar entidad Producto
    - Crear `Producto.ts` con campos: id, nombre (max 100), descripcion (max 500), categoria, precio, imagenUrl, activo, opcionesPersonalizacion
    - Implementar método `validar()` que verifica campos obligatorios (nombre, categoría, precio)
    - Implementar método `desactivar()` y `actualizarPrecio()` que genera HistorialPrecio
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [x] 2.4 Write property test: Validación de Producto (Property 2)
    - **Property 2: Validación de Producto**
    - Generar combinaciones válidas/inválidas de datos de producto
    - Verificar creación exitosa con campos completos y rechazo con campos faltantes
    - **Validates: Requirements 1.1, 1.6**

  - [x] 2.5 Implementar entidad Pedido con máquina de estados
    - Crear `Pedido.ts` con campos: id, numero, clienteId, estado, modalidad, items, subtotal, impuestos, total
    - Implementar métodos: agregarItem, eliminarItem, modificarCantidad, recalcularTotal (max 50 items)
    - Implementar `cambiarEstado()` con validación de transiciones permitidas según máquina de estados
    - Implementar `confirmar()` y `puedeAgregarProductos()`
    - _Requirements: 7.1, 7.2, 7.3, 12.1, 14.2_

  - [x] 2.6 Write property test: Consistencia del Total del Pedido (Property 8)
    - **Property 8: Consistencia del Total del Pedido**
    - Generar secuencias aleatorias de operaciones (agregar, eliminar, modificar cantidad)
    - Verificar que total == suma(precio_unitario × cantidad) + impuestos en cada paso
    - **Validates: Requirements 7.2, 7.3**

  - [x] 2.7 Write property test: Transiciones Válidas de Estado del Pedido (Property 12)
    - **Property 12: Transiciones Válidas de Estado del Pedido**
    - Para cada estado, verificar que solo transiciones permitidas se aceptan
    - Verificar que transiciones no definidas lanzan TransicionEstadoInvalidaError
    - **Validates: Requirements 12.1, 14.2, 14.5**

  - [x] 2.8 Implementar entidades ArticuloInventario, Gasto y Entrega
    - Crear `ArticuloInventario.ts`: nombre (max 100), cantidad (0-999999), unidadMedida, nivelMinimo (>=1), métodos estaBajoMinimo/estaAgotado/decrementar/incrementar
    - Crear `Gasto.ts`: monto (Precio 0.01-999999.99), concepto (max 200), categoria, fecha, validar()
    - Crear `Entrega.ts`: pedidoId, repartidorId, estado, métodos aceptar/completar/marcarFallida
    - Crear `Cliente.ts`: nombre (max 100), telefono (Telefono), email, direccion
    - _Requirements: 4.1, 4.7, 3.1, 3.2, 14.1, 14.5, 14.6, 6.1_

  - [x] 2.9 Write property test: Inmutabilidad de Precio en Pedidos Confirmados (Property 3)
    - **Property 3: Inmutabilidad de Precio en Pedidos Confirmados**
    - Crear pedidos confirmados, cambiar precios de productos, verificar total inalterado
    - **Validates: Requirements 2.1**

  - [x] 2.10 Write property test: Validación de Archivos (Property 13)
    - **Property 13: Validación de Archivos (Imágenes y Comprobantes)**
    - Generar archivos con formatos/tamaños válidos e inválidos, verificar aceptación/rechazo
    - **Validates: Requirements 1.4, 1.7, 13.3, 13.9**

- [x] 3. Checkpoint - Verificar capa de dominio
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar Domain Services
  - [x] 4.1 Implementar PrecioService e InventarioService
    - Crear `PrecioService.ts`: lógica de actualización de precios con generación de historial
    - Crear `InventarioService.ts`: lógica de disponibilidad de producto basada en artículos de inventario, decremento al confirmar pedido
    - _Requirements: 2.1, 2.2, 4.4, 4.5, 4.6_

  - [x] 4.2 Write property test: Completitud del Historial de Precios (Property 4)
    - **Property 4: Completitud del Historial de Precios**
    - Aplicar N cambios de precio a un producto, verificar exactamente N registros con datos correctos
    - **Validates: Requirements 2.2**

  - [x] 4.3 Write property test: Consistencia Inventario-Disponibilidad (Property 5)
    - **Property 5: Consistencia Inventario-Disponibilidad de Producto**
    - Generar productos con ingredientes, verificar disponibilidad según cantidades de inventario
    - **Validates: Requirements 4.4, 4.5, 10.3**

  - [x] 4.4 Write property test: Decremento de Inventario al Confirmar Pedido (Property 6)
    - **Property 6: Decremento de Inventario al Confirmar Pedido**
    - Confirmar pedidos con N unidades, verificar decremento exacto de N × X unidades por artículo
    - **Validates: Requirements 4.6**

  - [x] 4.5 Implementar CorteService
    - Crear `CorteService.ts`: cálculos de corte diario/semanal/mensual
    - Calcular total ventas, total gastos, ganancia neta (ventas - gastos)
    - Calcular ticket promedio, top 5 productos más vendidos
    - Implementar desglose por día (semanal) y por semana (mensual)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.6 Write property test: Correctitud del Cálculo de Cortes Financieros (Property 7)
    - **Property 7: Correctitud del Cálculo de Cortes Financieros**
    - Generar conjuntos de pedidos y gastos, verificar: ventas = suma totales, ganancia = ventas - gastos, ticket promedio = ventas / pedidos
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 4.7 Write property test: Identidad de Cliente por Teléfono (Property 9)
    - **Property 9: Identidad de Cliente por Teléfono (Sin Duplicados)**
    - Crear múltiples pedidos con mismo teléfono, verificar un solo registro de cliente
    - **Validates: Requirements 6.1, 6.2**

  - [x] 4.8 Write property test: Correctitud de Filtrado de Gastos (Property 10)
    - **Property 10: Correctitud de Filtrado de Gastos**
    - Generar gastos y filtros aleatorios, verificar que resultados satisfacen todos los filtros y ningún gasto válido es omitido
    - **Validates: Requirements 3.3**

  - [x] 4.9 Write property test: Límite de Entregas Concurrentes (Property 11)
    - **Property 11: Límite de Entregas Concurrentes por Repartidor**
    - Verificar que con 3 entregas activas se rechaza aceptar más, con menos de 3 se permite
    - **Validates: Requirements 14.7**

  - [x] 4.10 Write property test: Correctitud del Resumen de Cuenta (Property 14)
    - **Property 14: Correctitud del Resumen de Cuenta**
    - Generar pedidos con N items, verificar N líneas en resumen, subtotal = suma(precio × cantidad), total = subtotal + impuestos
    - **Validates: Requirements 9.1**

  - [x] 4.11 Write property test: Correctitud de Agrupación de Gastos por Categoría (Property 15)
    - **Property 15: Correctitud de Agrupación de Gastos por Categoría**
    - Generar gastos, verificar conteo y suma por categoría, y suma categorías = total general
    - **Validates: Requirements 3.5**

- [x] 5. Checkpoint - Verificar domain services y property tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implementar Casos de Uso (Capa de Aplicación)
  - [x] 6.1 Implementar casos de uso de Productos
    - Crear `CrearProducto.ts`: validar campos, subir imagen a storage, crear entidad, persistir
    - Crear `EditarProducto.ts`: actualizar campos, manejar cambio de imagen
    - Crear `EliminarProducto.ts`: marcar como inactivo (soft delete)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

  - [x] 6.2 Implementar casos de uso de Pedidos
    - Crear `CrearPedido.ts`: validar/crear cliente, verificar disponibilidad, asignar número, crear pedido en estado "recibido", decrementar inventario, notificar vendedor
    - Crear `ActualizarEstadoPedido.ts`: validar transición, actualizar estado, emitir notificación
    - Crear `AgregarProductoAPedido.ts`: buscar pedido por número, agregar item, recalcular total
    - Crear `ConfirmarPedido.ts`: validar modalidad, confirmar pedido
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 4.6_

  - [x] 6.3 Implementar casos de uso de Inventario
    - Crear `RegistrarArticulo.ts`: validar datos, crear artículo
    - Crear `ActualizarCantidad.ts`: registrar movimiento, verificar nivel mínimo, notificar si bajo
    - Crear `VerificarDisponibilidad.ts`: verificar artículos por producto, actualizar disponibilidad
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 6.4 Implementar casos de uso de Pagos
    - Crear `IniciarPagoMercadoPago.ts`: obtener pedido, crear preferencia, retornar URL
    - Crear `ConfirmarPago.ts`: verificar firma webhook, actualizar estado, notificar
    - Crear `VerificarComprobante.ts`: admin aprueba/rechaza transferencia, notificar cliente
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 6.5 Implementar casos de uso de Entregas y Geolocalización
    - Crear `AceptarEntrega.ts`: validar límite 3 entregas, actualizar estado a "en_camino", activar rastreo
    - Crear `ActualizarUbicacion.ts`: recibir lat/lng, persistir, broadcast via realtime
    - Crear `CompletarEntrega.ts`: actualizar estado a "entregado", desactivar rastreo
    - Crear caso de uso para entrega fallida con motivo
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.7_

  - [x] 6.6 Implementar casos de uso de Gastos y Cortes
    - Crear `RegistrarGasto.ts`: validar monto, concepto, categoría, fecha, persistir
    - Crear `ConsultarGastos.ts`: aplicar filtros (categoría, fecha, monto), retornar resultados paginados
    - Crear `GenerarCorte.ts`: calcular corte diario/semanal/mensual según parámetros
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.7 Implementar casos de uso de Notificaciones y Cuenta
    - Crear `NotificarNuevoPedido.ts`: enviar alerta visual + sonido al vendedor
    - Crear `NotificarCambioEstado.ts`: enviar push al cliente
    - Crear `EnviarCuentaCliente.ts`: generar resumen, enviar por WhatsApp/email/app según canal seleccionado
    - Crear `NotificarInventarioBajo.ts`: alerta al admin cuando artículo bajo mínimo
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 6.8 Write unit tests para casos de uso principales
    - Test CrearPedido: pedido sin modalidad debe rechazarse (Req 7.5)
    - Test ActualizarEstadoPedido: transiciones válidas e inválidas
    - Test AceptarEntrega: límite de 3 entregas concurrentes
    - Test GenerarCorte: período sin movimientos retorna ceros (Req 5.5)
    - Test EnviarCuentaCliente: cliente sin dato de contacto muestra error (Req 9.5)
    - _Requirements: 7.5, 5.5, 9.5, 14.7_

- [x] 7. Checkpoint - Verificar capa de aplicación
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementar Adaptadores de Salida (Driven)
  - [x] 8.1 Configurar cliente Supabase y schema de base de datos
    - Crear `SupabaseClient.ts` con configuración de conexión
    - Crear migraciones SQL para todas las tablas: producto, cliente, pedido, pedido_detalle, articulo_inventario, movimiento_inventario, producto_inventario, gasto, historial_precio, entrega, ubicacion_repartidor, usuario, notificacion, qr_mesa
    - Configurar Row Level Security (RLS) básico
    - Configurar Supabase Realtime para canales necesarios
    - _Requirements: 17.1, 17.2_

  - [x] 8.2 Implementar repositorios Supabase
    - Crear `SupabaseProductoRepo.ts` implementando IProductoRepository
    - Crear `SupabasePedidoRepo.ts` implementando IPedidoRepository
    - Crear `SupabaseClienteRepo.ts` implementando IClienteRepository
    - Crear `SupabaseInventarioRepo.ts` implementando IInventarioRepository
    - Crear `SupabaseGastoRepo.ts` implementando IGastoRepository
    - Crear mappers: `ProductoMapper.ts`, `PedidoMapper.ts` para transformar entre entidades y registros DB
    - _Requirements: 16.2, 16.3_

  - [x] 8.3 Implementar adaptador MercadoPago
    - Crear `MercadoPagoAdapter.ts` implementando IPagoGateway
    - Implementar `crearPreferencia()`: crear preferencia de checkout con monto del pedido
    - Implementar `verificarPago()`: consultar estado de pago
    - Implementar `procesarWebhook()`: validar firma, extraer estado
    - Configurar URLs de retorno (success, failure, pending)
    - _Requirements: 13.2, 13.4, 13.6_

  - [x] 8.4 Implementar adaptador WhatsApp Cloud API
    - Crear `WhatsAppAdapter.ts` implementando IMensajeriaService
    - Implementar `enviarWhatsApp()`: enviar mensaje de texto mediante Meta WhatsApp Cloud API
    - Configurar templates de mensajes para: cuenta del cliente, confirmación de pedido, cambio de estado
    - Implementar reintentos (3 intentos, timeout 30s)
    - _Requirements: 9.2, 19.2_

  - [x] 8.5 Implementar adaptador de Storage y Geolocalización
    - Crear `SupabaseStorageAdapter.ts` implementando IStorageService
    - Implementar validación de archivos: formato (JPG, PNG, WebP para imágenes; JPG, PNG, PDF para comprobantes) y tamaño (<5MB)
    - Crear `BrowserGeoAdapter.ts` implementando IGeolocalizacionService
    - Implementar `SupabaseRealtimeAdapter.ts` implementando INotificacionService con canales broadcast
    - _Requirements: 1.4, 1.7, 13.3, 13.9, 14.3, 15.1, 15.2_

  - [x] 8.6 Write integration tests para adaptadores
    - Test MercadoPagoAdapter: webhook actualiza estado (mock MSW)
    - Test WhatsAppAdapter: envío exitoso y manejo de fallos
    - Test SupabaseRealtimeAdapter: broadcast de ubicación GPS
    - Test SupabaseStorageAdapter: validación de archivos
    - _Requirements: 13.4, 9.2, 14.3, 1.4_

- [x] 9. Implementar API Routes (Adaptadores de Entrada)
  - [x] 9.1 Crear API Routes para Productos e Inventario
    - Crear `app/api/productos/route.ts`: GET (listar), POST (crear)
    - Crear `app/api/productos/[id]/route.ts`: GET, PUT, DELETE
    - Crear `app/api/inventario/route.ts`: GET (listar), POST (registrar artículo)
    - Crear `app/api/inventario/[id]/route.ts`: PUT (actualizar cantidad)
    - Implementar middleware de autenticación y autorización por rol
    - Mapear DomainError a respuestas HTTP con formato JSON estándar
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

  - [x] 9.2 Crear API Routes para Pedidos y Entregas
    - Crear `app/api/pedidos/route.ts`: GET (listar por estado), POST (crear)
    - Crear `app/api/pedidos/[id]/route.ts`: GET, PUT (actualizar estado)
    - Crear `app/api/pedidos/[id]/items/route.ts`: POST (agregar producto), DELETE (eliminar)
    - Crear `app/api/entregas/route.ts`: GET (pendientes)
    - Crear `app/api/entregas/[id]/aceptar/route.ts`: POST
    - Crear `app/api/entregas/[id]/completar/route.ts`: POST
    - Crear `app/api/entregas/ubicacion/route.ts`: POST (actualizar GPS)
    - _Requirements: 7.1, 7.3, 7.4, 14.1, 14.2, 14.3, 14.5_

  - [x] 9.3 Crear API Routes para Pagos, Gastos y Cortes
    - Crear `app/api/pagos/mercadopago/route.ts`: POST (iniciar pago)
    - Crear `app/api/webhooks/mercadopago/route.ts`: POST (webhook callback)
    - Crear `app/api/pagos/comprobante/route.ts`: POST (subir comprobante)
    - Crear `app/api/gastos/route.ts`: GET (consultar con filtros), POST (registrar)
    - Crear `app/api/cortes/route.ts`: GET (generar corte por tipo y período)
    - Crear `app/api/clientes/route.ts`: GET (listar con filtros)
    - Crear `app/api/clientes/[id]/route.ts`: GET (detalle con historial)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 3.1, 3.3, 5.1, 5.2, 5.3, 6.4, 6.5_

  - [x] 9.4 Crear API Routes para QR, Notificaciones y Cuenta
    - Crear `app/api/qr/route.ts`: GET (generar QR por mesa/zona)
    - Crear `app/api/qr/[codigo]/route.ts`: GET (validar QR y retornar info de mesa)
    - Crear `app/api/cuenta/enviar/route.ts`: POST (enviar cuenta por canal seleccionado)
    - Crear `app/api/notificaciones/route.ts`: GET (listar pendientes por usuario)
    - Crear `app/api/webhooks/whatsapp/route.ts`: POST (webhook WhatsApp)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 19.5_

- [x] 10. Checkpoint - Verificar backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implementar Módulo Administrador (UI)
  - [x] 11.1 Crear layout y navegación del módulo Admin
    - Crear `app/(admin)/layout.tsx` con sidebar de navegación: Productos, Precios, Gastos, Inventario, Cortes, Clientes
    - Implementar protección de ruta por rol "admin"
    - Aplicar paleta de colores cálidos con Tailwind CSS
    - Configurar componentes base reutilizables (Button, Input, Table, Modal, Alert)
    - _Requirements: 18.1, 18.3_

  - [x] 11.2 Implementar páginas de Productos y Precios
    - Crear `app/(admin)/productos/page.tsx`: listado con filtro por categoría, crear/editar/desactivar
    - Crear formulario de producto con carga de imagen (validación formato y tamaño)
    - Crear `app/(admin)/precios/page.tsx`: lista de productos con precio actual, formulario de edición, historial de cambios
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 11.3 Implementar páginas de Gastos y Cortes
    - Crear `app/(admin)/gastos/page.tsx`: registro de gasto, consulta con filtros (categoría, fechas, monto), resumen por categoría
    - Crear `app/(admin)/cortes/page.tsx`: selección de tipo (diario/semanal/mensual), visualización de reporte con ventas, gastos, ganancia, ticket promedio, top 5 productos
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.4 Implementar páginas de Inventario y Clientes
    - Crear `app/(admin)/inventario/page.tsx`: listado de artículos, alertas de bajo stock, formulario de registro/actualización, historial de movimientos
    - Crear `app/(admin)/clientes/page.tsx`: listado con filtros (nombre, pedidos recientes, monto total), detalle con historial de pedidos paginado (50/página)
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 6.1, 6.4, 6.5_

- [x] 12. Implementar Módulo Vendedor (UI)
  - [x] 12.1 Crear layout y panel de pedidos del vendedor
    - Crear `app/(vendedor)/layout.tsx` con navegación: Pedidos, Cuenta
    - Implementar protección de ruta por rol "vendedor"
    - Crear `app/(vendedor)/pedidos/page.tsx`: panel en tiempo real con pedidos activos por estado
    - Implementar notificación sonora + alerta visual para nuevos pedidos (persiste hasta reconocer)
    - _Requirements: 19.1, 7.1_

  - [x] 12.2 Implementar captura de pedidos y envío de cuenta
    - Crear interfaz de captura de pedido: selección de productos del catálogo activo, modificación de cantidades, selección de modalidad
    - Implementar búsqueda de pedido por número para agregar productos
    - Crear `app/(vendedor)/cuenta/page.tsx`: generar resumen de cuenta, envío por WhatsApp/email/app
    - Mostrar errores de envío y opción de reintentar o cambiar canal
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 13. Implementar Módulo Cliente (UI)
  - [x] 13.1 Crear layout y visualización del menú
    - Crear `app/(cliente)/layout.tsx` con navegación: Menú, Mi Pedido, Pago, Rastreo
    - Crear `app/(cliente)/menu/page.tsx`: menú por categorías con imágenes, precios, indicador de disponibilidad
    - Implementar selector de modalidad (local/domicilio) antes de mostrar menú
    - Implementar imagen placeholder cuando producto no tiene imagen
    - Diseño responsive (320px-1920px), elementos táctiles 44x44px mínimo
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 18.2, 18.4, 18.5_

  - [x] 13.2 Implementar personalización y confirmación de pedido
    - Crear `app/(cliente)/pedido/page.tsx`: vista de carrito con productos seleccionados
    - Implementar opciones de personalización (picante, extras, acompañamientos) con precios adicionales
    - Implementar campo de comentarios especiales (max 250 chars) por producto
    - Permitir modificar personalizaciones y comentarios mientras no esté confirmado
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 13.3 Implementar flujo de pago del cliente
    - Crear `app/(cliente)/pago/page.tsx`: mostrar opciones MercadoPago y transferencia
    - Implementar redirección a MercadoPago con monto total
    - Implementar vista de datos bancarios + carga de comprobante (JPG, PNG, PDF, max 5MB)
    - Manejar pago exitoso, fallido (3 reintentos), y cancelación automática (24h)
    - _Requirements: 13.1, 13.2, 13.3, 13.6, 13.8, 13.9_

  - [x] 13.4 Implementar rastreo de pedido en tiempo real
    - Crear `app/(cliente)/rastreo/page.tsx`: indicador visual de estados del pedido
    - Implementar actualización en tiempo real via Supabase Realtime (max 5s delay)
    - Implementar mapa con Leaflet + OpenStreetMap para pedidos a domicilio "en camino"
    - Mostrar ubicación del repartidor actualizada cada 10-15 segundos
    - Manejar pérdida de conexión: mensaje, reintentos cada 10s (max 5), último estado conocido
    - Manejar GPS no disponible: indicador de señal perdida, última posición conocida
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 15.1, 15.2, 15.3, 15.4_

- [x] 14. Implementar Módulo Repartidor (UI)
  - [x] 14.1 Crear interfaz del repartidor con mapa y entregas
    - Crear `app/(repartidor)/layout.tsx` con navegación: Entregas, Mapa
    - Crear `app/(repartidor)/entregas/page.tsx`: lista de entregas pendientes (nombre, dirección, teléfono)
    - Implementar botón "Aceptar entrega" (validar límite 3 activas)
    - Implementar envío GPS cada 10s via `navigator.geolocation.watchPosition()`
    - Implementar alerta de pérdida de señal GPS (>60s)
    - Implementar botones "Completar entrega" y "No se pudo entregar" (con campo motivo)
    - Crear `app/(repartidor)/mapa/page.tsx`: mapa con ruta actual usando Leaflet
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 15. Checkpoint - Verificar módulos UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implementar funcionalidades transversales
  - [x] 16.1 Implementar sistema QR y acceso por mesa
    - Crear lógica de generación de QR únicos por mesa/zona
    - Crear `app/(cliente)/menu/page.tsx` con detección de parámetro QR para identificar mesa
    - Validar QR: si inválido, mostrar mensaje de error e invitación a solicitar asistencia
    - Notificar al vendedor cuando pedido viene de QR (max 10s)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 16.2 Configurar PWA con service workers
    - Configurar `next-pwa` para generar service worker
    - Configurar manifest.json con iconos y colores del tema
    - Implementar caché offline para menú y assets estáticos
    - Configurar notificaciones push (solicitar permisos, registrar suscripción)
    - _Requirements: 19.2, 19.5, 12.4_

  - [x] 16.3 Implementar sistema de autenticación y roles
    - Configurar Supabase Auth con roles: admin, vendedor, cliente, repartidor
    - Crear middleware Next.js para proteger rutas por rol
    - Implementar login y registro básico
    - _Requirements: 16.1, 16.2_

  - [x] 16.4 Implementar sistema de notificaciones completo
    - Configurar canales Supabase Realtime: pedidos:vendedor, pedido:estado:{id}, ubicacion:{id}, inventario:alertas, notificaciones:{userId}
    - Implementar handler de reconexión automática (max 5 reintentos, 10s intervalo)
    - Implementar push notifications con fallback a notificación in-app
    - Implementar reintentos de push (3 intentos, 2 min) con almacenamiento como pendiente
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 17. Integración final y despliegue
  - [x] 17.1 Wiring completo: conectar todos los módulos y configurar inyección de dependencias
    - Crear factory/container para inyección de dependencias en los casos de uso
    - Conectar API Routes con casos de uso correctos usando las implementaciones de adaptadores
    - Verificar que dominio no importa adaptadores directamente (arquitectura hexagonal)
    - Configurar variables de entorno: SUPABASE_URL, SUPABASE_KEY, MERCADOPAGO_ACCESS_TOKEN, WHATSAPP_TOKEN
    - _Requirements: 16.1, 16.2, 16.3, 16.6_

  - [x] 17.2 Configurar despliegue en Vercel
    - Crear `vercel.json` con configuración optimizada
    - Configurar environment variables en Vercel
    - Configurar dominio (*.vercel.app o dominio personalizado)
    - Verificar que costo total no exceda $10 USD mensuales
    - _Requirements: 17.1, 17.3, 17.4_

  - [x] 17.3 Write integration tests end-to-end de flujos principales
    - Test flujo completo: crear producto → agregar a pedido → confirmar → pagar → entregar
    - Test flujo QR: escanear → ver menú → personalizar → confirmar → rastrear
    - Test flujo financiero: registrar gastos → generar corte → verificar cálculos
    - _Requirements: 7.1, 8.1, 13.1, 5.1_

- [x] 18. Checkpoint final - Verificar sistema completo
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcados con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada task referencia requirements específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud del dominio
- Los unit tests validan ejemplos específicos y edge cases
- Se usa TypeScript en todo el proyecto con Vitest + fast-check para testing
- La arquitectura hexagonal permite testear dominio sin infraestructura real (Req 16.5)
- El sistema está diseñado para funcionar dentro del presupuesto de $10 USD/mes (Req 17.1)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1", "2.8"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.10"] },
    { "id": 5, "tasks": ["2.4", "2.5"] },
    { "id": 6, "tasks": ["2.6", "2.7", "2.9"] },
    { "id": 7, "tasks": ["4.1", "4.5"] },
    { "id": 8, "tasks": ["4.2", "4.3", "4.4", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11"] },
    { "id": 9, "tasks": ["6.1", "6.3", "6.6"] },
    { "id": 10, "tasks": ["6.2", "6.4", "6.5", "6.7"] },
    { "id": 11, "tasks": ["6.8"] },
    { "id": 12, "tasks": ["8.1"] },
    { "id": 13, "tasks": ["8.2", "8.3", "8.4", "8.5"] },
    { "id": 14, "tasks": ["8.6", "9.1", "9.2", "9.3", "9.4"] },
    { "id": 15, "tasks": ["11.1", "16.3"] },
    { "id": 16, "tasks": ["11.2", "11.3", "11.4", "12.1"] },
    { "id": 17, "tasks": ["12.2", "13.1"] },
    { "id": 18, "tasks": ["13.2", "13.3", "13.4"] },
    { "id": 19, "tasks": ["14.1", "16.1", "16.2"] },
    { "id": 20, "tasks": ["16.4"] },
    { "id": 21, "tasks": ["17.1"] },
    { "id": 22, "tasks": ["17.2", "17.3"] }
  ]
}
```
