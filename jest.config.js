/**
 * Jest 配置文件
 */
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!jest.config.js',
    '!coverage/**',
    '!node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // 忽略某些 ES 模块的转换
  transformIgnorePatterns: [
    'node_modules/(?!(lowdb|steno)/)'
  ],
  // 处理 ES 模块
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    '^lowdb/node$': '<rootDir>/tests/__mocks__/lowdb.js'
  }
};
