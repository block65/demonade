export default {
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'], // ts because they will be compiled by bazel
};
