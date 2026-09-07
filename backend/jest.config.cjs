/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Unit tests only — integration tests need a real DB + server (run separately in staging)
  testMatch: [
    '**/backend/src/tests/authController.test.js',
    '**/backend/src/tests/adminController.test.js',
    '**/backend/src/tests/buyerController.test.js',
    '**/backend/src/tests/sellerController.test.js',
    '**/backend/src/tests/checkoutV2Service.test.js',
    '**/backend/src/tests/paystackService.test.js',
    '**/backend/src/tests/twilioMaskingService.test.js',
    '**/backend/src/tests/cronService.test.js',
  ],
  // Map ESM-only modules to CommonJS-compatible mocks
  moduleNameMapper: {
    // isomorphic-dompurify → requires jsdom → @exodus/bytes (ESM). Mock it entirely.
    '^isomorphic-dompurify$': '<rootDir>/src/tests/__mocks__/dompurify.cjs',
    // @exodus/bytes is ESM-only – stub it out
    '^@exodus/bytes.*$': '<rootDir>/src/tests/__mocks__/empty.cjs',
    // jsdom sub-deps that are ESM
    '^html-encoding-sniffer$': '<rootDir>/src/tests/__mocks__/empty.cjs',
  },
  // Give each test file enough time to load the server
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
  // Collect coverage from the real source
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/services/**/*.js',
    '!src/tests/**'
  ]
};
