import type { JestConfigWithTsJest } from 'ts-jest';

const sharedProjectConfig = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.test.json',
      },
    ],
  },
} satisfies JestConfigWithTsJest;

const config: JestConfigWithTsJest = {
  projects: [
    {
      ...sharedProjectConfig,
      displayName: 'express',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
      collectCoverageFrom: ['src/index.ts', 'src/express.ts'],
    },
    {
      ...sharedProjectConfig,
      displayName: 'react',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupReact.ts'],
      collectCoverageFrom: ['src/react.tsx'],
    },
  ],
};

export default config;
