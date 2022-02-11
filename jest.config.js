export default {
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'], // ts because they will be compiled by bazel
  verbose: true,
  moduleNameMapper: {
    '^(\\..*)\\.jsx?$': '$1', // support for ts imports with .js extensions
  },
};
