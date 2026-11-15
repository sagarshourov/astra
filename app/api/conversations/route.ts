import { auth } from '@/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
export const runtime = 'nodejs';
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT id,title,created_at,updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100', [session.user.id]);
  return NextResponse.json({ conversations: rows });
}
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = randomUUID();
  await db.execute('INSERT INTO conversations (id,user_id,title) VALUES (?,?,?)', [id,session.user.id,'New conversation']);
  return NextResponse.json({ id, title: 'New conversation' }, { status: 201 });
}
