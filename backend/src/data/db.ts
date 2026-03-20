import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL omgevingsvariabele ontbreekt');
}

export const db = new Pool({ connectionString: process.env.DATABASE_URL });
