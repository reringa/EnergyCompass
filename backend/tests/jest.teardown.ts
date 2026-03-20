/**
 * Jest global teardown — runs once in the main process after all test suites.
 *
 * Cleans up the test database by truncating all tables so subsequent test
 * runs start with a clean slate.  We truncate rather than drop so the
 * schema stays in place for faster re-runs.
 *
 * Note: because this is globalTeardown (main process), we reconstruct the
 * test DB URL ourselves rather than relying on setupFiles env propagation.
 */
import { Pool } from 'pg';

export default async function globalTeardown(): Promise<void> {
  const baseUrl =
    process.env.DATABASE_URL ?? 'postgresql://energie_user:localdev_secret@localhost:5432/energie_app';

  const testUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, '/energie_app_test$1');

  const pool = new Pool({ connectionString: testUrl });

  try {
    await pool.query('TRUNCATE contracten, profielen, gebruikers RESTART IDENTITY CASCADE');
    console.log('[jest.teardown] Test database cleaned up');
  } catch (err) {
    // Teardown failures should not fail the test run
    console.warn('[jest.teardown] Could not truncate test tables:', err);
  } finally {
    await pool.end();
  }
}
