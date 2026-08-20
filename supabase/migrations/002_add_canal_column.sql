-- ============================================================
-- MIGRATION 002: Add 'canal' column to pedido table
-- 5 sales channels: MESA_LOCAL, MESA_LLEVAR, MOSTRADOR, DOMICILIO, MESERO
-- ============================================================

-- 1. Add the canal column with a default
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS canal VARCHAR(20) DEFAULT 'MESA_LOCAL';

-- 2. Create index for fast channel-based queries
CREATE INDEX IF NOT EXISTS idx_pedido_canal ON pedido(canal);

-- 3. Backfill existing pedidos based on observaciones prefix and modalidad
-- DOMICILIO: modalidad = 'domicilio'
UPDATE pedido SET canal = 'DOMICILIO' WHERE modalidad = 'domicilio' AND (canal IS NULL OR canal = 'MESA_LOCAL');

-- MESERO: observaciones contains [MESERO]
UPDATE pedido SET canal = 'MESERO' WHERE observaciones LIKE '%[MESERO]%' AND canal = 'MESA_LOCAL';

-- MESA_LLEVAR: has mesa_zona + observaciones contains [PARA_LLEVAR] or modalidad = retiro
UPDATE pedido SET canal = 'MESA_LLEVAR' WHERE (observaciones LIKE '%[PARA_LLEVAR]%' OR modalidad = 'retiro') AND mesa_zona IS NOT NULL AND canal = 'MESA_LOCAL';

-- MOSTRADOR: modalidad retiro or [PARA_LLEVAR] but NO mesa_zona (direct takeout)
UPDATE pedido SET canal = 'MOSTRADOR' WHERE (observaciones LIKE '%[PARA_LLEVAR]%' OR modalidad = 'retiro') AND (mesa_zona IS NULL OR mesa_zona = '') AND canal = 'MESA_LOCAL';

-- QR_REDES → DOMICILIO (these were from social media links for delivery)
UPDATE pedido SET canal = 'DOMICILIO' WHERE observaciones LIKE '%[QR_REDES]%' AND canal = 'MESA_LOCAL';

-- Everything else with mesa_zona and [QR] stays as MESA_LOCAL (already default)

-- 4. Add a CHECK constraint for valid values
ALTER TABLE pedido ADD CONSTRAINT chk_pedido_canal 
  CHECK (canal IN ('MESA_LOCAL', 'MESA_LLEVAR', 'MOSTRADOR', 'DOMICILIO', 'MESERO'));

-- 5. Make the column NOT NULL going forward
ALTER TABLE pedido ALTER COLUMN canal SET NOT NULL;

-- ============================================================
-- INSTRUCTIONS:
-- Run this migration in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================
