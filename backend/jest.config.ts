import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        target: 'ES2022',
        resolveJsonModule: true,
        skipLibCheck: true,
      },
    }],
  },
  // setupFiles runs in each worker process — env vars set here are visible
  // to the code under test (including the pg Pool in src/data/db.ts)
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  // globalTeardown runs once in the main process after all tests finish
  globalTeardown: '<rootDir>/tests/jest.teardown.ts',
  testTimeout: 30000,
  verbose: true,
};

export default config;
