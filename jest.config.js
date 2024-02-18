module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  cacheDirectory: '.tmp/jestCache',
  testPathIgnorePatterns: [
    'node_modules',
    'dist'
  ],
  collectCoverage: true,
  moduleNameMapper: {
    '^axios$': require.resolve('axios')
  },
  setupFilesAfterEnv: ['<rootDir>/src/config/jest.setup.ts']
}
