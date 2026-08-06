-- ============================================================
-- Migración inicial: Schema completo Wings & Burgers
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: usuario
-- ============================================================
CREATE TABLE usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(15),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor', 'repartidor', 'cliente')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: producto
-- ============================================================
CREATE TABLE producto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('alitas', 'hamburguesas', 'bebidas', 'otros')),
  precio DECIMAL(8,2) NOT NULL CHECK (precio > 0 AND precio <= 99999.99),
  imagen_url VARCHAR(500),
  activo BOOLEAN NOT NULL DEFAULT true,
  opciones_personalizacion JSONB DEFAULT '[]'::jsonb,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: cliente
-- ============================================================
CREATE TABLE cliente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  direccion TEXT,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pedido
-- ============================================================
CREATE TABLE pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) UNIQUE NOT NULL,
  cliente_id UUID REFERENCES cliente(id) ON DELETE SET NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_preparacion', 'empacado', 'servido', 'en_camino', 'entregado', 'entrega_fallida', 'cancelado')),
  modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('local', 'domicilio')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  mesa_zona VARCHAR(50),
  observaciones TEXT,
  metodo_pago VARCHAR(30) CHECK (metodo_pago IN ('mercadopago', 'transferencia', 'efectivo')),
  estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'rechazado', 'cancelado')),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pedido_detalle
-- ============================================================
CREATE TABLE pedido_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(8,2) NOT NULL CHECK (precio_unitario > 0),
  precio_total DECIMAL(10,2) NOT NULL CHECK (precio_total > 0),
  comentario TEXT,
  personalizaciones JSONB DEFAULT '[]'::jsonb
);

-- ============================================================
-- TABLA: articulo_inventario
-- ============================================================
CREATE TABLE articulo_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  cantidad DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  unidad_medida VARCHAR(20) NOT NULL,
  nivel_minimo DECIMAL(10,3) NOT NULL CHECK (nivel_minimo >= 1),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: movimiento_inventario
-- ============================================================
CREATE TABLE movimiento_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  articulo_id UUID NOT NULL REFERENCES articulo_inventario(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(10) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida')),
  cantidad_anterior DECIMAL(10,3) NOT NULL,
  cantidad_nueva DECIMAL(10,3) NOT NULL,
  admin_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: producto_inventario (receta: relación producto-artículo)
-- ============================================================
CREATE TABLE producto_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo_inventario(id) ON DELETE CASCADE,
  cantidad_requerida DECIMAL(10,3) NOT NULL CHECK (cantidad_requerida > 0),
  UNIQUE(producto_id, articulo_id)
);

-- ============================================================
-- TABLA: gasto
-- ============================================================
CREATE TABLE gasto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0.01 AND monto <= 999999.99),
  concepto VARCHAR(200) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  admin_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: historial_precio
-- ============================================================
CREATE TABLE historial_precio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  precio_anterior DECIMAL(8,2) NOT NULL,
  precio_nuevo DECIMAL(8,2) NOT NULL,
  fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: entrega
-- ============================================================
CREATE TABLE entrega (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  repartidor_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  estado VARCHAR(20) NOT NULL DEFAULT 'asignada' CHECK (estado IN ('asignada', 'en_camino', 'entregada', 'fallida')),
  motivo_no_entrega TEXT,
  aceptada_en TIMESTAMP WITH TIME ZONE,
  completada_en TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- TABLA: ubicacion_repartidor
-- ============================================================
CREATE TABLE ubicacion_repartidor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repartidor_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  entrega_id UUID NOT NULL REFERENCES entrega(id) ON DELETE CASCADE,
  latitud DECIMAL(10,7) NOT NULL,
  longitud DECIMAL(10,7) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: notificacion
-- ============================================================
CREATE TABLE notificacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  cuerpo TEXT,
  leida BOOLEAN NOT NULL DEFAULT false,
  reintentos INTEGER NOT NULL DEFAULT 0,
  estado_envio VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_envio IN ('pendiente', 'enviada', 'fallida')),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: qr_mesa
-- ============================================================
CREATE TABLE qr_mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  mesa_zona VARCHAR(50) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- ÍNDICES para consultas frecuentes
-- ============================================================
CREATE INDEX idx_pedido_estado ON pedido(estado);
CREATE INDEX idx_pedido_numero ON pedido(numero);
CREATE INDEX idx_pedido_cliente_id ON pedido(cliente_id);
CREATE INDEX idx_pedido_creado_en ON pedido(creado_en);
CREATE INDEX idx_pedido_estado_pago ON pedido(estado_pago);

CREATE INDEX idx_cliente_telefono ON cliente(telefono);

CREATE INDEX idx_pedido_detalle_pedido_id ON pedido_detalle(pedido_id);
CREATE INDEX idx_pedido_detalle_producto_id ON pedido_detalle(producto_id);

CREATE INDEX idx_producto_categoria ON producto(categoria);
CREATE INDEX idx_producto_activo ON producto(activo);

CREATE INDEX idx_articulo_inventario_nombre ON articulo_inventario(nombre);

CREATE INDEX idx_movimiento_inventario_articulo_id ON movimiento_inventario(articulo_id);
CREATE INDEX idx_movimiento_inventario_fecha ON movimiento_inventario(fecha);

CREATE INDEX idx_gasto_categoria ON gasto(categoria);
CREATE INDEX idx_gasto_fecha ON gasto(fecha);

CREATE INDEX idx_historial_precio_producto_id ON historial_precio(producto_id);

CREATE INDEX idx_entrega_pedido_id ON entrega(pedido_id);
CREATE INDEX idx_entrega_repartidor_id ON entrega(repartidor_id);
CREATE INDEX idx_entrega_estado ON entrega(estado);

CREATE INDEX idx_ubicacion_repartidor_entrega_id ON ubicacion_repartidor(entrega_id);
CREATE INDEX idx_ubicacion_repartidor_timestamp ON ubicacion_repartidor(timestamp);

CREATE INDEX idx_notificacion_usuario_id ON notificacion(usuario_id);
CREATE INDEX idx_notificacion_leida ON notificacion(leida);
CREATE INDEX idx_notificacion_estado_envio ON notificacion(estado_envio);

CREATE INDEX idx_qr_mesa_codigo ON qr_mesa(codigo);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulo_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precio ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicacion_repartidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_mesa ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: permitir acceso a usuarios autenticados
-- (En producción se refinarán por rol)

CREATE POLICY "Usuarios autenticados pueden ver usuarios"
  ON usuario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden ver productos"
  ON producto FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar productos"
  ON producto FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver clientes"
  ON cliente FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar clientes"
  ON cliente FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver pedidos"
  ON pedido FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar pedidos"
  ON pedido FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver detalle de pedidos"
  ON pedido_detalle FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar detalle de pedidos"
  ON pedido_detalle FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver inventario"
  ON articulo_inventario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar inventario"
  ON articulo_inventario FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver movimientos de inventario"
  ON movimiento_inventario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar movimientos de inventario"
  ON movimiento_inventario FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver producto_inventario"
  ON producto_inventario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar producto_inventario"
  ON producto_inventario FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver gastos"
  ON gasto FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar gastos"
  ON gasto FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver historial de precios"
  ON historial_precio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar historial de precios"
  ON historial_precio FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver entregas"
  ON entrega FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar entregas"
  ON entrega FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver ubicaciones"
  ON ubicacion_repartidor FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar ubicaciones"
  ON ubicacion_repartidor FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver notificaciones"
  ON notificacion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar notificaciones"
  ON notificacion FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver QR mesas"
  ON qr_mesa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar QR mesas"
  ON qr_mesa FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política pública para productos (clientes sin autenticar pueden ver menú)
CREATE POLICY "Acceso público lectura de productos activos"
  ON producto FOR SELECT
  TO anon
  USING (activo = true);

-- Política pública para QR mesas (clientes escanean sin autenticarse)
CREATE POLICY "Acceso público lectura de QR mesas activas"
  ON qr_mesa FOR SELECT
  TO anon
  USING (activo = true);

-- ============================================================
-- SUPABASE REALTIME: habilitar publicación de cambios
-- ============================================================

-- Habilitar realtime para tablas clave
ALTER PUBLICATION supabase_realtime ADD TABLE pedido;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacion;
ALTER PUBLICATION supabase_realtime ADD TABLE ubicacion_repartidor;
ALTER PUBLICATION supabase_realtime ADD TABLE articulo_inventario;

-- ============================================================
-- TRIGGERS: actualizar timestamp automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producto_actualizado_en
  BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION update_actualizado_en();

CREATE TRIGGER trg_pedido_actualizado_en
  BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION update_actualizado_en();

CREATE TRIGGER trg_articulo_inventario_actualizado_en
  BEFORE UPDATE ON articulo_inventario
  FOR EACH ROW EXECUTE FUNCTION update_actualizado_en();
