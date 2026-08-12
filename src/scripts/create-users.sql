-- ============================================================
-- TABLA: usuario (para roles del sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'vendedor', 'repartidor', 'cliente')),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Los usuarios de auth se crean via la API de Supabase Auth.
-- Después de crearlos, sus IDs se insertan aquí con su rol asignado.
