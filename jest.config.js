// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/integration/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  // Coverage Configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'app/api/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!components/ui/**',
    '!lib/supabase/**',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
