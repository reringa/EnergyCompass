/**
 * Jest setup file for the backend test suite (setupFiles — runs per worker).
 *
 * Sets DATABASE_URL to the test database (energie_app_test) before any test
 * module is imported.  Because this runs in the worker process it correctly
 * propagates to src/data/db.ts which reads DATABASE_URL at import time.
 *
 * The test DB must exist and have the schema applied before running tests:
 *   createdb energie_app_test
 *   psql energie_app_test < schema.sql
 */

// Derive the test DB URL from the app DB URL by replacing the DB name
const baseUrl =
  process.env.DATABASE_URL ?? 'postgresql://energie_user:localdev_secret@localhost:5432/energie_app';

const testUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, '/energie_app_test$1');

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = 'test';
