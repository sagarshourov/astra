import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import OpenAI from 'openai';
import type { RowDataPacket } from 'mysql2';
export const runtime = 'nodejs';
export const maxDuration = 60;
const inputSchema = z.object({ content: z.string().trim().min(1).max(6000) });
const DAILY_LIMIT = 30;

export async function GET(_request: Request, ctx: { params: Promise<{id: string}> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await ctx.params;
  const [owns] = await db.execute<RowDataPacket[]>('SELECT id FROM conversations WHERE id=? AND user_id=?', [id,session.user.id]);
  if (!owns.length) return NextResponse.json({ error:'Not found' }, {status:404});
  const [messages] = await db.execute<RowDataPacket[]>('SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC, id ASC LIMIT 200',[id]);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, ctx: { params: Promise<{id: string}> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error:'Invalid JSON' }, {status:400}); }
  const input = inputSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error:'Message must be 1–6000 characters.' }, {status:400});
  const [owns] = await db.execute<RowDataPacket[]>('SELECT id,title FROM conversations WHERE id=? AND user_id=?', [id,session.user.id]);
  if (!owns.length) return NextResponse.json({ error:'Not found' }, {status:404});

  // Atomic quota reservation (including concurrent requests).
  await db.execute('INSERT IGNORE INTO daily_usage (user_id,usage_date,requests_count) VALUES (?,UTC_DATE(),0)', [session.user.id]);
  const [quotaResult] = await db.execute(
    'UPDATE daily_usage SET requests_count=requests_count+1 WHERE user_id=? AND usage_date=UTC_DATE() AND requests_count < ?',
    [session.user.id, DAILY_LIMIT]);
  if (!('affectedRows' in quotaResult) || quotaResult.affectedRows !== 1)
    return NextResponse.json({error:'Daily quota reached (30 requests).'}, {status:429});

  await db.execute('INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)', [randomUUID(),id,'user',input.data.content]);
  const [history] = await db.execute<RowDataPacket[]>(
    'SELECT role,content FROM (SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 20) h ORDER BY created_at ASC,id ASC',[id]);
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions:'You are Astra, a helpful, concise personal AI assistant. Be truthful, respect privacy, and never pretend to have performed external actions.',
      input: history.map(row=>({ role: row.role as 'user'|'assistant', content: String(row.content) })),
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 700)
    });
    const answer = response.output_text?.trim() || 'Sorry, I could not generate a response.';
    const messageId = randomUUID();
    await db.execute('INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)', [messageId,id,'assistant',answer]);
    if (owns[0].title === 'New conversation') {
      await db.execute('UPDATE conversations SET title=? WHERE id=? AND user_id=?', [input.data.content.slice(0,90),id,session.user.id]);
    }
    await db.execute('UPDATE conversations SET updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?',[id,session.user.id]);
    return NextResponse.json({ message:{ id:messageId,role:'assistant',content:answer } });
  } catch(e) {
    console.error('AI request failed', e);
    return NextResponse.json({error:'AI service unavailable. Your message was saved; please try a new message later.'},{status:502});
  }
}
