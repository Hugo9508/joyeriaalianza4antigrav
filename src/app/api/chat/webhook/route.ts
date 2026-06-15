import { NextResponse } from 'next/server';

/**
 * @fileOverview Redirección de seguridad para evitar errores 404 si n8n usa la ruta antigua.
 */

export async function POST() {
  return NextResponse.json({ error: "Ruta movida a /api/webhook" }, { status: 301 });
}

export async function GET() {
  return NextResponse.json({ error: "Ruta movida a /api/webhook" }, { status: 301 });
}
