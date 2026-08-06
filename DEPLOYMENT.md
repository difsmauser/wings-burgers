# Guía de Despliegue - Wings & Burgers

## Requisitos Previos

- Cuenta en [Vercel](https://vercel.com) (plan Hobby gratuito)
- Cuenta en [Supabase](https://supabase.com) (plan Free)
- Cuenta en [MercadoPago Developers](https://www.mercadopago.com.mx/developers)
- Cuenta en [Meta for Developers](https://developers.facebook.com) (WhatsApp Cloud API)
- Repositorio Git (GitHub, GitLab o Bitbucket)

---

## 1. Configuración de Servicios Externos

### 1.1 Supabase (Base de Datos + Auth + Storage + Realtime)

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Seleccionar la región **US East (Virginia)** para menor latencia con Vercel
3. Ejecutar las migraciones SQL desde `src/adapters/driven/persistence/supabase/` en el SQL Editor
4. Configurar Row Level Security (RLS) en las tablas
5. Crear un bucket público `productos` en Storage para imágenes
6. Habilitar Realtime en las tablas: `pedido`, `entrega`, `ubicacion_repartidor`, `notificacion`
7. Anotar:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 MercadoPago

1. Crear una aplicación en [MercadoPago Developers](https://www.mercadopago.com.mx/developers/panel/app)
2. Obtener credenciales de producción:
   - Access Token → `MERCADOPAGO_ACCESS_TOKEN`
   - Public Key → `MERCADOPAGO_PUBLIC_KEY`
3. Configurar webhook URL: `https://tu-dominio.vercel.app/api/webhooks/mercadopago`
4. Suscribirse a notificaciones de tipo `payment`

### 1.3 WhatsApp Cloud API

1. Crear una aplicación en [Meta for Developers](https://developers.facebook.com)
2. Agregar el producto WhatsApp
3. Configurar un número de teléfono de prueba o verificar número de negocio
4. Obtener:
   - Token permanente → `WHATSAPP_TOKEN`
   - Phone Number ID → `WHATSAPP_PHONE_NUMBER_ID`
   - Token de verificación de webhook → `WHATSAPP_VERIFY_TOKEN`
5. Configurar webhook URL: `https://tu-dominio.vercel.app/api/webhooks/whatsapp`

### 1.4 VAPID Keys (Push Notifications)

Generar un par de claves VAPID ejecutando:

```bash
npx web-push generate-vapid-keys
```

Guardar:
- Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private Key → `VAPID_PRIVATE_KEY`

---

## 2. Despliegue en Vercel

### 2.1 Primer Despliegue

1. Conectar el repositorio Git a Vercel:
   - Ir a [vercel.com/new](https://vercel.com/new)
   - Seleccionar el repositorio del proyecto
   - Framework Preset: **Next.js** (se detecta automáticamente)

2. Configurar variables de entorno en Vercel Dashboard → Settings → Environment Variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase | Production |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago | Production |
| `MERCADOPAGO_PUBLIC_KEY` | Public key de MercadoPago | Production, Preview |
| `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API | Production |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID de WhatsApp | Production |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación webhook | Production |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` | Production, Preview |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID | Production, Preview |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID | Production |

3. Hacer clic en **Deploy**

### 2.2 Configuración de Dominio

**Opción A: Dominio gratuito de Vercel (*.vercel.app)**
- Disponible automáticamente al crear el proyecto
- URL: `https://las-alitas.vercel.app` (o el nombre elegido)
- Incluye HTTPS automático

**Opción B: Dominio personalizado (~$1-2 USD/mes)**
1. Registrar dominio en Namecheap, GoDaddy, Cloudflare Registrar, etc.
2. En Vercel Dashboard → Settings → Domains → Add Domain
3. Configurar registros DNS según instrucciones de Vercel:
   - Tipo A: `76.76.21.21`
   - Tipo CNAME: `cname.vercel-dns.com`
4. Vercel provee HTTPS automático vía Let's Encrypt

### 2.3 Despliegues Automáticos

- Cada push a la rama `main` dispara un despliegue de producción
- Cada push a ramas de PR genera un despliegue de preview con URL única
- No se necesita configuración adicional

---

## 3. Configuración del Archivo `vercel.json`

El archivo `vercel.json` incluye:

### Región
- **`iad1`** (Washington D.C., US East): La más cercana a México disponible en el plan Hobby de Vercel, con baja latencia para usuarios en México (~30-50ms)

### Funciones Serverless
- API routes generales: 10s timeout, 256MB RAM
- Webhooks (MercadoPago, WhatsApp): 30s timeout para procesamiento externo
- Pagos: 30s timeout para comunicación con MercadoPago
- Cortes financieros: 15s timeout para cálculos complejos

### Headers de Seguridad
- `X-Frame-Options: DENY` — Previene clickjacking
- `X-Content-Type-Options: nosniff` — Previene MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Control de referrer
- `Permissions-Policy` — Solo geolocalización habilitada (para repartidores)

### Cache y PWA
- Service Worker (`/sw.js`): Sin caché para actualizaciones inmediatas
- Workbox: Cache inmutable (1 año)
- Manifest: Cache 24h
- Iconos: Cache inmutable (1 año)
- API routes: Sin caché (datos siempre frescos)

---

## 4. Estimación de Costos Mensuales

| Servicio | Plan | Costo | Límites Relevantes |
|----------|------|-------|-------------------|
| **Vercel** | Hobby (Free) | $0 | 100GB bandwidth, 100h serverless, dominios *.vercel.app |
| **Supabase** | Free | $0 | 500MB DB, 1GB storage, 50K MAU, 2M realtime messages |
| **WhatsApp Cloud API** | Pay-per-use | ~$0-3 | ~$0.03 por mensaje template entregado |
| **MercadoPago** | Pay-per-use | $0 | Sin costo fijo, solo comisión por transacción |
| **Dominio** (opcional) | Anual | ~$1-2 | Depende del registrador |
| | | | |
| **TOTAL ESTIMADO** | | **$0 - $5 USD** | Dentro del presupuesto de $10 USD |

### Notas sobre Límites del Plan Free

**Vercel Hobby:**
- 100 GB de bandwidth mensual (más que suficiente para un negocio local)
- Funciones serverless: timeout máximo de 60s (configuramos 10-30s)
- Máximo 12 deployments por día (push a main)
- 1 dominio personalizado incluido
- No soporta equipos (solo 1 usuario)

**Supabase Free:**
- 500 MB de base de datos (estimado: <50MB para un negocio local)
- 1 GB de almacenamiento (suficiente para ~200 imágenes de productos)
- 50,000 usuarios activos mensuales
- 2 millones de mensajes realtime/mes
- 500 MB de transferencia de archivos/mes
- Pausa automática tras 7 días de inactividad (reactivar es gratis)

### Cuándo Escalar

Si el negocio crece significativamente:
- **Vercel Pro** ($20/mes): Teams, más bandwidth, analytics
- **Supabase Pro** ($25/mes): Sin pausas, más storage, soporte
- **Estimado de escalamiento**: $45/mes para ~1000 pedidos diarios

---

## 5. Variables de Entorno por Entorno

### Producción
Todas las variables listadas en la sección 2.1 con valores reales.

### Preview (Pull Requests)
- Variables `NEXT_PUBLIC_*` con valores de desarrollo/testing
- Servicios externos pueden apuntar a sandboxes de prueba

### Desarrollo Local
Copiar `.env.local.example` a `.env.local` y completar con valores de desarrollo:

```bash
cp .env.local.example .env.local
```

---

## 6. Verificación Post-Despliegue

Después del primer despliegue, verificar:

1. **Acceso general**: Abrir la URL y verificar que carga el menú
2. **PWA**: Instalar la app desde el navegador (botón "Agregar a pantalla de inicio")
3. **API Health**: Acceder a `/api/productos` y verificar respuesta JSON
4. **Webhooks**: Verificar que MercadoPago y WhatsApp pueden alcanzar los endpoints
5. **Realtime**: Crear un pedido y verificar que las notificaciones llegan al vendedor
6. **Geolocalización**: Probar el módulo repartidor y verificar que GPS funciona
7. **Imágenes**: Subir una imagen de producto y verificar que se muestra correctamente
8. **HTTPS**: Verificar que el certificado SSL está activo

---

## 7. Troubleshooting

### Build falla en Vercel
- Verificar que todas las variables de entorno estén configuradas
- Revisar logs en Vercel Dashboard → Deployments → [deployment] → Build Logs
- Verificar que `next.config.js` no tenga errores de sintaxis

### Service Worker no se actualiza
- El header `Cache-Control: no-cache` en `/sw.js` fuerza la verificación
- Los usuarios pueden necesitar cerrar todas las pestañas y reabrir

### Webhooks no funcionan
- Verificar que la URL del webhook incluye `https://`
- Verificar que `WHATSAPP_VERIFY_TOKEN` coincide con el configurado en Meta
- Revisar Function Logs en Vercel para errores

### Supabase se pausó
- Los proyectos del plan Free se pausan tras 7 días sin actividad
- Ir a Dashboard de Supabase → Restore project
- Considerar un cron job o uptime monitor para evitar pausas

### Latencia alta
- Verificar que la región de Vercel (`iad1`) coincide con la región de Supabase
- Las imágenes se cachean vía CDN de Vercel automáticamente
- Verificar que el service worker está activo para caché local
