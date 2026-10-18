// Automated Test Suite for GENESIS AI — Step 13
const http = require('http');
const path = require('path');
const { fork } = require('child_process');

const BASE_URL = 'http://localhost:3001';

let spawnedServer = null;

async function ensureServerRunning() {
  const isUp = await new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });

  if (isUp) {
    console.log('  ℹ️ Backend server already running on port 3001.');
    return;
  }

  console.log('  ℹ️ Starting backend server for testing...');
  spawnedServer = fork(path.resolve(__dirname, 'server.js'), [], {
    stdio: 'ignore',
    env: { ...process.env, PORT: '3001' }
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    const ready = await new Promise((resolve) => {
      const req = http.get('http://localhost:3001/api/health', (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
    });
    if (ready) {
      console.log('  ℹ️ Backend server ready on port 3001.');
      return;
    }
  }
  throw new Error('Timed out waiting for backend server to start.');
}

function stopSpawnedServer() {
  if (spawnedServer) {
    try {
      spawnedServer.kill();
    } catch (_) {}
    spawnedServer = null;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 GENESIS AI — STEP 13 AUTOMATED VALIDATION SUITE');
  console.log('====================================================\n');

  await ensureServerRunning();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. HEALTH CHECK & ALLOWLIST VERIFICATION
  console.log('Test 1: Health endpoint & safe actions list');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(res.ok, 'Health check responded with HTTP 200');
    assert(data.status === 'operational', `Server status is operational (got ${data.status})`);
    assert(Array.isArray(data.allowedActions) && data.allowedActions.includes('open_calculator'), 'open_calculator is registered in allowedActions');
    assert(data.allowedActions.length === 7, `Expected 7 allowlisted actions, found ${data.allowedActions.length}`);
  } catch (e) {
    assert(false, `Health check failed: ${e.message}`);
  }

  await delay(500);

  // 2. SAFE ACTION EXECUTION: OPEN CALCULATOR (PREDEFINED FIXED SPAWN)
  console.log('\nTest 2: Safe action execution -> open_calculator');
  try {
    const res = await fetch(`${BASE_URL}/api/action/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'open_calculator' })
    });
    const data = await res.json();
    assert(res.ok, 'Action execution succeeded with HTTP 200');
    assert(data.success === true, 'Execution reported success: true');
    assert(data.output?.operation === 'open_calculator', 'Output confirms operation open_calculator');
    assert(data.output?.status === 'launched', `Status is launched (got ${data.output?.status})`);
  } catch (e) {
    assert(false, `Open calculator execution failed: ${e.message}`);
  }

  await delay(500);

  // 3. SAFE ACTION EXECUTION: READ-ONLY INSPECT PROJECT STRUCTURE
  console.log('\nTest 3: Safe action execution -> inspect_project_structure');
  try {
    const res = await fetch(`${BASE_URL}/api/action/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'inspect_project_structure' })
    });
    const data = await res.json();
    assert(res.ok, 'Inspect project structure succeeded');
    assert(Array.isArray(data.output?.structure), 'Returned array of project files in structure');
    assert(data.output?.structure?.length > 0, `Found ${data.output?.structure?.length} items in project root`);
    assert(data.output?.safetyAudit?.includes('Secrets Filtered'), 'Secrets filtered from inspection');
  } catch (e) {
    assert(false, `Inspect project structure failed: ${e.message}`);
  }

  await delay(500);

  // 4. SECURITY PROTECTION: ARBITRARY COMMAND INJECTION BLOCKED (HTTP 403)
  console.log('\nTest 4: Security Policy Gate -> Block arbitrary shell execution');
  try {
    const res = await fetch(`${BASE_URL}/api/action/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'rm -rf /' })
    });
    const data = await res.json();
    assert(res.status === 403, `Blocked with HTTP 403 (got ${res.status})`);
    assert(Boolean(data.securityAlert), 'Security alert returned');
    assert(data.allowedActions?.includes('open_calculator'), 'Error response informs user of allowed actions');
  } catch (e) {
    assert(false, `Security gate test failed: ${e.message}`);
  }

  await delay(500);

  // 5. INTENT DETECTION: OPEN CALCULATOR (ENGLISH)
  console.log('\nTest 5: Natural language intent -> Open calculator (English)');
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can you please open calculator for me?',
        actMode: false,
        language: 'en-IN'
      })
    });
    const data = await res.json();
    assert(res.ok, 'Chat request succeeded');
    assert(Boolean(data.actionProposal), 'Action proposal was generated');
    assert(data.actionProposal?.command === 'open_calculator', `Proposed command is open_calculator (got ${data.actionProposal?.command})`);
    assert(data.actionProposal?.status === 'pending', 'Action status is strictly pending user authorization');
  } catch (e) {
    assert(false, `Open calculator English intent failed: ${e.message}`);
  }

  await delay(500);

  // 6. INTENT DETECTION: OPEN CALCULATOR (KANNADA)
  console.log('\nTest 6: Multilingual intent -> Open calculator (Kannada: ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಿರಿ)');
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ದಯವಿಟ್ಟು ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಿರಿ',
        actMode: false,
        language: 'kn-IN'
      })
    });
    const data = await res.json();
    assert(res.ok, 'Kannada chat request succeeded');
    assert(Boolean(data.actionProposal), 'Action proposal was generated for Kannada voice command');
    assert(data.actionProposal?.command === 'open_calculator', `Proposed command is open_calculator (got ${data.actionProposal?.command})`);
  } catch (e) {
    assert(false, `Kannada calculator intent failed: ${e.message}`);
  }

  await delay(500);

  // 7. INTENT DETECTION: OPEN CALCULATOR (HINDI)
  console.log('\nTest 7: Multilingual intent -> Open calculator (Hindi: कैलकुलेटर खोलो)');
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'कैलकुलेटर ओपन करो',
        actMode: false,
        language: 'hi-IN'
      })
    });
    const data = await res.json();
    assert(res.ok, 'Hindi chat request succeeded');
    assert(Boolean(data.actionProposal), 'Action proposal was generated for Hindi voice command');
    assert(data.actionProposal?.command === 'open_calculator', `Proposed command is open_calculator (got ${data.actionProposal?.command})`);
  } catch (e) {
    assert(false, `Hindi calculator intent failed: ${e.message}`);
  }

  await delay(500);

  // 8. CHAT & ORDINARY QUESTION (SHOULD NOT PRODUCE SPURIOUS ACTION PROPOSAL)
  console.log('\nTest 8: Ordinary conversational question (No spurious action proposal)');
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the speed of light in vacuum?',
        actMode: false,
        language: 'en-IN'
      })
    });
    const data = await res.json();
    assert(res.ok, 'Chat request succeeded with HTTP 200');
    assert(Boolean(data.reply && data.reply.length > 10), 'Gemini returned substantive reasoning reply');
    assert(!data.actionProposal, 'No spurious action proposal attached to general knowledge question');
  } catch (e) {
    assert(false, `Ordinary question test failed: ${e.message}`);
  }

  await delay(500);

  // 9. MULTIMODAL IMAGE UNDERSTANDING WITH USER'S QUESTION
  console.log('\nTest 9: Multimodal Vision Ingestion (Image + Custom Question)');
  try {
    // 1x1 cyan PNG data URL
    const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain this image and describe what you see.',
        image: {
          data: samplePngBase64,
          mimeType: 'image/png'
        },
        actMode: false,
        language: 'en-IN'
      })
    });
    const data = await res.json();
    assert(res.ok, 'Vision chat request responded with HTTP 200');
    assert(data.hasImage === true, 'Server confirmed hasImage: true');
    assert(Boolean(data.reply && data.reply.length > 10), 'Gemini analyzed image and provided descriptive response');
    console.log(`  📝 Gemini Vision response excerpt: "${data.reply.slice(0, 100).replace(/\n/g, ' ')}..."`);
  } catch (e) {
    assert(false, `Vision ingestion test failed: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  stopSpawnedServer();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  stopSpawnedServer();
  process.exit(1);
});
