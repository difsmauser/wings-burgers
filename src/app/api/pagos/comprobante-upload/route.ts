import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/app/api/_lib/rateLimit';
import { requireAuth } from '@/app/api/_lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pagos/comprobante-upload
 * Sube un comprobante de pago (imagen) y lo asocia a un pedido.
 * El comprobante queda pendiente de validación por caja.
 * Rate limited: 5 uploads per minute per IP.
 */
export async function POST(request: NextRequest) {
  // Rate limit uploads
  const ip = getClientIp(request);
  const rl = rateLimit(`comprobante:${ip}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs);
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Demasiadas subidas. Intenta en un momento.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pedidoId = formData.get('pedidoId') as string;
    const mesaZona = formData.get('mesaZona') as string || '';
    const total = formData.get('total') as string || '0';
    const metodoPago = formData.get('metodoPago') as string || 'transferencia';

    // Validate pedidoId
    if (!pedidoId || pedidoId.trim().length === 0) {
      return NextResponse.json(
        { error: { message: 'pedidoId es requerido' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let comprobanteUrl: string | null = null;

    // Upload file to Supabase Storage if provided
    if (file && file.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: { message: 'Tipo de archivo no permitido. Use JPG, PNG, WebP, GIF o PDF.' } },
          { status: 400 }
        );
      }

      // Max 10MB for receipts
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: { message: 'El archivo no debe superar 10MB' } },
          { status: 400 }
        );
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Sanitize extension
      const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
      const fileName = `comprobantes/${pedidoId}-${Date.now()}.${safeExt}`;
      const fileBuffer = await file.arrayBuffer();

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/productos/${fileName}`,
        {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': file.type,
            'x-upsert': 'true',
          },
          body: fileBuffer,
        }
      );

      if (uploadRes.ok) {
        comprobanteUrl = `${supabaseUrl}/storage/v1/object/public/productos/${fileName}`;
      }
    }

    // Create comprobante record in DB
    const comprobante = {
      pedido_id: pedidoId,
      mesa_zona: mesaZona,
      total: parseFloat(total),
      metodo_pago: metodoPago,
      comprobante_url: comprobanteUrl,
      estado: 'pendiente', // pendiente | validado | rechazado
      created_at: new Date().toISOString(),
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/comprobante_pago`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(comprobante),
      cache: 'no-store',
    });

    if (!insertRes.ok) {
      console.error('Comprobante insert error:', await insertRes.text());
      return NextResponse.json({ error: { message: 'Error al registrar comprobante' } }, { status: 500 });
    }

    const data = await insertRes.json();

    // Update pedido estado_pago to 'validando'
    await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ estado_pago: 'validando', metodo_pago: metodoPago }),
      cache: 'no-store',
    });

    return NextResponse.json({ data: data[0] || data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

/**
 * GET /api/pagos/comprobante-upload?estado=pendiente
 * Lista comprobantes (para caja).
 * Auth: admin, caja
 */
export async function GET(request: NextRequest) {
  // Auth: solo caja/admin pueden ver comprobantes pendientes
  const auth = await requireAuth(request, ['admin', 'caja']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'pendiente';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/comprobante_pago?estado=eq.${estado}&select=*&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
