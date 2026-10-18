/**
 * GENESIS AI — Autonomous Agent System Test Suite
 * Tests multi-step planning, tool selection, security boundaries,
 * path traversal defense, authorization gating, and real outcome verification.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let spawnedServer = null;

async function ensureServerRunning() {
  const isUp = await new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/tools', (res) => {
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
      const req = http.get('http://localhost:3001/api/tools', (res) => {
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

const { TOOL_REGISTRY, executeTool, resolveSafeWorkspacePath } = require('./tools/toolRegistry');
const { classifyIntent, generatePlan, executeStep } = require('./agent/agentCore');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failedTests++;
  }
}

async function runHttpJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🧪 GENESIS AI: Comprehensive Desktop Agent & Security Test Suite');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Tool Registry & Security Boundaries
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Tool Registry & Security Boundaries ---');
  
  assert(Object.keys(TOOL_REGISTRY).length === 10, '10 secure modular tools registered (including browser and media)');
  
  // Math tool evaluation (standard and natural language)
  const mathRes = await executeTool('compute.evaluate_math', { expression: '(15 * 8) + 180 / 2' });
  assert(mathRes.success === true, 'Math tool executed successfully');
  assert(mathRes.output?.result === 210, `Math evaluation accurate (expected 210, got ${mathRes.output?.result})`);
  assert(mathRes.output?.verified === true, 'Math result marked verified');

  const mathNatural1 = await executeTool('compute.evaluate_math', { expression: 'add 250 and 350' });
  assert(mathNatural1.success === true && mathNatural1.output?.result === 600, 'Natural language math: "add 250 and 350" -> 600');

  const mathNatural2 = await executeTool('compute.evaluate_math', { expression: '144 times 25' });
  assert(mathNatural2.success === true && mathNatural2.output?.result === 3600, 'Natural language math: "144 times 25" -> 3600');

  // YouTube search tool verification
  const ytRes = await executeTool('media.search_and_play_youtube', { query: 'Kannada song' });
  assert(ytRes.success === true, 'YouTube media tool executed successfully');
  assert(ytRes.output?.status === 'launched' && ytRes.output?.url?.includes('youtube.com'), 'YouTube media tool generated valid YouTube URL');
  assert(Boolean(ytRes.output?.videoId), `YouTube media tool extracted valid videoId (${ytRes.output?.videoId})`);
  assert(ytRes.output?.url?.includes('watch?v=') && ytRes.output?.url?.includes('autoplay=1'), 'YouTube media tool generated exact watch URL with autoplay=1 parameter');
  assert(ytRes.output?.browserLaunched === true, 'YouTube media tool executed browser launch command');
  assert(typeof ytRes.output?.playbackNote === 'string', 'YouTube media tool reported honest playback policy notice');
  assert(ytRes.output?.message?.includes('press Play') || ytRes.output?.message?.includes('autoplay'), 'YouTube tool output honestly informs user regarding browser autoplay policy');

  const ytHomeRes = await executeTool('media.search_and_play_youtube', { query: '' });
  assert(ytHomeRes.success === true && ytHomeRes.output?.url === 'https://www.youtube.com/', 'media.search_and_play_youtube opens https://www.youtube.com/ on empty/homepage query');

  // Calculator process launch and honest UI automation check
  const calcToolRes = await executeTool('system.launch_app', { appId: 'calculator', expression: '250 + 350' });
  assert(calcToolRes.success === true, 'system.launch_app executed successfully for calculator');
  assert(calcToolRes.output?.processVerified === true, 'system.launch_app verified calculator process running via tasklist');
  assert(Boolean(calcToolRes.output?.pid), `system.launch_app returned calculator PID (${calcToolRes.output?.pid})`);
  assert(calcToolRes.output?.uiAutomation?.attempted === true, 'system.launch_app attempted UI automation');
  assert(calcToolRes.output?.uiAutomation?.success === false, 'system.launch_app honestly reported UI automation limitation (UIPI isolation)');
  assert(calcToolRes.output?.computeResult?.result === 600, 'system.launch_app evaluated math expression to 600');

  // Browser tool security check (blocks javascript: or malicious protocol)
  const protoRes = await executeTool('browser.open_url', { url: 'javascript:alert(1)' });
  const protocolBlocked = !protoRes.success && (protoRes.error?.includes('forbidden') || protoRes.error?.includes('Security Violation'));
  assert(protocolBlocked, 'SECURITY: Blocked non-HTTP/HTTPS protocol injection in browser.open_url');

  // Workspace code metrics inspection
  const metricsRes = await executeTool('workspace.analyze_metrics', {});
  assert(metricsRes.success === true, 'Analyze metrics tool executed successfully');
  assert(metricsRes.output?.totalSourceFiles > 0, `Analyzed real files (found ${metricsRes.output?.totalSourceFiles} source files)`);
  assert(metricsRes.output?.totalSourceLines > 0, `Counted lines of code (found ${metricsRes.output?.totalSourceLines} lines)`);
  assert(metricsRes.output?.verified === true, 'Code metrics marked verified');

  // Safe file read
  const readRes = await executeTool('workspace.read_file', { filePath: 'package.json' });
  assert(readRes.success === true, 'Safe workspace file read executed');
  assert(readRes.output?.filePath === 'package.json', 'Returned correct relative path');
  assert(typeof readRes.output?.content === 'string' && readRes.output?.content.includes('genesis-ai'), 'Returned real file content');

  // Security Defense: Path traversal attempt with ../
  const travRes = await executeTool('workspace.read_file', { filePath: '../../../Windows/System32/drivers/etc/hosts' });
  assert(!travRes.success && travRes.error.includes('outside workspace directory is forbidden'), 'SECURITY: Blocked directory traversal attempt (../../)');

  // Security Defense: Block access to .env file
  const envRes = await executeTool('workspace.read_file', { filePath: '.env' });
  assert(!envRes.success && envRes.error.includes('protected file or directory'), 'SECURITY: Blocked attempt to read .env credentials file');

  // Security Defense: Unknown / arbitrary tool execution blocked
  let unknownToolBlocked = false;
  try {
    await executeTool('system.arbitrary_bash_command', { cmd: 'whoami' });
  } catch (err) {
    unknownToolBlocked = err.message.includes('not registered');
  }
  assert(unknownToolBlocked, 'SECURITY: Blocked arbitrary shell / unknown tool execution');

  // Consequential action authorization gating via executeStep
  // Overwriting existing package.json without authorization must be blocked!
  const testOverwriteStep = {
    stepId: 'step-pending-overwrite-test',
    title: 'Overwrite Project Configuration',
    tool: 'workspace.write_file',
    parameters: { filePath: 'package.json', content: '{"malicious": true}' }
  };
  const authDeniedRes = await executeStep(testOverwriteStep, false);
  assert(authDeniedRes.status === 'pending_authorization', 'SECURITY: Overwriting existing file blocked when authorized=false');

  // Verify allowlisted safe actions have requiresAuthorization: false
  assert(TOOL_REGISTRY['system.launch_app'].requiresAuthorization === false, 'Allowlisted safe action system.launch_app executes automatically (requiresAuthorization: false)');
  assert(TOOL_REGISTRY['browser.open_url'].requiresAuthorization === false, 'Allowlisted safe action browser.open_url executes automatically');
  assert(TOOL_REGISTRY['media.search_and_play_youtube'].requiresAuthorization === false, 'Allowlisted safe action media.search_and_play_youtube executes automatically');
  assert(TOOL_REGISTRY['compute.evaluate_math'].requiresAuthorization === false, 'Allowlisted safe action compute.evaluate_math executes automatically');


  // -------------------------------------------------------------------------
  // TEST GROUP 2: Intent Classification & Clarification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Intent Classification & Clarification ---');

  const intentMath = await classifyIntent('What is 450 divided by 15?');
  assert(intentMath.category === 'CALCULATION', `Classified arithmetic query as CALCULATION (got ${intentMath.category})`);

  const intentConv = await classifyIntent('Hello Genesis, who are you?');
  assert(intentConv.category === 'CONVERSATION', `Classified conversational greeting as CONVERSATION (got ${intentConv.category})`);

  const intentMulti = await classifyIntent('Analyze the codebase metrics and then show me package.json');
  assert(intentMulti.category === 'MULTI_STEP_TASK', `Classified multi-part instruction as MULTI_STEP_TASK (got ${intentMulti.category})`);

  const intentDesktopMulti = await classifyIntent('Open Calculator and add 250 and 350');
  assert(intentDesktopMulti.category === 'MULTI_STEP_TASK' || intentDesktopMulti.category === 'CALCULATION', `Classified desktop calc instruction as actionable (got ${intentDesktopMulti.category})`);

  const intentClarify = await classifyIntent('Open it now');
  assert(intentClarify.category === 'CLARIFICATION_NEEDED', `Classified ambiguous instruction as CLARIFICATION_NEEDED (got ${intentClarify.category})`);
  assert(typeof intentClarify.clarifyingQuestion === 'string' && intentClarify.clarifyingQuestion.length > 5, 'Generated helpful clarifying question');


  // -------------------------------------------------------------------------
  // TEST GROUP 3: Task Planning & Step Decomposition
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Task Planning & Step Decomposition ---');

  // Case 1: Calculator and Add 250 and 350
  const calcAddPlan = await generatePlan('Open Calculator and add 250 and 350', 'MULTI_STEP_TASK');
  const calcAddTools = calcAddPlan.steps.map(s => s.tool);
  assert(calcAddTools.includes('compute.evaluate_math'), 'Plan decomposes "Open Calculator and add 250 and 350" to compute.evaluate_math');
  assert(calcAddTools.includes('system.launch_app'), 'Plan decomposes "Open Calculator and add 250 and 350" to system.launch_app (calculator)');

  // Case 2: Calculator and 144 times 25
  const calcMulPlan = await generatePlan('Open Calculator and calculate 144 times 25', 'MULTI_STEP_TASK');
  const calcMulTools = calcMulPlan.steps.map(s => s.tool);
  assert(calcMulTools.includes('compute.evaluate_math') && calcMulTools.includes('system.launch_app'), 'Plan decomposes "Open Calculator and calculate 144 times 25" into both math and app launch');

  // Case 3: YouTube Kannada Song
  const ytPlan = await generatePlan('Open YouTube and play a Kannada song', 'MULTI_STEP_TASK');
  const ytTools = ytPlan.steps.map(s => s.tool);
  assert(ytTools.includes('media.search_and_play_youtube'), 'Plan decomposes "Open YouTube and play a Kannada song" to media.search_and_play_youtube');

  // Case 3a: Pure "Open YouTube" intent (should open https://www.youtube.com/)
  const pureYtPlan = await generatePlan('Open YouTube', 'SINGLE_ACTION');
  const pureYtStep = pureYtPlan.steps.find(s => s.tool === 'browser.open_url' || s.tool === 'media.search_and_play_youtube');
  assert(pureYtStep?.parameters?.url === 'https://www.youtube.com/' || pureYtStep?.parameters?.query === '', 'Plan decomposes "Open YouTube" to opening https://www.youtube.com/');

  // Case 3b: "Open YouTube and play Believer"
  const believerPlan = await generatePlan('Open YouTube and play Believer', 'MULTI_STEP_TASK');
  const believerStep = believerPlan.steps.find(s => s.tool === 'media.search_and_play_youtube');
  assert(believerStep?.parameters?.query === 'Believer', 'Plan extracts exact song query "Believer" from "Open YouTube and play Believer"');

  // Case 4: Notepad and Leave Letter
  const notepadPlan = await generatePlan('Open Notepad and write a short leave letter', 'MULTI_STEP_TASK');
  const notepadTools = notepadPlan.steps.map(s => s.tool);
  assert(notepadTools.includes('workspace.write_file'), 'Plan decomposes leave letter into workspace.write_file');
  assert(notepadTools.includes('system.launch_app'), 'Plan decomposes leave letter into system.launch_app (notepad)');
  const notepadLaunchStep = notepadPlan.steps.find(s => s.tool === 'system.launch_app');
  assert(notepadLaunchStep?.parameters?.filePath?.includes('leave_letter'), 'Notepad launch parameter targets leave_letter file');

  // Case 5: File Explorer
  const explorerPlan = await generatePlan('Open File Explorer and navigate to my project folder', 'MULTI_STEP_TASK');
  const explorerStep = explorerPlan.steps.find(s => s.tool === 'system.launch_app' && s.parameters?.appId === 'explorer');
  assert(Boolean(explorerStep), 'Plan decomposes project folder request to system.launch_app (explorer)');

  // Case 6: Create text file and verify it
  const verifyFilePlan = await generatePlan('Create a text file notes/task.txt with content Hello World and verify it', 'MULTI_STEP_TASK');
  const verifyFileTools = verifyFilePlan.steps.map(s => s.tool);
  assert(verifyFileTools.includes('workspace.write_file') && verifyFileTools.includes('workspace.read_file'), 'Plan decomposes file creation and verification into write_file and read_file');

  // Case 7: Open website in default browser
  const browserPlan = await generatePlan('Open a website https://github.com in my default browser', 'SINGLE_ACTION');
  const browserStep = browserPlan.steps.find(s => s.tool === 'browser.open_url');
  assert(Boolean(browserStep), 'Plan decomposes website request to browser.open_url');


  // -------------------------------------------------------------------------
  // TEST GROUP 4: Backend HTTP Endpoints & Live Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Backend HTTP Endpoints Verification ---');
  await ensureServerRunning();

  // 1. GET /api/tools
  const toolsHttp = await runHttpJson('http://localhost:3001/api/tools');
  assert(toolsHttp.status === 200, 'GET /api/tools returned HTTP 200');
  assert(toolsHttp.body?.success === true && toolsHttp.body?.count === 10, `GET /api/tools returned 10 active tools (got ${toolsHttp.body?.count})`);

  // 2. POST /api/chat with calculation
  const chatMathHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Calculate 75 * 40 + 500' });
  assert(chatMathHttp.status === 200, 'POST /api/chat for arithmetic returned HTTP 200');
  const mathStepResult = chatMathHttp.body?.agentPlan?.steps?.find(s => s.tool === 'compute.evaluate_math');
  const calculatedResult = mathStepResult?.result?.result;
  assert(calculatedResult === 3500, `Calculated and verified arithmetic result 3500 (got ${calculatedResult})`);

  // 3. POST /api/chat with desktop multi-step request ("Open Calculator and add 250 and 350")
  const chatCalcHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Open Calculator and add 250 and 350' });
  assert(chatCalcHttp.status === 200, 'POST /api/chat for "Open Calculator and add 250 and 350" returned HTTP 200');
  const calcSteps = chatCalcHttp.body?.agentPlan?.steps || [];
  assert(calcSteps.length >= 2, `Decomposed into ${calcSteps.length} steps`);
  const mathStep = calcSteps.find(s => s.tool === 'compute.evaluate_math');
  assert(mathStep && mathStep.status === 'completed' && mathStep.result?.result === 600, 'Math step auto-executed with verified result 600');
  const appStep = calcSteps.find(s => s.tool === 'system.launch_app');
  assert(appStep && appStep.status === 'completed', 'Calculator launch step auto-executed without repetitive authorization card');
  assert(appStep?.result?.processVerified === true, 'Calculator process launch verified on Windows');
  assert(Boolean(appStep?.result?.pid), `Calculator process ID reported (${appStep?.result?.pid})`);
  assert(appStep?.result?.uiAutomation?.attempted === true, 'Calculator UI interaction telemetry tracked');
  assert(typeof chatCalcHttp.body?.reply === 'string', 'API returned conversational response text');
  console.log('    [DEBUG] chatCalcHttp.body.reply =', JSON.stringify(chatCalcHttp.body?.reply));
  assert(
    chatCalcHttp.body.reply.includes('600') &&
    chatCalcHttp.body.reply.toLowerCase().includes('calculator'),
    'API response honestly combines Calculator process status and verified calculation result (600)'
  );
  assert(
    !chatCalcHttp.body.reply.includes('entered') || chatCalcHttp.body.reply.includes('not verified') || appStep.result.uiAutomation.success,
    'Truth-in-reporting: Does not falsely claim keystroke entry if unverified'
  );

  // 4. POST /api/chat with YouTube request
  const chatYtHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Open YouTube and play a Kannada song' });
  assert(chatYtHttp.status === 200, 'POST /api/chat for YouTube song returned HTTP 200');
  const ytStep = chatYtHttp.body?.agentPlan?.steps?.find(s => s.tool === 'media.search_and_play_youtube');
  assert(ytStep && ytStep.status === 'completed', 'YouTube search & playback auto-executed and marked completed');
  assert(ytStep?.result?.url?.includes('youtube.com'), 'YouTube result contains valid target URL');
  assert(Boolean(ytStep?.result?.videoId), `HTTP chat returned YouTube videoId (${ytStep?.result?.videoId})`);
  assert(ytStep?.result?.url?.includes('watch?v=') && ytStep?.result?.url?.includes('autoplay=1'), 'HTTP chat launched exact watch URL with autoplay=1 parameter');
  assert(ytStep?.result?.browserLaunched === true, 'YouTube video URL launched in Windows default browser');
  assert(typeof ytStep?.result?.playbackNote === 'string', 'Honest playback note included in step result');
  assert(
    chatYtHttp.body.reply.toLowerCase().includes('youtube') &&
    chatYtHttp.body.reply.toLowerCase().includes('browser'),
    'YouTube conversational reply honestly reports browser launched without claiming playback started'
  );
  assert(
    !chatYtHttp.body.reply.toLowerCase().includes('started playing') &&
    !chatYtHttp.body.reply.toLowerCase().includes('playing now'),
    'YouTube reply does not falsely claim playback has started'
  );

  // 4b. POST /api/chat for pure "Open YouTube"
  const chatPureYtHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Open YouTube' });
  assert(chatPureYtHttp.status === 200, 'POST /api/chat for "Open YouTube" returned HTTP 200');
  const pureYtStepHttp = chatPureYtHttp.body?.agentPlan?.steps?.find(s => s.tool === 'browser.open_url' || s.tool === 'media.search_and_play_youtube');
  assert(pureYtStepHttp && pureYtStepHttp.status === 'completed', '"Open YouTube" step executed and marked completed');
  assert(
    pureYtStepHttp?.result?.url === 'https://www.youtube.com/' || pureYtStepHttp?.parameters?.url === 'https://www.youtube.com/',
    '"Open YouTube" opens https://www.youtube.com/'
  );

  // 5. POST /api/agent/execute-step unauthorized rejection when attempting to overwrite an existing file
  const unauthOverwrite = await runHttpJson('http://localhost:3001/api/agent/execute-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    tool: 'workspace.write_file',
    parameters: { filePath: 'package.json', content: '{"malicious": true}' },
    isAuthorized: false
  });
  assert(unauthOverwrite.status === 403, `POST /api/agent/execute-step rejected unauthorized file overwrite with 403 (got ${unauthOverwrite.status})`);

  // 6. POST /api/agent/execute-step with safe workspace write for a new file & read back
  const testFileName = 'src/test_desktop_agent_artifact.txt';
  const testFileContent = 'GENESIS AI Verified Plan Execution - ' + new Date().toISOString();
  
  // Clean up if existed from prior run
  try {
    const fullPath = resolveSafeWorkspacePath(testFileName);
    if (fs.existsSync(fullPath.resolved)) fs.unlinkSync(fullPath.resolved);
  } catch {}

  const writeExec = await runHttpJson('http://localhost:3001/api/agent/execute-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    stepId: 'step-test-write',
    tool: 'workspace.write_file',
    parameters: { filePath: testFileName, content: testFileContent },
    isAuthorized: false // Safe new file should execute automatically!
  });
  assert(writeExec.status === 200 && writeExec.body?.success === true, 'Safe new file write executed automatically without repetitive confirmation');

  // Verify the file was actually written by reading it back
  const readBack = await executeTool('workspace.read_file', { filePath: testFileName });
  assert(readBack.success === true && readBack.output?.content === testFileContent, 'Verified real file content written to disk');

  // Attempting to overwrite without authorization must now be rejected
  const overwriteBlocked = await runHttpJson('http://localhost:3001/api/agent/execute-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    stepId: 'step-test-overwrite',
    tool: 'workspace.write_file',
    parameters: { filePath: testFileName, content: 'overwritten without auth' },
    isAuthorized: false
  });
  assert(overwriteBlocked.status === 403, 'Attempting to overwrite existing file without authorization correctly rejected with 403');

  // Clean up test file
  try {
    const fullPath = resolveSafeWorkspacePath(testFileName);
    fs.unlinkSync(fullPath.resolved);
  } catch {}

  // 7. Multi-step workflow: Leave letter drafting & Notepad launch
  const chatNotepadHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Open Notepad and write a short leave letter' });
  assert(chatNotepadHttp.status === 200, 'POST /api/chat for Notepad leave letter returned HTTP 200');
  const notepadSteps = chatNotepadHttp.body?.agentPlan?.steps || [];
  assert(notepadSteps.some(s => s.tool === 'workspace.write_file'), 'Plan contains leave letter write step');
  assert(notepadSteps.some(s => s.tool === 'system.launch_app' && s.parameters?.appId === 'notepad'), 'Plan contains Notepad launch step');

  // Clean up leave_letter.txt if generated
  try {
    const fullPath = resolveSafeWorkspacePath('leave_letter.txt');
    if (fs.existsSync(fullPath.resolved)) fs.unlinkSync(fullPath.resolved);
  } catch {}

  // 8. Multi-step workflow: Project folder Explorer navigation
  const chatExplorerHttp = await runHttpJson('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Open File Explorer and navigate to my project folder' });
  assert(chatExplorerHttp.status === 200, 'POST /api/chat for File Explorer returned HTTP 200');
  const explorerSteps = chatExplorerHttp.body?.agentPlan?.steps || [];
  const expStep = explorerSteps.find(s => s.tool === 'system.launch_app' && s.parameters?.appId === 'explorer');
  assert(expStep && expStep.status === 'completed', 'File Explorer launch auto-executed successfully');

  // -------------------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  stopSpawnedServer();

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal test execution error:', err);
  stopSpawnedServer();
  process.exit(1);
});

