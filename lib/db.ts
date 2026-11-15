import mysql from 'mysql2/promise';

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

export const db = globalForDb.mysqlPool ?? mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 25,
  enableKeepAlive: true,
  ssl: process.env.DATABASE_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined,
  dateStrings: true
});
if (process.env.NODE_ENV !== 'production') globalForDb.mysqlPool = db;
