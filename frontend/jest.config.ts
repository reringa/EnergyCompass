import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Points to the Next.js app directory so next/jest can pick up next.config.js
  // and .env files in the test environment.
  dir: './',
});

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Handle the @/* path alias defined in tsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
      },
    }],
  },
  testTimeout: 15000,
  verbose: true,
};

export default createJestConfig(config);
