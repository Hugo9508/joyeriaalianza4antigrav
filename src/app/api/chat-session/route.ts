import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function POST() {
  const sessionToken = randomUUID();
  const cookieStore = await cookies();
  
  cookieStore.set('chat_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });

  return NextResponse.json({ success: true, token: sessionToken });
}
