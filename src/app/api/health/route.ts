
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Endpoint de salud para verificar si el proceso Node.js está respondiendo en Hostinger.
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
