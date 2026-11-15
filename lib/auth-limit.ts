import { createHash } from 'crypto';
import { db } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Persistent, bounded login and registration abuse throttling.
export async function throttle(kind: string, identifier: string, max = 8): Promise<boolean> {
  const hash = createHash('sha256').update(kind + ':' + identifier.toLowerCase()).digest('hex');
  await db.execute(`INSERT INTO auth_attempts (identifier_hash, attempts, window_start)
    VALUES (?, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
      attempts = IF(window_start < UTC_TIMESTAMP() - INTERVAL 15 MINUTE, 1, attempts + 1),
      window_start = IF(window_start < UTC_TIMESTAMP() - INTERVAL 15 MINUTE, UTC_TIMESTAMP(), window_start)`, [hash]);
  const [rows] = await db.execute<RowDataPacket[]>('SELECT attempts FROM auth_attempts WHERE identifier_hash = ?', [hash]);
  return Number(rows[0].attempts) <= max;
}
