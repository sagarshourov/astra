import { auth } from '@/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const [result] = await db.execute('DELETE FROM conversations WHERE id=? AND user_id=?',[id, session.user.id]);
  const affected = 'affectedRows' in result ? Number(result.affectedRows) : 0;
  if (!affected) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
