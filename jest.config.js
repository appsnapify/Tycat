module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/temp-deepsource/',
    '<rootDir>/bin/',
    '<rootDir>/coverage/'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'json', 'text'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{js,jsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx}'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/temp-deepsource/',
    '/bin/'
  ],
  roots: ['<rootDir>/__tests__/'],
  testTimeout: 10000
}
