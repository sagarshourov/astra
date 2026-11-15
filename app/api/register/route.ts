import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { throttle } from '@/lib/auth-limit';
import type { RowDataPacket } from 'mysql2';

export const runtime = 'nodejs';
const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.email().max(255), password: z.string().min(12).max(128) });
export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: 'Enter a valid name, email, and password of at least 12 characters.' }, { status: 400 });
    const email = input.data.email.toLowerCase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!(await throttle('register-ip', ip, 5)) || !(await throttle('register-email', email, 5)))
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const [existing] = await db.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return NextResponse.json({ error: 'Account already exists.' }, { status: 409 });
    const passwordHash = await hash(input.data.password, 12);
    await db.execute('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [randomUUID(), input.data.name, email, passwordHash]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { console.error('Registration failed', e); return NextResponse.json({ error: 'Unable to register.' }, { status: 500 }); }
}
