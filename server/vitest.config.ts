import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Tests empty every table between runs, so they must only ever touch a test database.
const env = config({ path: '.env.test', override: true, quiet: true }).parsed;
if (!env?.DATABASE_URL) {
  throw new Error('server/.env.test with DATABASE_URL is required to run tests (copy server/.env.test.example).');
}
if (!/test/i.test(new URL(env.DATABASE_URL).pathname)) {
  throw new Error(`Refusing to run tests: the database name in .env.test must contain "test" (got ${new URL(env.DATABASE_URL).pathname}).`);
}

export default defineConfig({
  test: {
    environment: 'node',
    env,
    // Applies migrations to the test database once before the run.
    globalSetup: './tests/global-setup.ts',
    // Tests share one database, so run files one after another.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
