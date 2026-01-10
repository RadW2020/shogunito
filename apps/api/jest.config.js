/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
        transpilation: true,
        useESM: false,
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/*.spec.ts',
    '!**/main.ts',
    '!**/index.ts',
  ],
  collectCoverage: true,
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  forceExit: true,
  transformIgnorePatterns: ['node_modules/(?!(@shogun/shared|@shogun))'],
  moduleNameMapper: {
    '^@shogun/shared$': '<rootDir>/__mocks__/@shogun/shared.ts',
  },
  extensionsToTreatAsEsm: [],
};

module.exports = config;
