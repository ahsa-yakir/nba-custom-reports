module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',  // Only test utils for now
    '!src/utils/setupDatabase.js',
    '!src/utils/seedData.js'
  ]
};