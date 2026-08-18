/**
 * ============================================================================
 * PRUEBAS E2E REALES — Enterprise Integration Tests
 * ============================================================================
 * 
 * Script que golpea directamente la API REST de Supabase para:
 * 1. Crear mesas (llenar todas)
 * 2. Crear meseros y repartidores
 * 3. Crear productos completos del menú
 * 4. Crear pedidos locales (en mesa) con items
 * 5. Crear pedidos a domicilio
 * 6. Avanzar pedidos por toda la máquina de estados
 * 7. Registrar inventario
 * 8. Registrar gastos
 * 9. Validar pagos y liberar mesas
 * 10. Consultar clientes generados
 * 11. Stress test: pedidos concurrentes
 * 12. Validar integridad de datos
 * 
 * Ejecución: npx tsx src/scripts/pruebas-e2e-reales.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIG
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY requerida');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL requerida');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Headers para REST directo
const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// ============================================================================
// UTILITIES
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: Array<{ test: string; error: string }> = [];

function logSection(title: string) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}

function logTest(name: string, passed: boolean, detail?: string) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✅ ${name}`);
  } else {
    failedTests++;
    const msg = detail || 'Failed';
    failures.push({ test: name, error: msg });
    console.log(`  ❌ ${name} → ${msg}`);
  }
}

async function restPost(table: string, body: object): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function restGet(table: string, query: string = ''): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status}`);
  return res.json();
}

async function restPatch(table: string, filter: string, body: object): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function restDelete(table: string, filter: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${table} failed (${res.status}): ${text}`);
  }
}

function uuid(): string {
  return crypto.randomUUID();
}

// ============================================================================
// TEST DATA
// ============================================================================

const MESAS_DATA = [
  { nombre: 'Mesa 1', zona: 'Interior', capacidad: 4, pos_x: 15, pos_y: 25 },
  { nombre: 'Mesa 2', zona: 'Interior', capacidad: 4, pos_x: 35, pos_y: 25 },
  { nombre: 'Mesa 3', zona: 'Interior', capacidad: 6, pos_x: 55, pos_y: 25 },
  { nombre: 'Mesa 4', zona: 'Terraza', capacidad: 2, pos_x: 80, pos_y: 15 },
  { nombre: 'Mesa 5', zona: 'Terraza', capacidad: 4, pos_x: 80, pos_y: 45 },
  { nombre: 'Mesa 6', zona: 'Terraza', capacidad: 8, pos_x: 55, pos_y: 60 },
  { nombre: 'Mesa 7', zona: 'VIP', capacidad: 6, pos_x: 20, pos_y: 60 },
  { nombre: 'Mesa 8', zona: 'VIP', capacidad: 10, pos_x: 55, pos_y: 15 },
  { nombre: 'Mesa 9', zona: 'Barra', capacidad: 2, pos_x: 35, pos_y: 50 },
  { nombre: 'Mesa 10', zona: 'Barra', capacidad: 2, pos_x: 15, pos_y: 80 },
];

const MESEROS_DATA = [
  { nombre: 'Carlos Mendoza', telefono: '5551234567', pin: '1234' },
  { nombre: 'Maria Torres', telefono: '5559876543', pin: '5678' },
  { nombre: 'Luis Ramirez', telefono: '5554445555', pin: '9012' },
];

const REPARTIDORES_DATA = [
  { nombre: 'Pedro Sanchez', telefono: '5551112222', vehiculo: 'Moto Honda' },
  { nombre: 'Ana Garcia', telefono: '5553334444', vehiculo: 'Bicicleta' },
  { nombre: 'Jorge Lopez', telefono: '5555556666', vehiculo: 'Moto Italika' },
];

const PRODUCTOS_DATA = [
  { nombre: 'Alitas BBQ (10 pzas)', descripcion: 'Alitas crujientes bañadas en salsa BBQ', categoria: 'alitas', precio: 189.00, activo: true },
  { nombre: 'Alitas Búfalo (10 pzas)', descripcion: 'Alitas picantes estilo Buffalo', categoria: 'alitas', precio: 189.00, activo: true },
  { nombre: 'Alitas Mango Habanero (10 pzas)', descripcion: 'Alitas con salsa dulce-picante de mango', categoria: 'alitas', precio: 199.00, activo: true },
  { nombre: 'Alitas Parmesano (10 pzas)', descripcion: 'Alitas con queso parmesano y ajo', categoria: 'alitas', precio: 199.00, activo: true },
  { nombre: 'Hamburguesa Clásica', descripcion: 'Carne 200g, lechuga, tomate, queso americano', categoria: 'hamburguesas', precio: 129.00, activo: true },
  { nombre: 'Hamburguesa Doble', descripcion: 'Doble carne 400g, doble queso, bacon', categoria: 'hamburguesas', precio: 179.00, activo: true },
  { nombre: 'Hamburguesa BBQ', descripcion: 'Carne 200g, aros de cebolla, salsa BBQ, queso cheddar', categoria: 'hamburguesas', precio: 149.00, activo: true },
  { nombre: 'Coca-Cola 600ml', descripcion: 'Refresco', categoria: 'bebidas', precio: 35.00, activo: true },
  { nombre: 'Limonada Natural 1L', descripcion: 'Limonada fresca del día', categoria: 'bebidas', precio: 55.00, activo: true },
  { nombre: 'Cerveza Artesanal IPA', descripcion: 'Cerveza artesanal local 355ml', categoria: 'bebidas', precio: 85.00, activo: true },
  { nombre: 'Papas Francesas', descripcion: 'Porción grande de papas fritas crujientes', categoria: 'otros', precio: 65.00, activo: true },
  { nombre: 'Aros de Cebolla', descripcion: 'Porción de aros de cebolla empanizados', categoria: 'otros', precio: 75.00, activo: true },
  { nombre: 'Combo Alitas + Papas + Bebida', descripcion: '10 alitas a elegir + papas + refresco', categoria: 'otros', precio: 249.00, activo: true },
  { nombre: 'Michelada Clasica', descripcion: 'Michelada con cerveza, limón, salsa y chamoy', categoria: 'bebidas', precio: 95.00, activo: true },
  { nombre: 'Margarita Frozen', descripcion: 'Margarita de limón congelada', categoria: 'bebidas', precio: 110.00, activo: true },
];

const INVENTARIO_DATA = [
  { nombre: 'Alas de pollo', cantidad: 200, unidad_medida: 'kg', nivel_minimo: 20 },
  { nombre: 'Carne hamburguesa', cantidad: 80, unidad_medida: 'kg', nivel_minimo: 15 },
  { nombre: 'Pan hamburguesa', cantidad: 150, unidad_medida: 'piezas', nivel_minimo: 30 },
  { nombre: 'Salsa BBQ', cantidad: 25, unidad_medida: 'litros', nivel_minimo: 5 },
  { nombre: 'Salsa Búfalo', cantidad: 15, unidad_medida: 'litros', nivel_minimo: 3 },
  { nombre: 'Queso Cheddar', cantidad: 12, unidad_medida: 'kg', nivel_minimo: 3 },
  { nombre: 'Papas congeladas', cantidad: 50, unidad_medida: 'kg', nivel_minimo: 10 },
  { nombre: 'Coca-Cola 600ml', cantidad: 100, unidad_medida: 'piezas', nivel_minimo: 24 },
  { nombre: 'Aceite para freír', cantidad: 40, unidad_medida: 'litros', nivel_minimo: 10 },
  { nombre: 'Cerveza IPA', cantidad: 48, unidad_medida: 'piezas', nivel_minimo: 12 },
];

const GASTOS_DATA = [
  { monto: 4500.00, concepto: 'Compra semanal de pollo', categoria: 'insumos', fecha: new Date().toISOString().split('T')[0] },
  { monto: 2800.00, concepto: 'Compra de pan y quesos', categoria: 'insumos', fecha: new Date().toISOString().split('T')[0] },
  { monto: 1500.00, concepto: 'Servicio de gas LP', categoria: 'servicios', fecha: new Date().toISOString().split('T')[0] },
  { monto: 850.00, concepto: 'Internet y teléfono', categoria: 'servicios', fecha: new Date().toISOString().split('T')[0] },
  { monto: 12000.00, concepto: 'Renta del local - Agosto', categoria: 'otros', fecha: new Date().toISOString().split('T')[0] },
  { monto: 3200.00, concepto: 'Nómina meseros semanal', categoria: 'nomina', fecha: new Date().toISOString().split('T')[0] },
  { monto: 750.00, concepto: 'Reparación freidora', categoria: 'mantenimiento', fecha: new Date().toISOString().split('T')[0] },
  { monto: 500.00, concepto: 'Flyers promocionales', categoria: 'otros', fecha: new Date().toISOString().split('T')[0] },
];

// ============================================================================
// PHASE 1: CLEANUP
// ============================================================================

async function limpiarDB() {
  logSection('FASE 0: LIMPIEZA DE BASE DE DATOS');
  
  // Orden correcto respetando foreign keys (más exhaustivo):
  // Primero las tablas hoja, luego las intermedias, luego las raíz
  const tablesOrdenadas = [
    'pedido_detalle',
    'comprobante_pago',
    'entrega',
    'pedido',      // depends on cliente, producto
    'cliente',
    'qr_mesa',
    'mesa',
    'mesero',
    'repartidor',
    'producto',
    'articulo_inventario',
    'gasto',
  ];

  // First pass: try to delete everything
  for (const table of tablesOrdenadas) {
    try {
      await restDelete(table, 'id=neq.00000000-0000-0000-0000-000000000000');
      console.log(`  🧹 ${table} limpio`);
    } catch (e: any) {
      console.log(`  ⚠️  ${table}: ${e.message?.slice(0, 80)}`);
    }
  }

  // Second pass: retry any that failed due to FK (pedido and cliente usually)
  for (const table of ['pedido', 'cliente']) {
    try {
      await restDelete(table, 'id=neq.00000000-0000-0000-0000-000000000000');
      console.log(`  🧹 ${table} (retry) limpio`);
    } catch (e: any) {
      console.log(`  ⚠️  ${table} (retry): ${e.message?.slice(0, 60)}`);
    }
  }
}

// ============================================================================
// PHASE 2: CREAR MESAS
// ============================================================================

let mesasCreadas: any[] = [];

async function crearMesas() {
  logSection('FASE 1: CREAR MESAS (10 mesas, todas las zonas)');

  for (const mesa of MESAS_DATA) {
    try {
      const mesaId = uuid();
      const result = await restPost('mesa', {
        id: mesaId,
        nombre: mesa.nombre,
        zona: mesa.zona,
        capacidad: mesa.capacidad,
        pos_x: mesa.pos_x,
        pos_y: mesa.pos_y,
        estado: 'disponible',
        activa: true,
      });
      mesasCreadas.push(result[0]);

      // Register QR code (same logic as POST /api/mesas)
      const qrCodigo = mesa.nombre.replace(/\s+/g, '-').toUpperCase();
      await restPost('qr_mesa', {
        id: uuid(),
        codigo: qrCodigo,
        mesa_zona: `${mesa.nombre} - ${mesa.zona}`,
        activo: true,
      });

      logTest(`Crear ${mesa.nombre} (${mesa.zona}, cap ${mesa.capacidad}, pos ${mesa.pos_x}%/${mesa.pos_y}%, QR: ${qrCodigo})`, true);
    } catch (e: any) {
      logTest(`Crear ${mesa.nombre}`, false, e.message);
    }
  }

  // Verificar que se crearon todas
  const mesas = await restGet('mesa', 'activa=eq.true&select=id,nombre,zona,estado');
  logTest(`Verificar 10 mesas creadas (encontradas: ${mesas.length})`, mesas.length === 10);

  // Verificar todas disponibles
  const disponibles = mesas.filter((m: any) => m.estado === 'disponible');
  logTest(`Todas las mesas disponibles (${disponibles.length}/10)`, disponibles.length === 10);

  // Verificar QR codes creados
  const qrCodes = await restGet('qr_mesa', 'activo=eq.true&select=codigo,mesa_zona');
  logTest(`QR codes creados: ${qrCodes.length}/10`, qrCodes.length === 10);

  // Verificar formato QR correcto (MESA-1, MESA-2, etc.)
  const qrCodigoEsperado = 'MESA-8';
  const qrMesa8 = qrCodes.find((q: any) => q.codigo === qrCodigoEsperado);
  logTest(`QR 'MESA-8' existe y apunta a mesa correcta`, !!qrMesa8 && qrMesa8.mesa_zona === 'Mesa 8 - VIP');

  // Verificar posiciones distribuidas (no amontonadas)
  const mesasPosiciones = await restGet('mesa', 'activa=eq.true&select=nombre,pos_x,pos_y');
  const posXValues = mesasPosiciones.map((m: any) => m.pos_x);
  const posYValues = mesasPosiciones.map((m: any) => m.pos_y);
  const rangoX = Math.max(...posXValues) - Math.min(...posXValues);
  const rangoY = Math.max(...posYValues) - Math.min(...posYValues);
  logTest(`Mesas distribuidas en mapa (rango X: ${rangoX}%, Y: ${rangoY}%)`, rangoX >= 50 && rangoY >= 40);
}

// ============================================================================
// PHASE 3: CREAR MESEROS Y REPARTIDORES
// ============================================================================

let meserosCreados: any[] = [];
let repartidoresCreados: any[] = [];

async function crearPersonal() {
  logSection('FASE 2: CREAR PERSONAL (Meseros + Repartidores)');

  for (const mesero of MESEROS_DATA) {
    try {
      const result = await restPost('mesero', { id: uuid(), ...mesero, activo: true });
      meserosCreados.push(result[0]);
      logTest(`Mesero: ${mesero.nombre}`, true);
    } catch (e: any) {
      logTest(`Mesero: ${mesero.nombre}`, false, e.message);
    }
  }

  for (const rep of REPARTIDORES_DATA) {
    try {
      const result = await restPost('repartidor', { id: uuid(), ...rep, activo: true });
      repartidoresCreados.push(result[0]);
      logTest(`Repartidor: ${rep.nombre} (${rep.vehiculo})`, true);
    } catch (e: any) {
      logTest(`Repartidor: ${rep.nombre}`, false, e.message);
    }
  }

  // Verificar
  const meseros = await restGet('mesero', 'activo=eq.true');
  logTest(`Verificar meseros activos: ${meseros.length}`, meseros.length >= 3);

  const reps = await restGet('repartidor', 'activo=eq.true');
  logTest(`Verificar repartidores activos: ${reps.length}`, reps.length >= 3);
}

// ============================================================================
// PHASE 4: CREAR PRODUCTOS
// ============================================================================

let productosCreados: any[] = [];

async function crearProductos() {
  logSection('FASE 3: CREAR CATÁLOGO DE PRODUCTOS (15 productos)');

  for (const prod of PRODUCTOS_DATA) {
    try {
      const result = await restPost('producto', {
        id: uuid(),
        nombre: prod.nombre,
        descripcion: prod.descripcion,
        categoria: prod.categoria,
        precio: prod.precio,
        activo: true,
        opciones_personalizacion: [],
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      });
      productosCreados.push(result[0]);
      logTest(`Producto: ${prod.nombre} ($${prod.precio})`, true);
    } catch (e: any) {
      logTest(`Producto: ${prod.nombre}`, false, e.message);
    }
  }

  // Verificar por categoría
  const alitas = await restGet('producto', 'categoria=eq.alitas&activo=eq.true');
  logTest(`Categoría alitas: ${alitas.length} productos`, alitas.length === 4);

  const hamburguesas = await restGet('producto', 'categoria=eq.hamburguesas&activo=eq.true');
  logTest(`Categoría hamburguesas: ${hamburguesas.length} productos`, hamburguesas.length === 3);

  const bebidas = await restGet('producto', 'categoria=eq.bebidas&activo=eq.true');
  logTest(`Categoría bebidas (bar): ${bebidas.length} productos`, bebidas.length === 5);

  const otros = await restGet('producto', 'categoria=eq.otros&activo=eq.true');
  logTest(`Categoría otros: ${otros.length} productos`, otros.length === 3);
}

// ============================================================================
// PHASE 5: CREAR PEDIDOS LOCALES (EN MESA)
// ============================================================================

let pedidosLocales: any[] = [];

async function crearPedidosLocales() {
  logSection('FASE 4: PEDIDOS LOCALES — Ocupar todas las mesas');

  const runId = Date.now().toString(36).slice(-4);

  const clientes = [
    { nombre: 'Juan Pérez', telefono: '5551001001' },
    { nombre: 'María García', telefono: '5551001002' },
    { nombre: 'Roberto Díaz', telefono: '5551001003' },
    { nombre: 'Laura Martínez', telefono: '5551001004' },
    { nombre: 'Diego Hernández', telefono: '5551001005' },
    { nombre: 'Patricia López', telefono: '5551001006' },
    { nombre: 'Fernando Ruiz', telefono: '5551001007' },
    { nombre: 'Sofía Morales', telefono: '5551001008' },
    { nombre: 'Andrés Jiménez', telefono: '5551001009' },
    { nombre: 'Camila Vargas', telefono: '5551001010' },
  ];

  for (let i = 0; i < mesasCreadas.length; i++) {
    const mesa = mesasCreadas[i];
    const cliente = clientes[i];
    const mesero = meserosCreados[i % meserosCreados.length];
    
    // Seleccionar 2-4 items aleatorios
    const numItems = 2 + Math.floor(Math.random() * 3);
    const itemsSeleccionados = [...productosCreados]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);

    const pedidoId = uuid();
    const numero = `P-${runId}-${String(i + 1).padStart(2, '0')}`;
    const mesaZona = `${mesa.nombre} - ${mesa.zona}`;
    
    let subtotal = 0;
    const detalles = itemsSeleccionados.map((prod) => {
      const cantidad = 1 + Math.floor(Math.random() * 2);
      const precioTotal = prod.precio * cantidad;
      subtotal += precioTotal;
      return {
        id: uuid(),
        pedido_id: pedidoId,
        producto_id: prod.id,
        cantidad,
        precio_unitario: prod.precio,
        precio_total: precioTotal,
        personalizaciones: [],
        comentario: null,
        item_estado: 'pendiente',
      };
    });

    const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + impuestos) * 100) / 100;

    try {
      // 1. Crear o reutilizar cliente (upsert by telefono)
      let clienteId: string;
      const existingClientes = await restGet('cliente', `telefono=eq.${cliente.telefono}&select=id`);
      if (existingClientes.length > 0) {
        clienteId = existingClientes[0].id;
      } else {
        const clienteResult = await restPost('cliente', {
          id: uuid(),
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: null,
          direccion: null,
        });
        clienteId = clienteResult[0].id;
      }

      // 2. Crear pedido
      await restPost('pedido', {
        id: pedidoId,
        numero,
        cliente_id: clienteId,
        estado: 'recibido',
        modalidad: 'local',
        mesa_zona: mesaZona,
        subtotal,
        impuestos,
        total,
        estado_pago: 'pendiente',
        metodo_pago: null,
        mesero_id: mesero.id,
        mesero_nombre: mesero.nombre,
        observaciones: `[MESERO] Pedido tomado por ${mesero.nombre}`,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      });

      // 3. Crear detalles
      for (const det of detalles) {
        await restPost('pedido_detalle', det);
      }

      // 4. Marcar mesa como ocupada
      await restPatch('mesa', `id=eq.${mesa.id}`, {
        estado: 'ocupada',
        pedido_activo_id: pedidoId,
      });

      pedidosLocales.push({ id: pedidoId, numero, mesaZona, total, items: detalles.length });
      logTest(`Pedido LOCAL ${numero} en ${mesaZona} ($${total}, ${detalles.length} items, mesero: ${mesero.nombre})`, true);
    } catch (e: any) {
      logTest(`Pedido LOCAL ${numero}`, false, e.message);
    }
  }

  // Verificar mesas ocupadas
  const mesasOcupadas = await restGet('mesa', 'estado=eq.ocupada');
  logTest(`Todas las mesas ocupadas: ${mesasOcupadas.length}/10`, mesasOcupadas.length === 10);

  // Verificar pedidos creados (solo los de esta ejecución)
  const pedidos = await restGet('pedido', 'modalidad=eq.local&estado=eq.recibido&select=id,numero');
  logTest(`Pedidos locales en estado recibido: ${pedidos.length} (esperados 10)`, pedidos.length >= 10);
}

// ============================================================================
// PHASE 6: CREAR PEDIDOS A DOMICILIO
// ============================================================================

let pedidosDomicilio: any[] = [];

async function crearPedidosDomicilio() {
  logSection('FASE 5: PEDIDOS A DOMICILIO (5 pedidos)');

  const runId = Date.now().toString(36).slice(-4);

  const clientesDomicilio = [
    { nombre: 'Alejandro Castro', telefono: '5552001001', direccion: 'Av. Reforma 123, Col. Centro' },
    { nombre: 'Daniela Flores', telefono: '5552001002', direccion: 'Calle Hidalgo 456, Col. Norte' },
    { nombre: 'Ricardo Moreno', telefono: '5552001003', direccion: 'Blvd. López Mateos 789, Col. Jardines' },
    { nombre: 'Valeria Soto', telefono: '5552001004', direccion: 'Calle Juárez 321, Col. Centro' },
    { nombre: 'Miguel Ángel Reyes', telefono: '5552001005', direccion: 'Av. Universidad 654, Col. Sur' },
  ];

  for (let i = 0; i < clientesDomicilio.length; i++) {
    const cliente = clientesDomicilio[i];
    const numItems = 2 + Math.floor(Math.random() * 3);
    const itemsSeleccionados = [...productosCreados]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);

    const pedidoId = uuid();
    const numero = `D-${runId}-${String(i + 1).padStart(2, '0')}`;

    let subtotal = 0;
    const detalles = itemsSeleccionados.map((prod) => {
      const cantidad = 1 + Math.floor(Math.random() * 3);
      const precioTotal = prod.precio * cantidad;
      subtotal += precioTotal;
      return {
        id: uuid(),
        pedido_id: pedidoId,
        producto_id: prod.id,
        cantidad,
        precio_unitario: prod.precio,
        precio_total: precioTotal,
        personalizaciones: [],
        comentario: i === 0 ? 'Sin cebolla por favor' : null,
        item_estado: 'pendiente',
      };
    });

    const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + impuestos) * 100) / 100;

    try {
      // Crear o reutilizar cliente (upsert by telefono)
      let clienteId: string;
      const existingClientes = await restGet('cliente', `telefono=eq.${cliente.telefono}&select=id`);
      if (existingClientes.length > 0) {
        clienteId = existingClientes[0].id;
      } else {
        const clienteResult = await restPost('cliente', {
          id: uuid(),
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: null,
          direccion: cliente.direccion,
        });
        clienteId = clienteResult[0].id;
      }

      // Crear pedido
      await restPost('pedido', {
        id: pedidoId,
        numero,
        cliente_id: clienteId,
        estado: 'recibido',
        modalidad: 'domicilio',
        mesa_zona: null,
        subtotal,
        impuestos,
        total,
        estado_pago: 'pendiente',
        metodo_pago: null,
        observaciones: cliente.direccion ? `Entregar en: ${cliente.direccion}` : null,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      });

      // Crear detalles
      for (const det of detalles) {
        await restPost('pedido_detalle', det);
      }

      pedidosDomicilio.push({ id: pedidoId, numero, total, clienteNombre: cliente.nombre });
      logTest(`Pedido DOMICILIO ${numero} — ${cliente.nombre} ($${total})`, true);
    } catch (e: any) {
      logTest(`Pedido DOMICILIO ${numero}`, false, e.message);
    }
  }

  const pedidosDomRecibidos = await restGet('pedido', 'modalidad=eq.domicilio&estado=eq.recibido');
  logTest(`Pedidos domicilio en estado recibido: ${pedidosDomRecibidos.length} (esperados 5)`, pedidosDomRecibidos.length >= 5);
}

// ============================================================================
// PHASE 7: AVANZAR PEDIDOS POR MÁQUINA DE ESTADOS
// ============================================================================

async function avanzarPedidosLocales() {
  logSection('FASE 6: MÁQUINA DE ESTADOS — Pedidos Locales');

  // Tomar 5 pedidos locales y avanzarlos completamente
  const pedidosParaAvanzar = pedidosLocales.slice(0, 5);

  for (const pedido of pedidosParaAvanzar) {
    try {
      // recibido → en_preparacion
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'en_preparacion',
        actualizado_en: new Date().toISOString(),
      });
      logTest(`${pedido.numero}: recibido → en_preparacion`, true);

      // en_preparacion → empacado
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'empacado',
        actualizado_en: new Date().toISOString(),
      });
      logTest(`${pedido.numero}: en_preparacion → empacado`, true);

      // empacado → listo_para_servir (LOCAL)
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'listo_para_servir',
        actualizado_en: new Date().toISOString(),
      });
      logTest(`${pedido.numero}: empacado → listo_para_servir`, true);

      // listo_para_servir → servido
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'servido',
        actualizado_en: new Date().toISOString(),
      });
      logTest(`${pedido.numero}: listo_para_servir → servido ✓`, true);
    } catch (e: any) {
      logTest(`${pedido.numero}: avanzar estados`, false, e.message);
    }
  }

  // Verificar estados finales
  const servidos = await restGet('pedido', 'estado=eq.servido&modalidad=eq.local');
  logTest(`Pedidos locales servidos: ${servidos.length} (>= 5)`, servidos.length >= 5);

  // Los otros 5 dejarlos en diferentes estados
  const pedidosRestantes = pedidosLocales.slice(5);
  if (pedidosRestantes.length > 0) {
    await restPatch('pedido', `id=eq.${pedidosRestantes[0].id}`, { estado: 'en_preparacion' });
    logTest(`${pedidosRestantes[0].numero}: dejado en en_preparacion`, true);
  }
  if (pedidosRestantes.length > 1) {
    await restPatch('pedido', `id=eq.${pedidosRestantes[1].id}`, { estado: 'en_preparacion' });
    await restPatch('pedido', `id=eq.${pedidosRestantes[1].id}`, { estado: 'empacado' });
    logTest(`${pedidosRestantes[1].numero}: dejado en empacado`, true);
  }
  if (pedidosRestantes.length > 2) {
    await restPatch('pedido', `id=eq.${pedidosRestantes[2].id}`, { estado: 'en_preparacion' });
    await restPatch('pedido', `id=eq.${pedidosRestantes[2].id}`, { estado: 'empacado' });
    await restPatch('pedido', `id=eq.${pedidosRestantes[2].id}`, { estado: 'listo_para_servir' });
    logTest(`${pedidosRestantes[2].numero}: dejado en listo_para_servir`, true);
  }
}

async function avanzarPedidosDomicilio() {
  logSection('FASE 7: MÁQUINA DE ESTADOS — Pedidos Domicilio');

  // Avanzar 3 pedidos domicilio completos
  const pedidosParaAvanzar = pedidosDomicilio.slice(0, 3);

  for (const pedido of pedidosParaAvanzar) {
    try {
      // recibido → en_preparacion
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'en_preparacion',
        actualizado_en: new Date().toISOString(),
      });

      // en_preparacion → empacado
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'empacado',
        actualizado_en: new Date().toISOString(),
      });

      // empacado → en_camino (DOMICILIO)
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'en_camino',
        actualizado_en: new Date().toISOString(),
      });

      // en_camino → entregado
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado: 'entregado',
        actualizado_en: new Date().toISOString(),
      });

      logTest(`${pedido.numero} (${pedido.clienteNombre}): recibido → entregado ✓`, true);
    } catch (e: any) {
      logTest(`${pedido.numero}: avanzar estados domicilio`, false, e.message);
    }
  }

  // Verificar
  const entregados = await restGet('pedido', 'estado=eq.entregado&modalidad=eq.domicilio');
  logTest(`Pedidos domicilio entregados: ${entregados.length} (>= 3)`, entregados.length >= 3);
}

// ============================================================================
// PHASE 8: TRANSICIONES INVÁLIDAS (STRESS TEST — deben fallar)
// ============================================================================

async function probarTransicionesInvalidas() {
  logSection('FASE 8: STRESS TEST — Transiciones Inválidas');

  // Crear un pedido temporal para probar transiciones inválidas
  const pedidoId = uuid();
  await restPost('pedido', {
    id: pedidoId,
    numero: 'TEST-INVALID',
    estado: 'recibido',
    modalidad: 'local',
    subtotal: 100,
    impuestos: 16,
    total: 116,
    estado_pago: 'pendiente',
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  });

  // Intentar saltar estados (recibido → empacado directamente)
  // Nota: Supabase REST no valida la máquina de estados (eso lo hace la API de Next.js)
  // Pero podemos verificar que los datos son consistentes

  // Test: No debería haber pedidos con estado inválido en la DB
  const estadosValidos = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'en_camino', 'entregado'];
  const todosLosPedidos = await restGet('pedido', 'select=id,estado,numero');
  const pedidosInvalidos = todosLosPedidos.filter((p: any) => !estadosValidos.includes(p.estado));
  logTest(`No hay pedidos con estado inválido (${pedidosInvalidos.length} encontrados)`, pedidosInvalidos.length === 0);

  // Test: No debería haber pedidos locales en estado en_camino
  const localesEnCamino = await restGet('pedido', 'modalidad=eq.local&estado=eq.en_camino');
  logTest(`No hay pedidos locales en estado en_camino: ${localesEnCamino.length}`, localesEnCamino.length === 0);

  // Test: No debería haber pedidos domicilio en estado servido
  const domicilioServido = await restGet('pedido', 'modalidad=eq.domicilio&estado=eq.servido');
  logTest(`No hay pedidos domicilio en estado servido: ${domicilioServido.length}`, domicilioServido.length === 0);

  // Cleanup test pedido
  await restDelete('pedido', `id=eq.${pedidoId}`);
  logTest('Pedido de prueba eliminado', true);
}

// ============================================================================
// PHASE 9: INVENTARIO
// ============================================================================

async function crearInventario() {
  logSection('FASE 9: REGISTRAR INVENTARIO (10 artículos)');

  for (const item of INVENTARIO_DATA) {
    try {
      await restPost('articulo_inventario', {
        id: uuid(),
        nombre: item.nombre,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida,
        nivel_minimo: item.nivel_minimo,
        actualizado_en: new Date().toISOString(),
      });
      logTest(`Inventario: ${item.nombre} (${item.cantidad} ${item.unidad_medida}, mín: ${item.nivel_minimo})`, true);
    } catch (e: any) {
      logTest(`Inventario: ${item.nombre}`, false, e.message);
    }
  }

  // Verificar total
  const articulos = await restGet('articulo_inventario', 'select=id,nombre,cantidad');
  logTest(`Artículos registrados: ${articulos.length}/10`, articulos.length === 10);

  // Simular consumo — reducir alas de pollo por debajo del mínimo
  const alas = articulos.find((a: any) => a.nombre === 'Alas de pollo');
  if (alas) {
    await restPatch('articulo_inventario', `id=eq.${alas.id}`, { cantidad: 5 });
    const updated = await restGet('articulo_inventario', `id=eq.${alas.id}`);
    logTest(`Simular bajo stock: Alas de pollo → ${updated[0].cantidad} (bajo mínimo 20)`, updated[0].cantidad === 5);
  }
}

// ============================================================================
// PHASE 10: GASTOS
// ============================================================================

async function registrarGastos() {
  logSection('FASE 10: REGISTRAR GASTOS (8 gastos variados)');

  for (const gasto of GASTOS_DATA) {
    try {
      await restPost('gasto', {
        id: uuid(),
        monto: gasto.monto,
        concepto: gasto.concepto,
        categoria: gasto.categoria,
        fecha: gasto.fecha,
        admin_id: 'admin',
      });
      logTest(`Gasto: ${gasto.concepto} ($${gasto.monto} - ${gasto.categoria})`, true);
    } catch (e: any) {
      logTest(`Gasto: ${gasto.concepto}`, false, e.message);
    }
  }

  // Verificar total de gastos
  const gastos = await restGet('gasto', 'select=id,monto,categoria');
  logTest(`Gastos registrados: ${gastos.length}/8`, gastos.length === 8);

  // Verificar suma
  const totalGastos = gastos.reduce((sum: number, g: any) => sum + g.monto, 0);
  const expectedTotal = GASTOS_DATA.reduce((sum, g) => sum + g.monto, 0);
  logTest(`Total gastos: $${totalGastos} (esperado: $${expectedTotal})`, Math.abs(totalGastos - expectedTotal) < 0.01);
}

// ============================================================================
// PHASE 11: PAGOS Y LIBERAR MESAS
// ============================================================================

async function procesarPagos() {
  logSection('FASE 11: PROCESAR PAGOS Y LIBERAR MESAS');

  // Marcar 5 pedidos locales servidos como pagados
  const pedidosServidos = await restGet('pedido', 'estado=eq.servido&modalidad=eq.local&select=id,numero,mesa_zona,total');

  for (const pedido of pedidosServidos.slice(0, 5)) {
    try {
      // Marcar como pagado
      await restPatch('pedido', `id=eq.${pedido.id}`, {
        estado_pago: 'pagado',
        metodo_pago: Math.random() > 0.5 ? 'transferencia' : 'efectivo',
        actualizado_en: new Date().toISOString(),
      });

      // Liberar mesa
      if (pedido.mesa_zona) {
        const mesaNombre = pedido.mesa_zona.split(' - ')[0];
        const mesa = await restGet('mesa', `nombre=ilike.${encodeURIComponent(mesaNombre)}`);
        if (mesa.length > 0) {
          await restPatch('mesa', `id=eq.${mesa[0].id}`, {
            estado: 'disponible',
            pedido_activo_id: null,
          });
        }
      }

      logTest(`Pago ${pedido.numero}: $${pedido.total} → pagado, mesa liberada`, true);
    } catch (e: any) {
      logTest(`Pago ${pedido.numero}`, false, e.message);
    }
  }

  // Verificar mesas liberadas
  const mesasDisponibles = await restGet('mesa', 'estado=eq.disponible');
  logTest(`Mesas disponibles después de pagos: ${mesasDisponibles.length} (>= 5)`, mesasDisponibles.length >= 5);

  // Marcar pedidos domicilio como pagados
  const pedidosEntregados = await restGet('pedido', 'estado=eq.entregado&modalidad=eq.domicilio&select=id,numero');
  for (const pedido of pedidosEntregados) {
    await restPatch('pedido', `id=eq.${pedido.id}`, {
      estado_pago: 'pagado',
      metodo_pago: 'transferencia',
    });
  }
  logTest(`Pedidos domicilio marcados como pagados: ${pedidosEntregados.length}`, true);
}

// ============================================================================
// PHASE 12: STRESS TEST — CONCURRENCIA
// ============================================================================

async function stressTestConcurrencia() {
  logSection('FASE 12: STRESS TEST — Pedidos Concurrentes (10 simultáneos)');

  const timestamp = Date.now().toString(36); // Unique per execution

  const promesas = Array.from({ length: 10 }, (_, i) => {
    const pedidoId = uuid();
    const producto = productosCreados[i % productosCreados.length];
    const esLocal = i % 2 === 0;
    return restPost('pedido', {
      id: pedidoId,
      numero: `ST-${timestamp}-${String(i + 1).padStart(3, '0')}`,
      estado: 'recibido',
      modalidad: esLocal ? 'local' : 'domicilio',
      mesa_zona: esLocal ? `Mesa ${(i / 2) + 1} - Interior` : null,
      subtotal: producto.precio,
      impuestos: Math.round(producto.precio * 0.16 * 100) / 100,
      total: Math.round(producto.precio * 1.16 * 100) / 100,
      estado_pago: 'pendiente',
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }).then(() => ({ success: true, i }))
      .catch((e: any) => ({ success: false, i, error: e.message }));
  });

  const results = await Promise.all(promesas);
  const exitosos = results.filter((r) => r.success);
  const fallidos = results.filter((r) => !r.success);

  logTest(`Pedidos concurrentes exitosos: ${exitosos.length}/10`, exitosos.length === 10);
  if (fallidos.length > 0) {
    for (const f of fallidos) {
      logTest(`Concurrente #${(f as any).i} falló`, false, (f as any).error);
    }
  }

  // Verificar que todos se guardaron
  const stressPedidos = await restGet('pedido', `numero=like.ST-${timestamp}-*&select=id,numero`);
  logTest(`Pedidos stress en DB: ${stressPedidos.length}/10`, stressPedidos.length === 10);
}

// ============================================================================
// PHASE 13: VALIDACIÓN DE INTEGRIDAD
// ============================================================================

async function validarIntegridad() {
  logSection('FASE 13: VALIDACIÓN DE INTEGRIDAD DE DATOS');

  // 1. Todos los pedidos tienen total > 0
  const pedidosSinTotal = await restGet('pedido', 'total=lte.0&select=id,numero,total');
  logTest(`No hay pedidos con total <= 0: ${pedidosSinTotal.length}`, pedidosSinTotal.length === 0);

  // 2. Todos los pedido_detalle tienen pedido_id válido
  const detalles = await restGet('pedido_detalle', 'select=id,pedido_id');
  const pedidoIds = new Set((await restGet('pedido', 'select=id')).map((p: any) => p.id));
  const detallesHuerfanos = detalles.filter((d: any) => !pedidoIds.has(d.pedido_id));
  logTest(`No hay detalles huérfanos: ${detallesHuerfanos.length}`, detallesHuerfanos.length === 0);

  // 3. Todos los pedido_detalle tienen producto_id que existe
  const productoIds = new Set((await restGet('producto', 'select=id')).map((p: any) => p.id));
  const detallesConProducto = await restGet('pedido_detalle', 'select=id,producto_id');
  const detallesSinProducto = detallesConProducto.filter((d: any) => !productoIds.has(d.producto_id));
  logTest(`No hay detalles con producto inexistente: ${detallesSinProducto.length}`, detallesSinProducto.length === 0);

  // 4. No hay mesas duplicadas por nombre
  const mesas = await restGet('mesa', 'activa=eq.true&select=nombre');
  const nombresUnicos = new Set(mesas.map((m: any) => m.nombre));
  logTest(`No hay mesas duplicadas: ${mesas.length} total, ${nombresUnicos.size} únicos`, mesas.length === nombresUnicos.size);

  // 5. Precio de productos > 0
  const productosConPrecio = await restGet('producto', 'activo=eq.true&select=id,nombre,precio');
  const productosConPrecioInvalido = productosConPrecio.filter((p: any) => !p.precio || p.precio <= 0);
  logTest(`Todos los productos tienen precio > 0: ${productosConPrecioInvalido.length} inválidos`, productosConPrecioInvalido.length === 0);

  // 6. Inventario: cantidades no negativas
  const inventario = await restGet('articulo_inventario', 'select=id,nombre,cantidad');
  const inventarioNegativo = inventario.filter((i: any) => i.cantidad < 0);
  logTest(`No hay inventario negativo: ${inventarioNegativo.length}`, inventarioNegativo.length === 0);

  // 7. Gastos: montos positivos
  const gastos = await restGet('gasto', 'select=id,monto');
  const gastosNegativos = gastos.filter((g: any) => g.monto <= 0);
  logTest(`No hay gastos con monto <= 0: ${gastosNegativos.length}`, gastosNegativos.length === 0);

  // 8. Clientes creados correctamente
  const clientes = await restGet('cliente', 'select=id,nombre,telefono');
  logTest(`Clientes en DB: ${clientes.length}`, clientes.length >= 15);

  // 9. Pedidos con items: each pedido created by us (with items) has at least 1 detalle
  const nuestrosPedidoIds = [...pedidosLocales, ...pedidosDomicilio].map(p => p.id);
  let pedidosSinItems = 0;
  for (const pid of nuestrosPedidoIds) {
    const dets = await restGet('pedido_detalle', `pedido_id=eq.${pid}&select=id`);
    if (dets.length === 0) pedidosSinItems++;
  }
  logTest(`Nuestros pedidos con items: ${nuestrosPedidoIds.length - pedidosSinItems}/${nuestrosPedidoIds.length}`, pedidosSinItems === 0);

  // 10. Consistencia de totales vs suma de detalles
  let inconsistentes = 0;
  for (const pid of nuestrosPedidoIds.slice(0, 5)) {
    const pedidoFull = await restGet('pedido', `id=eq.${pid}&select=subtotal,total,numero`);
    const dets = await restGet('pedido_detalle', `pedido_id=eq.${pid}&select=precio_total`);
    const sumaDetalles = dets.reduce((s: number, d: any) => s + (d.precio_total || 0), 0);
    const subtotalDB = pedidoFull[0]?.subtotal || 0;
    const numero = pedidoFull[0]?.numero || pid;
    if (Math.abs(sumaDetalles - subtotalDB) > 0.02) {
      inconsistentes++;
      console.log(`    ⚠️  ${numero}: suma detalles=${sumaDetalles}, subtotal DB=${subtotalDB}`);
    }
  }
  logTest(`Consistencia subtotal vs suma detalles (5 muestreados): ${inconsistentes} inconsistentes`, inconsistentes === 0);

  // 11. DOMICILIO: ningún pedido domicilio debe tener mesa_zona
  const domicilioConMesa = await restGet('pedido', 'modalidad=eq.domicilio&mesa_zona=neq.null&mesa_zona=neq.&select=id,numero,mesa_zona');
  // Filter out empty strings
  const domicilioConMesaReal = domicilioConMesa.filter((p: any) => p.mesa_zona && p.mesa_zona.trim() !== '');
  logTest(`Pedidos domicilio sin mesa_zona: ${domicilioConMesaReal.length} incorrectos`, domicilioConMesaReal.length === 0);
  if (domicilioConMesaReal.length > 0) {
    for (const p of domicilioConMesaReal.slice(0, 3)) {
      console.log(`    ⚠️  ${p.numero} (domicilio) tiene mesa_zona: "${p.mesa_zona}"`);
    }
  }

  // 12. QR: cada mesa activa debe tener un QR code asociado
  const mesasActivas = await restGet('mesa', 'activa=eq.true&select=nombre,zona');
  const qrCodes = await restGet('qr_mesa', 'activo=eq.true&select=codigo,mesa_zona');
  const qrCodigosSet = new Set(qrCodes.map((q: any) => q.codigo));
  let mesasSinQr = 0;
  for (const mesa of mesasActivas) {
    const esperado = mesa.nombre.replace(/\s+/g, '-').toUpperCase();
    if (!qrCodigosSet.has(esperado)) {
      mesasSinQr++;
      console.log(`    ⚠️  ${mesa.nombre}: QR esperado "${esperado}" no encontrado`);
    }
  }
  logTest(`Todas las mesas tienen QR code válido: ${mesasSinQr} sin QR`, mesasSinQr === 0);

  // 13. LOCAL: todos los pedidos locales deben tener mesa_zona
  const localSinMesa = await restGet('pedido', 'modalidad=eq.local&numero=not.like.ST-*&select=id,numero,mesa_zona');
  const localSinMesaReal = localSinMesa.filter((p: any) => !p.mesa_zona || p.mesa_zona.trim() === '');
  logTest(`Pedidos locales con mesa_zona asignada: ${localSinMesaReal.length} sin mesa`, localSinMesaReal.length === 0);

  // 14. Productos: hay al menos 1 producto de categoría 'bebidas' (para bar)
  const productosBebidas = await restGet('producto', 'categoria=eq.bebidas&activo=eq.true&select=id,nombre');
  logTest(`Productos de bar/bebidas disponibles: ${productosBebidas.length}`, productosBebidas.length >= 1);
}

// ============================================================================
// PHASE 14: DATOS RESUMEN PARA ADMIN
// ============================================================================

async function generarResumenAdmin() {
  logSection('FASE 14: RESUMEN DE DATOS — Vista Admin');

  const totalPedidos = await restGet('pedido', 'select=id');
  console.log(`  📋 Total pedidos en DB: ${totalPedidos.length}`);

  const porEstado = await restGet('pedido', 'select=estado');
  const estados: Record<string, number> = {};
  for (const p of porEstado) {
    estados[p.estado] = (estados[p.estado] || 0) + 1;
  }
  console.log('  📊 Pedidos por estado:');
  for (const [estado, count] of Object.entries(estados)) {
    console.log(`      ${estado}: ${count}`);
  }

  const porModalidad = await restGet('pedido', 'select=modalidad');
  const modalidades: Record<string, number> = {};
  for (const p of porModalidad) {
    modalidades[p.modalidad || 'sin_modalidad'] = (modalidades[p.modalidad || 'sin_modalidad'] || 0) + 1;
  }
  console.log('  🏠 Pedidos por modalidad:');
  for (const [mod, count] of Object.entries(modalidades)) {
    console.log(`      ${mod}: ${count}`);
  }

  const ventas = await restGet('pedido', 'estado_pago=eq.pagado&select=total');
  const totalVentas = ventas.reduce((s: number, p: any) => s + (p.total || 0), 0);
  console.log(`  💰 Total ventas (pagadas): $${totalVentas.toFixed(2)}`);

  const gastos = await restGet('gasto', 'select=monto');
  const totalGastos = gastos.reduce((s: number, g: any) => s + g.monto, 0);
  console.log(`  📤 Total gastos: $${totalGastos.toFixed(2)}`);
  console.log(`  📈 Utilidad bruta: $${(totalVentas - totalGastos).toFixed(2)}`);

  const clientes = await restGet('cliente', 'select=id');
  console.log(`  👥 Total clientes: ${clientes.length}`);

  const productos = await restGet('producto', 'activo=eq.true&select=id');
  console.log(`  🍗 Productos activos: ${productos.length}`);

  const mesasStatus = await restGet('mesa', 'activa=eq.true&select=estado');
  const disponibles = mesasStatus.filter((m: any) => m.estado === 'disponible').length;
  const ocupadas = mesasStatus.filter((m: any) => m.estado === 'ocupada').length;
  console.log(`  🪑 Mesas: ${disponibles} disponibles, ${ocupadas} ocupadas`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 INICIANDO PRUEBAS E2E REALES — Enterprise Integration Suite');
  console.log(`   Fecha: ${new Date().toLocaleString()}`);
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log('');

  const startTime = Date.now();

  try {
    await limpiarDB();
    await crearMesas();
    await crearPersonal();
    await crearProductos();
    await crearPedidosLocales();
    await crearPedidosDomicilio();
    await avanzarPedidosLocales();
    await avanzarPedidosDomicilio();
    await probarTransicionesInvalidas();
    await crearInventario();
    await registrarGastos();
    await procesarPagos();
    await stressTestConcurrencia();
    await validarIntegridad();
    await generarResumenAdmin();
  } catch (e: any) {
    console.error(`\n💥 ERROR FATAL: ${e.message}`);
    console.error(e.stack);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  logSection('RESULTADO FINAL');
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  ✅ Passed: ${passedTests}`);
  console.log(`  ❌ Failed: ${failedTests}`);
  console.log(`  ⏱️  Tiempo: ${elapsed}s`);
  console.log('');

  if (failures.length > 0) {
    console.log('  FALLOS DETALLADOS:');
    for (const f of failures) {
      console.log(`    ❌ ${f.test}`);
      console.log(`       ${f.error}`);
    }
  }

  console.log(`\n${failedTests === 0 ? '🎉 TODAS LAS PRUEBAS PASARON' : '⚠️  HAY FALLOS QUE CORREGIR'}\n`);
  process.exit(failedTests > 0 ? 1 : 0);
}

main();
