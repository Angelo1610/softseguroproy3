// Mock setup for tests
beforeAll(() => {
  // Setup test database connection
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/biometric_auth_test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
});

afterAll(() => {
  // Cleanup
});
