import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { throttle } from '@/lib/auth-limit';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const input = loginSchema.safeParse(credentials);
      if (!input.success) return null;
      const email = input.data.email.toLowerCase();
      if (!(await throttle('login', email))) return null;
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]
      );
      const user = rows[0];
      if (!user || !(await compare(input.data.password, user.password_hash))) return null;
      return { id: user.id, name: user.name, email: user.email };
    }
  })],
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.uid = user.id; return token; },
    session({ session, token }) {
      if (session.user && typeof token.uid === 'string') session.user.id = token.uid;
      return session;
    }
  }
});
