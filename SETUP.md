# 🍗 Wings & Burgers — Guía Completa de Setup

## Tabla de Contenidos

1. [Requisitos Previos](#1-requisitos-previos)
2. [Instalación Local (5 minutos)](#2-instalación-local)
3. [Configurar Supabase (Base de Datos)](#3-configurar-supabase)
4. [Crear las Tablas en Supabase](#4-crear-las-tablas-en-supabase)
5. [Configurar Variables de Entorno](#5-configurar-variables-de-entorno)
6. [Levantar el Proyecto en Local](#6-levantar-el-proyecto-en-local)
7. [Probar la App](#7-probar-la-app)
8. [Configurar MercadoPago (Pagos)](#8-configurar-mercadopago)
9. [Configurar WhatsApp (Opcional)](#9-configurar-whatsapp)
10. [Deploy a Vercel (Producción)](#10-deploy-a-vercel)
11. [URLs y Rutas de la App](#11-urls-y-rutas-de-la-app)
12. [Comandos Útiles](#12-comandos-útiles)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Requisitos Previos

Necesitas tener instalado:

| Herramienta | Versión | Descarga |
|-------------|---------|----------|
| **Node.js** | 18+ | https://nodejs.org |
| **npm** | 9+ | (viene con Node.js) |
| **Git** | cualquiera | https://git-scm.com |

Verifica en tu terminal:

```powershell
node --version    # debe ser >= 18
npm --version     # debe ser >= 9
git --version
```

---

## 2. Instalación Local

```powershell
# 1. Abre la carpeta del proyecto (ya la tienes)
cd "C:\Users\sergio.huitron_isol\Documents\Las alitas"

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
Copy-Item .env.local.example .env.local

# 4. Correr los tests para verificar que todo funciona
npm test
```

Si los 513 tests pasan, la base del código está correcta.

---

## 3. Configurar Supabase

Supabase es la base de datos, autenticación, storage y realtime. Plan FREE.

### Paso a paso:

1. Ve a **https://supabase.com** → Crea cuenta (con GitHub es más rápido)
2. Click **"New Project"**
3. Configura:
   - **Name**: `wings-burgers`
   - **Database Password**: genera una segura y guárdala
   - **Region**: `East US (North Virginia)` ← importante para latencia con Vercel
4. Espera ~2 minutos a que se cree
5. Ve a **Settings → API** y copia:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → será tu `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. Crear las Tablas en Supabase

Ve a **SQL Editor** en el dashboard de Supabase y ejecuta este script completo:

```sql
-- ============================================================
-- WINGS & BURGERS - Schema de Base de Datos
-- Ejecutar TODO este script en el SQL Editor de Supabase
-- ============================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: producto
-- ============================================================
CREATE TABLE IF NOT EXISTS producto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('alitas', 'hamburguesas', 'bebidas', 'otros')),
  precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  opciones_personalizacion JSONB DEFAULT '[]'::jsonb,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS cliente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  email TEXT,
  direccion TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES cliente(id),
  estado TEXT NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_preparacion', 'empacado', 'en_camino', 'servido', 'entregado', 'cancelado', 'pagado')),
  modalidad TEXT NOT NULL CHECK (modalidad IN ('local', 'domicilio')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  impuestos NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  mesa_zona TEXT,
  observaciones TEXT,
  metodo_pago TEXT,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'fallido')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: pedido_detalle
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES producto(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  precio_total NUMERIC(10,2) NOT NULL,
  comentario TEXT,
  personalizaciones JSONB DEFAULT '[]'::jsonb
);

-- ============================================================
-- TABLA: articulo_inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS articulo_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL DEFAULT 'piezas',
  nivel_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: producto_inventario (relación N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS producto_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo_inventario(id) ON DELETE CASCADE,
  UNIQUE(producto_id, articulo_id)
);

-- ============================================================
-- TABLA: movimiento_inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  articulo_id UUID NOT NULL REFERENCES articulo_inventario(id),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'venta')),
  cantidad_anterior NUMERIC(10,2) NOT NULL,
  cantidad_nueva NUMERIC(10,2) NOT NULL,
  admin_id TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: gasto
-- ============================================================
CREATE TABLE IF NOT EXISTS gasto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('insumos', 'servicios', 'nomina', 'mantenimiento', 'otros')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  admin_id TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: entrega
-- ============================================================
CREATE TABLE IF NOT EXISTS entrega (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedido(id),
  repartidor_id TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_camino', 'entregado', 'fallido')),
  motivo_no_entrega TEXT,
  aceptada_en TIMESTAMPTZ,
  completada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: ubicacion_repartidor
-- ============================================================
CREATE TABLE IF NOT EXISTS ubicacion_repartidor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repartidor_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: qr_mesa
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,
  mesa_zona TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: push_suscripcion
-- ============================================================
CREATE TABLE IF NOT EXISTS push_suscripcion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- ============================================================
-- TABLA: historial_precio
-- ============================================================
CREATE TABLE IF NOT EXISTS historial_precio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES producto(id),
  precio_anterior NUMERIC(10,2) NOT NULL,
  precio_nuevo NUMERIC(10,2) NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  admin_id TEXT
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pedido_estado ON pedido(estado);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedido_creado_en ON pedido(creado_en);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON pedido_detalle(pedido_id);
CREATE INDEX IF NOT EXISTS idx_cliente_telefono ON cliente(telefono);
CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_gasto_categoria ON gasto(categoria);
CREATE INDEX IF NOT EXISTS idx_entrega_estado ON entrega(estado);
CREATE INDEX IF NOT EXISTS idx_entrega_repartidor ON entrega(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto(categoria);
CREATE INDEX IF NOT EXISTS idx_producto_activo ON producto(activo);
CREATE INDEX IF NOT EXISTS idx_qr_mesa_codigo ON qr_mesa(codigo);

-- ============================================================
-- TRIGGER: actualizar_en automático
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_producto_actualizado
  BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_pedido_actualizado
  BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_inventario_actualizado
  BEFORE UPDATE ON articulo_inventario
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- ============================================================
-- HABILITAR REALTIME en tablas necesarias
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pedido;
ALTER PUBLICATION supabase_realtime ADD TABLE entrega;
ALTER PUBLICATION supabase_realtime ADD TABLE ubicacion_repartidor;

-- ============================================================
-- STORAGE: Crear bucket para imágenes de productos
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DATOS DE PRUEBA (opcional - para testing)
-- ============================================================
INSERT INTO producto (nombre, descripcion, categoria, precio) VALUES
  ('Alitas BBQ', '10 piezas de alitas bañadas en salsa BBQ artesanal', 'alitas', 180.00),
  ('Alitas Buffalo', '10 piezas de alitas en salsa Buffalo picante', 'alitas', 180.00),
  ('Alitas Mango Habanero', '10 piezas con salsa agridulce y picante', 'alitas', 195.00),
  ('Hamburguesa Clásica', 'Carne de res 150g, queso americano, lechuga, tomate', 'hamburguesas', 120.00),
  ('Hamburguesa Doble', 'Doble carne 300g, doble queso, bacon', 'hamburguesas', 175.00),
  ('Hamburguesa BBQ', 'Carne 150g, queso cheddar, aros de cebolla, salsa BBQ', 'hamburguesas', 145.00),
  ('Refresco 600ml', 'Coca-Cola, Sprite o Fanta', 'bebidas', 35.00),
  ('Cerveza Clara', 'Cerveza clara 355ml', 'bebidas', 45.00),
  ('Agua Natural 600ml', 'Agua embotellada', 'bebidas', 20.00),
  ('Papas Francesas', 'Porción de papas fritas crujientes', 'otros', 60.00),
  ('Nachos con Queso', 'Totopos con queso cheddar fundido y jalapeños', 'otros', 80.00)
ON CONFLICT DO NOTHING;

-- QR de prueba para mesas
INSERT INTO qr_mesa (codigo, mesa_zona) VALUES
  ('MESA-01', 'Mesa 1 - Interior'),
  ('MESA-02', 'Mesa 2 - Interior'),
  ('MESA-03', 'Mesa 3 - Interior'),
  ('MESA-04', 'Mesa 4 - Interior'),
  ('MESA-05', 'Mesa 5 - Interior'),
  ('TERRAZA-01', 'Terraza 1'),
  ('TERRAZA-02', 'Terraza 2'),
  ('TERRAZA-03', 'Terraza 3'),
  ('BARRA-01', 'Barra 1'),
  ('BARRA-02', 'Barra 2')
ON CONFLICT DO NOTHING;
```

### Después de ejecutar el SQL:

1. Ve a **Storage** → Verifica que existe el bucket `productos`
2. Ve a **Table Editor** → Verifica que las tablas aparecen con datos de prueba
3. Ve a **Database → Replication** → Verifica que `pedido`, `entrega` y `ubicacion_repartidor` tienen Realtime activo

---

## 5. Configurar Variables de Entorno

Edita el archivo `.env.local` que copiaste antes:

```env
# === SUPABASE (OBLIGATORIO) ===
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# === MERCADOPAGO (para pagos - puede esperar) ===
MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu-token
MERCADOPAGO_PUBLIC_KEY=APP_USR-tu-public-key

# === WHATSAPP (opcional - puede esperar) ===
WHATSAPP_TOKEN=tu-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=tu-phone-id
WHATSAPP_VERIFY_TOKEN=un-token-secreto-que-tu-elijas

# === APP ===
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === PUSH NOTIFICATIONS (generar con el comando de abajo) ===
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu-clave-publica
VAPID_PRIVATE_KEY=tu-clave-privada
```

### Generar claves VAPID:

```powershell
npx web-push generate-vapid-keys
```

Copia las claves generadas a `.env.local`.

> **Nota:** Para pruebas iniciales solo necesitas las variables de Supabase. MercadoPago y WhatsApp son opcionales y la app funciona sin ellos (las funciones de pago y mensajería simplemente no estarán activas).

---

## 6. Levantar el Proyecto en Local

```powershell
# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en: **http://localhost:3000**

> ⚠️ El primer build puede tomar ~30 segundos. Después las actualizaciones son casi instantáneas gracias a Hot Reload.

---

## 7. Probar la App

### URLs principales:

| Módulo | URL | Rol |
|--------|-----|-----|
| **Menú (Cliente)** | http://localhost:3000/menu | Cliente |
| **Menú con QR** | http://localhost:3000/menu?qr=MESA-01 | Cliente en mesa |
| **Panel Vendedor** | http://localhost:3000/pedidos | Vendedor |
| **Panel Admin** | http://localhost:3000/admin/productos | Admin |
| **Repartidor** | http://localhost:3000/entregas | Repartidor |
| **Mapa Repartidor** | http://localhost:3000/mapa | Repartidor |

### Flujo de prueba recomendado:

1. **Abre `/menu`** → Selecciona "Comer en el local" → Verifica que se muestran los productos de prueba
2. **Abre `/menu?qr=MESA-01`** → Debe mostrar "Mesa 1 - Interior" automáticamente
3. **Abre `/menu?qr=INVALIDO`** → Debe mostrar error QR con invitación a pedir asistencia
4. **Abre `/admin/productos`** → Ve la lista de productos, puedes crear/editar
5. **Abre `/admin/gastos`** → Registra un gasto de prueba
6. **Abre `/pedidos`** → Panel del vendedor para ver pedidos entrantes

### Probar la API directamente:

```powershell
# Listar productos
Invoke-RestMethod http://localhost:3000/api/productos

# Validar QR
Invoke-RestMethod http://localhost:3000/api/qr/MESA-01

# Generar QR nuevo
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/qr -Body '{"mesaZona":"Mesa Nueva"}' -ContentType "application/json"
```

---

## 8. Configurar MercadoPago

Para el flujo de pagos:

1. Ve a **https://www.mercadopago.com.mx/developers/panel/app**
2. Crea una aplicación → nombre "Wings & Burgers"
3. En "Credenciales de prueba" (Sandbox):
   - Copia **Access Token** → `MERCADOPAGO_ACCESS_TOKEN`
   - Copia **Public Key** → `MERCADOPAGO_PUBLIC_KEY`
4. Actualiza `.env.local` con estos valores

> Para pruebas usa las credenciales de **sandbox/test**. Solo cambia a producción cuando estés listo para cobrar de verdad.

---

## 9. Configurar WhatsApp (Opcional)

Para envío de cuentas por WhatsApp:

1. Ve a **https://developers.facebook.com**
2. Crea una app → Business type → Add WhatsApp product
3. En WhatsApp → Getting Started:
   - Genera un token temporal (o permanente)
   - Copia el Phone Number ID
4. Actualiza `.env.local`

> WhatsApp es completamente opcional. La app funciona sin él — solo no podrás enviar la cuenta al WhatsApp del cliente.

---

## 10. Deploy a Vercel

### Primer deploy:

1. Sube tu proyecto a GitHub:
```powershell
git init
git add .
git commit -m "Wings & Burgers - sistema completo"
git remote add origin https://github.com/tu-usuario/las-alitas.git
git push -u origin main
```

2. Ve a **https://vercel.com/new**
3. Importa tu repositorio de GitHub
4. En **Environment Variables** agrega TODAS las variables de `.env.local` (con los valores de producción)
5. Click **Deploy**

### Después del deploy:

- Tu app estará en: `https://tu-proyecto.vercel.app`
- Actualiza `NEXT_PUBLIC_APP_URL` en Vercel a esa URL
- Configura los webhooks de MercadoPago y WhatsApp con la URL de Vercel

### Costos:

| Servicio | Costo |
|----------|-------|
| Vercel Hobby | GRATIS |
| Supabase Free | GRATIS |
| MercadoPago | Solo comisión por venta |
| WhatsApp | ~$0.03/mensaje |
| **Total mensual** | **$0-$5 USD** |

---

## 11. URLs y Rutas de la App

### Módulo Cliente
| Ruta | Descripción |
|------|-------------|
| `/menu` | Menú completo con categorías |
| `/menu?qr=CODIGO` | Menú con mesa/zona identificada por QR |
| `/pedido/personalizar` | Personalización del pedido |
| `/pedido/confirmar` | Confirmación antes de pagar |
| `/pago` | Flujo de pago (MercadoPago/comprobante) |
| `/rastreo/[id]` | Rastreo en tiempo real del pedido |

### Módulo Vendedor
| Ruta | Descripción |
|------|-------------|
| `/pedidos` | Panel de pedidos (nuevos, en preparación) |
| `/pedidos/captura` | Captura manual de pedido |

### Módulo Admin
| Ruta | Descripción |
|------|-------------|
| `/admin/productos` | CRUD de productos y precios |
| `/admin/gastos` | Registro y consulta de gastos |
| `/admin/cortes` | Generación de cortes financieros |
| `/admin/inventario` | Control de inventario |
| `/admin/clientes` | Lista de clientes |

### Módulo Repartidor
| Ruta | Descripción |
|------|-------------|
| `/entregas` | Lista de entregas (pendientes/activas) |
| `/mapa` | Mapa con ruta en tiempo real |

### API Routes principales
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/productos` | GET, POST | Listar/crear productos |
| `/api/productos/[id]` | GET, PUT, DELETE | CRUD producto |
| `/api/pedidos` | GET, POST | Listar/crear pedidos |
| `/api/pedidos/[id]` | GET, PUT | Ver/actualizar pedido |
| `/api/inventario` | GET, POST | Listar/registrar artículos |
| `/api/gastos` | GET, POST | Listar/registrar gastos |
| `/api/cortes` | POST | Generar corte financiero |
| `/api/pagos/mercadopago` | POST | Iniciar pago |
| `/api/entregas` | GET | Listar entregas |
| `/api/entregas/[id]/aceptar` | POST | Aceptar entrega |
| `/api/entregas/[id]/completar` | POST | Completar entrega |
| `/api/entregas/ubicacion` | POST | Actualizar GPS |
| `/api/qr` | GET, POST | Generar QR por mesa |
| `/api/qr/[codigo]` | GET | Validar código QR |
| `/api/webhooks/mercadopago` | POST | Webhook de pagos |
| `/api/webhooks/whatsapp` | GET, POST | Webhook de WhatsApp |

---

## 12. Comandos Útiles

```powershell
# Desarrollo
npm run dev            # Servidor local (http://localhost:3000)

# Tests
npm test               # Correr los 513 tests
npm run test:watch     # Tests en modo watch

# Build de producción
npm run build          # Verifica que compila correctamente

# Lint
npm run lint           # Verificar errores de estilo

# VAPID keys
npx web-push generate-vapid-keys   # Generar claves para push notifications
```

---

## 13. Troubleshooting

### "Error: Faltan variables de entorno"
- Verifica que `.env.local` existe y tiene las variables de Supabase
- Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### "Error connecting to Supabase"
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` tiene el formato: `https://xxxxx.supabase.co`
- Verifica que las keys no tienen espacios extra

### "Las tablas no existen"
- Ejecuta el script SQL completo del paso 4 en Supabase → SQL Editor
- Verifica en Table Editor que las tablas aparecen

### "Los productos no se ven en el menú"
- Verifica que hay datos en la tabla `producto`
- Verifica la consola del navegador (F12) por errores de red

### "El build falla"
- Normal si no tienes TODAS las env vars configuradas
- Para desarrollo local solo necesitas las de Supabase
- Ejecuta `npm test` para validar el código

### "PWA no funciona en localhost"
- El Service Worker solo se activa en producción o con HTTPS
- En dev (`npm run dev`) la PWA está deshabilitada por diseño
- Para probar PWA: `npm run build; npm start`

### "El mapa no carga"
- Leaflet necesita conexión a internet (tiles de OpenStreetMap)
- Verifica que no hay bloqueador de contenido

### "Los pagos no funcionan"
- Verifica que `MERCADOPAGO_ACCESS_TOKEN` está configurado
- Para sandbox usa credenciales de TEST
- El webhook necesita URL pública (no localhost)
  - Para testing local usa ngrok: `npx ngrok http 3000`

### "Supabase se pausó"
- El plan Free pausa tras 7 días sin actividad
- Ve a Dashboard → Restore project (gratis)

---

## Resumen Rápido (TL;DR)

```powershell
# 1. Instalar
npm install

# 2. Copiar env
Copy-Item .env.local.example .env.local

# 3. Configurar Supabase (crear proyecto, ejecutar SQL, copiar keys a .env.local)

# 4. Levantar
npm run dev

# 5. Abrir en navegador
# http://localhost:3000/menu
```

¡Listo! 🎉
