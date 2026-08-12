-- TABLA: mesa (para gestión de mesas del restaurante)
CREATE TABLE IF NOT EXISTS mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL DEFAULT 'Interior',
  capacidad INTEGER NOT NULL DEFAULT 4,
  pos_x NUMERIC(5,1) NOT NULL DEFAULT 0,
  pos_y NUMERIC(5,1) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'pendiente_cobro', 'reservada')),
  pedido_activo_id UUID REFERENCES pedido(id),
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mesa_estado ON mesa(estado);
