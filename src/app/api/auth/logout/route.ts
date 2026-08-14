export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ data: { message: 'Sesión cerrada' } });

  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');

  return response;
}
