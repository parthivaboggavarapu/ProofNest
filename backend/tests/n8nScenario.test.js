const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const http = require('http');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const n8nService = require('../src/services/n8nService');
const axios = require('axios');

async function runScenarioTests() {
  console.log('\n===================================================================');
  console.log('  ProofNest: n8n Connection & Authentication Verification Suite');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const TEST_PORT = 5055;
  let server;

  try {
    // 1. Start test server instance
    await connectDB();
    server = app.listen(TEST_PORT);
    const baseUrl = `http://localhost:${TEST_PORT}`;
    const configuredSecret = process.env.N8N_WEBHOOK_SECRET || 'n8n_test_shared_secret';

    console.log('[Scenario 1] GET /api/health without authentication...');
    const healthRes = await axios.get(`${baseUrl}/api/health`);
    assert(
      healthRes.status === 200 &&
      healthRes.data.success === true &&
      healthRes.data.status === 'ok' &&
      healthRes.data.application === 'ProofNest',
      'Health endpoint returned expected minimal response without exposing credentials'
    );

    console.log('\n[Scenario 2] GET /api/integrations/n8n/test with correct Header Auth credential...');
    const authSuccessRes = await axios.get(`${baseUrl}/api/integrations/n8n/test`, {
      headers: {
        'X-ProofNest-Webhook-Secret': configuredSecret
      }
    });
    assert(
      authSuccessRes.status === 200 &&
      authSuccessRes.data.success === true &&
      authSuccessRes.data.message === 'n8n authentication successful',
      'Authenticated successfully with X-ProofNest-Webhook-Secret'
    );

    console.log('\n[Scenario 3] GET /api/integrations/n8n/test without secret (Missing header)...');
    try {
      await axios.get(`${baseUrl}/api/integrations/n8n/test`);
      assert(false, 'Expected request without secret to fail with 401');
    } catch (err) {
      assert(
        err.response && err.response.status === 401,
        `Rejected missing secret with HTTP 401 (Message: "${err.response?.data?.message}")`
      );
    }

    console.log('\n[Scenario 4] GET /api/integrations/n8n/test with incorrect secret...');
    try {
      await axios.get(`${baseUrl}/api/integrations/n8n/test`, {
        headers: {
          'X-ProofNest-Webhook-Secret': 'totally_invalid_secret_value'
        }
      });
      assert(false, 'Expected request with wrong secret to fail with 403');
    } catch (err) {
      assert(
        err.response && err.response.status === 403,
        `Rejected incorrect secret with HTTP 403 (Message: "${err.response?.data?.message}")`
      );
    }

    console.log('\n[Scenario 5] Verify Express can reach local n8n at N8N_BASE_URL (http://localhost:5678)...');
    const n8nHealth = await n8nService.checkN8nHealth();
    if (n8nHealth.reachable) {
      assert(
        n8nHealth.reachable === true && n8nHealth.status === 200,
        `Express successfully connected to local n8n on port 5678 (n8n status: "${n8nHealth.data?.status}")`
      );
    } else {
      console.warn(`  [INFO] Local n8n health check returned: ${n8nHealth.error}`);
    }

    console.log('\n[Scenario 6] Verify Docker host configuration address...');
    assert(
      n8nService.backendDockerUrl === 'http://host.docker.internal:5000',
      'Configured Docker internal gateway URL for n8n container as http://host.docker.internal:5000'
    );

    console.log('\n===================================================================');
    console.log(`  Scenario Verification Complete: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================================\n');

  } catch (err) {
    console.error('Scenario tests encountered unexpected error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await disconnectDB();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runScenarioTests();
