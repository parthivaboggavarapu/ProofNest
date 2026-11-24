const { connectDB, disconnectDB } = require('../src/config/db');
const authService = require('../src/services/authService');
const { verifyAccessToken } = require('../src/utils/tokenUtils');
const { User, RefreshToken } = require('../src/models');

const TEST_RUN = Date.now().toString(36);
const TEST_EMAIL = `jwt_user_${TEST_RUN}@example.com`;
const TEST_PASSWORD = 'StrongPassword123!';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${name}: ${details}`);
    testsFailed++;
  }
}

async function runAuthTests() {
  console.log('===================================================================');
  console.log('  ProofNest Phase 2: JWT Authentication & Token Rotation Tests');
  console.log('===================================================================');

  try {
    await connectDB();

    // 1. Successful Registration
    console.log('\n[1/7] Testing User Registration...');
    const regResult = await authService.register({
      name: 'JWT Test User',
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    assert(regResult.user && regResult.user.email === TEST_EMAIL, 'User registered with sanitized user object');
    assert(regResult.accessToken && typeof regResult.accessToken === 'string', 'Short-lived access token generated');
    assert(regResult.refreshToken && typeof regResult.refreshToken === 'string', 'Opaque refresh token string generated');

    const decoded = verifyAccessToken(regResult.accessToken);
    assert(decoded.userId === regResult.user._id.toString(), 'Access token verifies successfully with JWT_ACCESS_SECRET');

    // 2. Duplicate Registration Rejection
    console.log('\n[2/7] Testing Duplicate Email Handling...');
    let dupError = null;
    try {
      await authService.register({
        name: 'Another User',
        email: TEST_EMAIL,
        password: 'anotherPassword123'
      });
    } catch (err) {
      dupError = err;
    }
    assert(dupError && dupError.status === 409, 'Duplicate email registration correctly rejected with 409 Conflict');

    // 3. Successful Login & Incorrect Password
    console.log('\n[3/7] Testing Login & Password Verification...');
    let badPassError = null;
    try {
      await authService.login({ email: TEST_EMAIL, password: 'WrongPassword123' });
    } catch (err) {
      badPassError = err;
    }
    assert(badPassError && badPassError.status === 401, 'Incorrect password rejected with 401 Unauthorized');

    const loginResult = await authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(loginResult.accessToken && loginResult.refreshToken, 'Valid credentials return access and refresh tokens');

    // 4. Refresh Token Rotation
    console.log('\n[4/7] Testing Refresh Token Rotation...');
    const originalRefreshToken = loginResult.refreshToken;
    const refreshResult1 = await authService.refresh({ rawRefreshToken: originalRefreshToken });

    assert(refreshResult1.accessToken && refreshResult1.refreshToken, 'Token refresh successfully issues new access and rotated refresh token');
    assert(refreshResult1.refreshToken !== originalRefreshToken, 'New refresh token is distinct from original token (rotated)');

    // 5. Token Reuse Detection
    console.log('\n[5/7] Testing Token Reuse Detection (Security Invariant)...');
    let reuseError = null;
    try {
      // Re-using the already-rotated originalRefreshToken!
      await authService.refresh({ rawRefreshToken: originalRefreshToken });
    } catch (err) {
      reuseError = err;
    }
    assert(
      reuseError && (reuseError.code === 'REFRESH_TOKEN_REUSE' || reuseError.status === 403),
      'Reusing an already-rotated refresh token triggers reuse detection and returns 403 Forbidden'
    );

    // Verify entire family is revoked
    let familyReusedError = null;
    try {
      await authService.refresh({ rawRefreshToken: refreshResult1.refreshToken });
    } catch (err) {
      familyReusedError = err;
    }
    assert(
      familyReusedError && (familyReusedError.code === 'REFRESH_TOKEN_REUSE' || familyReusedError.status === 403),
      'Entire token family revoked following detected reuse attempt'
    );

    // 6. Logout and Token Revocation
    console.log('\n[6/7] Testing Logout & Revocation...');
    const newLogin = await authService.login({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const logoutResult = await authService.logout({ rawRefreshToken: newLogin.refreshToken });
    assert(logoutResult.success === true, 'Logout successfully marks refresh token as revoked');

    // 7. Cleanup Test Records
    console.log('\n[7/7] Cleaning up temporary test records...');
    await RefreshToken.deleteMany({ userId: regResult.user._id });
    await User.findByIdAndDelete(regResult.user._id);
    assert(true, 'Test records cleaned up safely');

    console.log('===================================================================');
    console.log(`  Auth Verification Complete: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('===================================================================');

    await disconnectDB();

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

if (require.main === module) {
  runAuthTests();
}

module.exports = runAuthTests;
