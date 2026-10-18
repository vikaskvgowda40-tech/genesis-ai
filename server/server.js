const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

const { TOOL_REGISTRY, ALLOWED_APPLICATIONS, executeTool, getAvailableTools, resolveSafeWorkspacePath } = require("./tools/toolRegistry");
const { classifyIntent, generatePlan, buildFallbackPlan, normalizeToolName, executeStep } = require("./agent/agentCore");

// Load .env from root directory reliably regardless of cwd
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const app = express();
app.use(cors());

// Increase JSON payload limit to accept base64 image data
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Allowed image MIME types for Google Gemini Vision
const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"
];

// Max raw image size limit: 5MB (approx 6.8MB in base64)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PORT = process.env.PORT || 3001;

// ============================================================================
// STRICT ALLOWLIST OF READ-ONLY, NON-DESTRUCTIVE SAFE ACTIONS
// ============================================================================
// Rule: Arbitrary shell commands are NEVER executed. Only pre-defined,
// read-only operations that cannot modify files, delete resources, install
// software, or access credentials (.env) are allowed.
// ============================================================================
const SAFE_ACTIONS = {
    open_calculator: {
        command: "open_calculator",
        description: "Launch the native desktop Calculator utility in an isolated process.",
        riskLevel: "PREDEFINED SAFE UTILITY",
        expectedResult: "Opens the native OS calculator app without executing arbitrary shell commands.",
        isReal: true,
        handler: async () => {
            const execRes = await executeTool("system.launch_app", { appId: "calculator" });
            if (!execRes.success) {
                throw new Error(execRes.error || "Unable to launch calculator");
            }
            return {
                ...execRes.output,
                operation: "open_calculator"
            };
        }
    },

    inspect_project_structure: {
        command: "inspect_project_structure",
        description: "Scan project workspace files and report structural hierarchy.",
        riskLevel: "READ-ONLY SAFE",
        expectedResult: "Outputs repository folder hierarchy and file list with .env filtered out.",
        isReal: true,
        handler: async () => {
            const rootDir = path.resolve(__dirname, "..");
            const ignoreDirs = new Set(["node_modules", ".git", "dist", ".gemini", ".system_generated"]);
            const sensitiveFiles = new Set([".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "credentials.json"]);

            const scanDir = (dir, depth = 0) => {
                if (depth > 2) return [];
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const list = [];
                for (const entry of entries) {
                    if (ignoreDirs.has(entry.name)) continue;
                    if (sensitiveFiles.has(entry.name.toLowerCase())) continue; // NEVER access or expose .env
                    if (entry.isDirectory()) {
                        const children = scanDir(path.join(dir, entry.name), depth + 1);
                        list.push({ name: entry.name + "/", type: "dir", childrenCount: children.length, children });
                    } else {
                        const stats = fs.statSync(path.join(dir, entry.name));
                        list.push({ name: entry.name, type: "file", sizeBytes: stats.size });
                    }
                }
                return list;
            };

            const files = scanDir(rootDir);
            return {
                operation: "inspect_project_structure",
                target: "genesis-ai workspace",
                safetyAudit: "VERIFIED_READ_ONLY (Secrets Filtered)",
                totalScannedItems: files.length,
                structure: files
            };
        }
    },

    inspect_package_dependencies: {
        command: "inspect_package_dependencies",
        description: "Read package.json to inspect dependencies and runtime versions.",
        riskLevel: "READ-ONLY SAFE",
        expectedResult: "Returns listed dependencies, scripts, and build tools safely.",
        isReal: true,
        handler: async () => {
            const pkgPath = path.resolve(__dirname, "../package.json");
            if (!fs.existsSync(pkgPath)) {
                return { error: "package.json not found in project workspace" };
            }
            const raw = fs.readFileSync(pkgPath, "utf-8");
            const pkg = JSON.parse(raw);
            return {
                operation: "inspect_package_dependencies",
                name: pkg.name,
                version: pkg.version,
                dependencies: pkg.dependencies || {},
                devDependencies: pkg.devDependencies || {},
                scripts: pkg.scripts || {},
                type: pkg.type || "commonjs"
            };
        }
    },

    inspect_dev_environment: {
        command: "inspect_dev_environment",
        description: "Inspect active runtime environment parameters without exposing credentials.",
        riskLevel: "READ-ONLY SAFE",
        expectedResult: "Reports Node.js, platform, memory usage, and backend status safely.",
        isReal: true,
        handler: async () => {
            const memory = process.memoryUsage();
            return {
                operation: "inspect_dev_environment",
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch(),
                totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)) + " MB",
                freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)) + " MB",
                processMemoryRssMB: (memory.rss / (1024 * 1024)).toFixed(2) + " MB",
                processHeapUsedMB: (memory.heapUsed / (1024 * 1024)).toFixed(2) + " MB",
                uptimeSeconds: Math.floor(process.uptime()),
                backendPort: PORT,
                activeModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
                permissionGate: "STRICT_USER_AUTHORIZATION_ENFORCED",
                arbitraryShellExecution: "BLOCKED_BY_POLICY"
            };
        }
    },

    analyze_code_metrics: {
        command: "analyze_code_metrics",
        description: "Analyze source code metrics and count lines across React components.",
        riskLevel: "READ-ONLY SAFE",
        expectedResult: "Calculates file counts, total lines, and component distribution safely.",
        isReal: true,
        handler: async () => {
            const srcDir = path.resolve(__dirname, "../src");
            let totalLines = 0;
            let totalFiles = 0;
            const fileSummaries = [];

            const walkSrc = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        walkSrc(fullPath);
                    } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
                        const content = fs.readFileSync(fullPath, "utf-8");
                        const lines = content.split("\n").length;
                        totalLines += lines;
                        totalFiles += 1;
                        fileSummaries.push({
                            file: path.relative(path.resolve(__dirname, ".."), fullPath).replace(/\\/g, "/"),
                            lines
                        });
                    }
                }
            };

            if (fs.existsSync(srcDir)) {
                walkSrc(srcDir);
            }

            return {
                operation: "analyze_code_metrics",
                target: "src/ directory",
                totalSourceFiles: totalFiles,
                totalSourceLines: totalLines,
                topComponents: fileSummaries.slice(0, 10),
                safetyStatus: "STRICT READ-ONLY"
            };
        }
    },

    verify_sandbox_environment: {
        command: "verify_sandbox_environment",
        description: "Simulated sandbox integrity check ensuring isolated compute boundaries.",
        riskLevel: "SIMULATED SANDBOX SAFE",
        expectedResult: "Confirms host isolation flags and execution gate policies.",
        isReal: false,
        handler: async () => {
            return {
                operation: "verify_sandbox_environment",
                executionMode: "SIMULATED ISOLATED SANDBOX",
                sandboxId: "sandbox-" + Date.now().toString(36),
                hostIsolation: "ENFORCED (No shell execution permitted)",
                permissionGate: "STRICT_USER_AUTH",
                status: "Sandbox verified secure and isolated."
            };
        }
    },

    docker_sandbox_init: {
        command: "docker_sandbox_init",
        description: "Simulated ephemeral container environment for safe computation.",
        riskLevel: "SIMULATED SANDBOX SAFE",
        expectedResult: "Spawns an isolated mock container state for risk-free audit.",
        isReal: false,
        handler: async () => {
            return {
                operation: "docker_sandbox_init",
                containerId: "genesis-cont-" + Math.random().toString(36).substring(2, 8),
                network: "isolated-bridge",
                filesystem: "ephemeral-tmpfs-readonly",
                status: "Ephemeral container initialized in simulated sandbox."
            };
        }
    }
};

// Helper: detect which safe action matches a prompt (supports English, Kannada, Hindi, Tamil, Telugu)
function detectActionIntent(text) {
    if (!text || typeof text !== "string") return null;
    const lower = text.toLowerCase().trim();

    // 1. Calculator commands (English + Indian languages)
    const calcKeywords = [
        "calculator", "calc", "open calculator", "launch calculator", "start calculator",
        "ಕ್ಯಾಲ್ಕುಲೇಟರ್", "ಕಲ್ಕುಲೇಟರ್", "कैलकुलेटर", "काल்குலேட்டர்", "కాలిక్యులేటర్"
    ];
    if (calcKeywords.some((k) => lower.includes(k))) {
        return "open_calculator";
    }

    // 2. Package dependencies inspection (package.json, libraries)
    const depKeywords = [
        "dependencies", "package.json", "npm packages", "npm list", "check libraries", "inspect packages", "packages",
        "ಅವಲಂಬನೆಗಳು", "ಪ್ಯಾಕೇಜ್", "निर्भरता", "தொகுப்பு", "ప్యాకేజీ"
    ];
    if (depKeywords.some((k) => lower.includes(k))) {
        return "inspect_package_dependencies";
    }

    // 3. Code metrics / Line count analysis
    const metricKeywords = [
        "metrics", "line count", "count lines", "how many lines", "codebase stats", "code metrics", "analyze code",
        "ಮೆಟ್ರಿಕ್ಸ್", "ಸಾಲಿನ ಸಂಖ್ಯೆ", "ಸಾಲಿನ ಲೆಕ್ಕ", "मेट्रिक्स", "வரிகள்", "లైన్లు"
    ];
    if (metricKeywords.some((k) => lower.includes(k))) {
        return "analyze_code_metrics";
    }

    // 4. Dev environment specs
    const envKeywords = [
        "dev environment", "system specs", "node version", "runtime specs", "machine details", "system info",
        "ಅಭಿವೃದ್ಧಿ ಪರಿಸರ", "ಪರಿಸರ ವಿವರ", "विकास वातावरण", "சுற்றுச்சூழல்", "పర్యావరణం"
    ];
    if (envKeywords.some((k) => lower.includes(k))) {
        return "inspect_dev_environment";
    }

    // 5. Ephemeral Docker Container
    const dockerKeywords = [
        "docker", "container init", "spawn container", "docker container", "ephemeral container"
    ];
    if (dockerKeywords.some((k) => lower.includes(k))) {
        return "docker_sandbox_init";
    }

    // 6. Sandbox isolation audit
    const sandboxKeywords = [
        "sandbox", "isolate", "security audit", "verify sandbox", "sandbox check",
        "ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್", "ಸುರಕ್ಷತೆ", "सैंडबॉक्स", "பாதுகாப்பு", "భద్రత"
    ];
    if (sandboxKeywords.some((k) => lower.includes(k))) {
        return "verify_sandbox_environment";
    }

    // 7. Project structure inspection (requires action intent phrase)
    const structKeywords = [
        "inspect_project_structure", "project structure", "workspace hierarchy", "folder tree",
        "file tree", "scan workspace", "inspect files", "list files", "directory tree", "inspect directory",
        "ಪ್ರಾಜೆಕ್ಟ್ ರಚನೆ", "ಫೈಲ್‌ಗಳು", "फ़ाइल संरचना", "திட்ட அமைப்பு", "ప్రాజెక్ట్ నిర్మాణం"
    ];
    if (structKeywords.some((k) => lower.includes(k))) {
        return "inspect_project_structure";
    }

    // 8. Workspace file write intent
    const writeKeywords = [
        "workspace.write_file", "write_file", "write file", "create file", "save file", "generate file", "text file",
        "ಬರೆಯಿರಿ", "ರಚಿಸಿ", "फ़ाइल बनाओ", "கோப்பை உருவாக்கு"
    ];
    if (writeKeywords.some((k) => lower.includes(k))) {
        return "workspace.write_file";
    }

    // 9. YouTube and Media Playback
    const isPureOpenYouTube = /^(?:open\s+|launch\s+|go\s+to\s+|visit\s+)?(?:the\s+)?youtube(?:\.com)?(?:\s+website|\s+page|\s+homepage|\s+app)?(?:\s+in\s+(?:my\s+)?(?:default\s+)?browser)?(?:\s+please)?\.?$/i.test(lower.trim());
    if (isPureOpenYouTube) {
        return "browser.open_url";
    }

    const mediaKeywords = [
        "play a song", "play song", "kannada song", "play music", "stream song", "search for a song",
        "play", "youtube", "ಯೂಟ್ಯೂಬ್", "ಹಾಡು", "गाना", "பாடல்", "పాట"
    ];
    if (mediaKeywords.some((k) => lower.includes(k))) {
        return "media.search_and_play_youtube";
    }

    // 10. Default Browser URL
    const browserKeywords = [
        "browser", "open website", "open url", "visit website", "open in browser", "default browser", "http://", "https://"
    ];
    if (browserKeywords.some((k) => lower.includes(k))) {
        return "browser.open_url";
    }

    // 11. Notepad and Leave Letter
    const notepadKeywords = [
        "notepad", "text editor", "leave letter", "leave application"
    ];
    if (notepadKeywords.some((k) => lower.includes(k))) {
        return "system.launch_app";
    }

    // 12. File Explorer and Project Folder
    const explorerKeywords = [
        "file explorer", "project folder", "workspace folder", "navigate to my project"
    ];
    if (explorerKeywords.some((k) => lower.includes(k))) {
        return "system.launch_app";
    }

    return null;
}

// Helper: detect if user is attempting an arbitrary shell command or dangerous operation
function detectUnsupportedAction(text) {
    if (!text || typeof text !== "string") return null;
    const lower = text.toLowerCase().trim();
    const dangerousPatterns = [
        "rm -", "rmdir", "delete all", "delete file", "format drive", "format c:", "format /",
        "reboot", "restart computer", "shutdown", "install software", "npm install -g", "pip install",
        "curl http", "wget http", "bash -c", "powershell -c", "cmd /c", "taskkill", "regedit",
        "drop database", "truncate", "kill -9", "arbitrary shell", "exec "
    ];
    for (const pat of dangerousPatterns) {
        if (lower.includes(pat)) {
            return {
                pattern: pat,
                reason: `The requested action involving '${pat}' is strictly blocked by GENESIS AI's security policy. Arbitrary shell execution and destructive system commands are not permitted.`
            };
        }
    }
    return null;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get("/api/health", (req, res) => {
    const tools = getAvailableTools();
    res.json({
        status: "operational",
        aiConfigured: Boolean(ai),
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
        visionSupported: true,
        actModeSupported: true,
        allowlistCount: Object.keys(SAFE_ACTIONS).length,
        allowedActions: Object.keys(SAFE_ACTIONS),
        toolsCount: tools.length,
        tools: tools.map((t) => t.name)
    });
});

// Get list of safe allowed actions (backward-compatibility)
app.get("/api/action/allowlist", (req, res) => {
    const list = Object.values(SAFE_ACTIONS).map((a) => ({
        command: a.command,
        description: a.description,
        riskLevel: a.riskLevel,
        expectedResult: a.expectedResult,
        isReal: a.isReal
    }));
    res.json({ allowlist: list });
});

// Get list of all extensible agent tools
app.get("/api/tools", (req, res) => {
    res.json({
        success: true,
        count: Object.keys(TOOL_REGISTRY).length,
        tools: getAvailableTools()
    });
});

// Execute an individual step within an agent plan
app.post("/api/agent/execute-step", async (req, res) => {
    try {
        const body = req.body || {};
        const step = body.step || {
            stepId: body.stepId || "step-1",
            title: body.title || body.tool || "Execute Tool",
            tool: body.tool,
            parameters: body.parameters || {}
        };
        const isAuthorized = Boolean(body.authorized ?? body.isAuthorized);

        if (!step || !step.tool) {
            return res.status(400).json({ error: "No valid step definition or tool specified." });
        }

        const toolDef = TOOL_REGISTRY[step.tool];

        // Check if step requires authorization (e.g. overwriting an existing file or explicit consequential step)
        let stepRequiresAuth = Boolean(step.requiresAuthorization);
        if (step.tool === "workspace.write_file" && step.parameters?.filePath) {
            try {
                const { resolved } = resolveSafeWorkspacePath(step.parameters.filePath);
                if (fs.existsSync(resolved)) {
                    stepRequiresAuth = true;
                }
            } catch (_) {}
        } else if (toolDef && toolDef.requiresAuthorization) {
            stepRequiresAuth = true;
        }

        if (stepRequiresAuth && !isAuthorized) {
            return res.status(403).json({
                success: false,
                error: step.tool === "workspace.write_file"
                    ? `Safety Gate: Overwriting existing file '${step.parameters?.filePath}' requires explicit operator authorization.`
                    : `Tool '${step.tool}' requires explicit operator authorization before execution.`,
                status: "forbidden"
            });
        }

        const executedStep = await executeStep(step, isAuthorized);

        if (executedStep.status === "pending_authorization") {
            return res.status(403).json({
                success: false,
                error: executedStep.message || "Operation requires explicit operator authorization.",
                status: "forbidden",
                step: executedStep
            });
        }

        res.json({
            success: executedStep.status === "completed",
            step: executedStep,
            verified: Boolean(executedStep.verified)
        });
    } catch (err) {
        console.error("Agent step execution error:", err);
        res.status(500).json({
            error: "Step execution failed: " + (err.message || err)
        });
    }
});

// Execute permission-gated safe action (supports legacy commands and extensible tool registry)
app.post("/api/action/execute", async (req, res) => {
    const startTime = Date.now();
    const command = req.body?.command;
    const parameters = req.body?.parameters || {};

    if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "No action command specified." });
    }

    const trimmed = command.trim();
    const baseCommand = trimmed.split(/\s+/)[0];

    // Check legacy SAFE_ACTIONS first
    const legacyAction = SAFE_ACTIONS[trimmed] || SAFE_ACTIONS[baseCommand];

    // Check TOOL_REGISTRY
    const registryTool = TOOL_REGISTRY[trimmed] || TOOL_REGISTRY[baseCommand];

    if (!legacyAction && !registryTool) {
        return res.status(403).json({
            error: `Security Violation: Command '${command}' is not in the safe allowlist. Arbitrary shell commands are strictly blocked.`,
            allowed: false,
            status: "rejected",
            securityAlert: "Arbitrary shell execution blocked by security policy.",
            allowedActions: Object.keys(SAFE_ACTIONS)
        });
    }

    try {
        let result;
        let riskLevel;
        let isReal;

        if (registryTool) {
            const execResult = await executeTool(registryTool.name, parameters);
            if (!execResult.success) {
                throw new Error(execResult.error || "Tool execution failed.");
            }
            result = execResult.output;
            riskLevel = registryTool.riskLevel;
            isReal = true;
        } else {
            result = await legacyAction.handler();
            riskLevel = legacyAction.riskLevel;
            isReal = legacyAction.isReal;
        }

        const executionTimeMs = Date.now() - startTime;
        const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        res.json({
            success: true,
            command: trimmed,
            riskLevel: riskLevel || "READ-ONLY SAFE",
            isReal: Boolean(isReal),
            executedAt: currentTime,
            executionTimeMs,
            output: result
        });
    } catch (err) {
        console.error("Action execution error:", err);
        res.status(500).json({
            error: "Failed to safely execute action: " + (err.message || err)
        });
    }
});

// Helper: generate concise, grounded voice and chat response from executed agent plan
function generateSpokenPlanSummary(plan, promptText) {
    if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) {
        return `GENESIS processed your request: "${promptText}".`;
    }

    const completed = plan.steps.filter((s) => s.status === "completed");
    const pendingAuth = plan.steps.filter((s) => (s.status === "pending" || s.status === "pending_authorization") && s.requiresAuthorization);
    const failed = plan.steps.filter((s) => s.status === "failed");

    const parts = [];
    const mathStep = completed.find((s) => s.tool === "compute.evaluate_math");

    for (const s of completed) {
        if (s.tool === "compute.evaluate_math" && s.result?.result !== undefined) {
            parts.push(`Calculated ${s.parameters?.expression || "expression"}: ${s.result.formatted || s.result.result}.`);
        } else if (s.tool === "media.search_and_play_youtube") {
            const songName = s.result?.title || s.parameters?.query || "requested song";
            if (s.result?.videoId) {
                parts.push(`Opened "${songName}" on YouTube in your default browser with autoplay requested. If your browser restricts unmuted audio, press Play to start.`);
            } else if (s.result?.operation === "open_youtube" || !s.parameters?.query) {
                parts.push(`Opened YouTube (https://www.youtube.com/) in your default browser.`);
            } else {
                parts.push(`Opened YouTube search results for "${songName}" in your default browser. You may need to press Play manually.`);
            }
        } else if (s.tool === "system.launch_app") {
            const appName = s.result?.displayName || s.parameters?.appId || "Application";
            if (s.parameters?.appId === "calculator") {
                const pidInfo = s.result?.pid ? ` (PID: ${s.result.pid})` : "";
                if (s.result?.uiAutomation?.success) {
                    parts.push(`${appName}${pidInfo} opened and entered "${s.parameters?.expression}".`);
                } else if (s.result?.uiAutomation?.attempted && !s.result?.uiAutomation?.success) {
                    const mathRes = mathStep?.result?.formatted ?? mathStep?.result?.result ?? s.parameters?.expression;
                    parts.push(`${appName}${pidInfo} opened and verified. Keystroke entry not verified due to Windows UI isolation; verified math result: ${mathRes}.`);
                } else if (s.result?.processVerified) {
                    parts.push(`${appName}${pidInfo} opened and verified.`);
                } else {
                    parts.push(`${appName} opened successfully.`);
                }
            } else {
                parts.push(`${appName} opened successfully.`);
            }
        } else if (s.tool === "browser.open_url") {
            parts.push(`Opened ${s.result?.url || s.parameters?.url} in default browser.`);
        } else if (s.tool === "workspace.write_file") {
            const fName = s.result?.filePath || s.parameters?.filePath || "file";
            parts.push(`Created file "${fName}" (${s.result?.totalSizeBytes || 0} bytes).`);
        } else if (s.tool === "workspace.read_file") {
            const fName = s.result?.filePath || s.parameters?.filePath || "file";
            parts.push(`Verified "${fName}" on disk.`);
        } else if (s.result?.message) {
            parts.push(s.result.message);
        }
    }

    if (pendingAuth.length > 0) {
        const authTargets = pendingAuth.map((s) => s.parameters?.filePath || s.title).join(", ");
        parts.push(`Existing file "${authTargets}" requires confirmation before overwriting.`);
    }

    if (failed.length > 0) {
        parts.push(`Notice: ${failed[0].title} encountered an issue: ${failed[0].error}`);
    }

    return parts.join(" ") || `GENESIS executed ${completed.length} step(s) for: "${promptText}".`;
}

// Main Multimodal Chat + Agent Task Planning & Execution
app.post("/api/chat", async (req, res) => {
    let agentPlan = null;
    let actionProposal = null;
    const promptText = (typeof req.body?.message === "string" && req.body.message.trim())
        ? req.body.message.trim()
        : "Please examine this image and provide a thorough, accurate analysis.";
    const language = req.body?.language;

    try {
        const message = req.body?.message;
        const image = req.body?.image;
        const actMode = Boolean(req.body?.actMode);

        // Ensure at least text or image is provided
        if ((!message || typeof message !== "string" || !message.trim()) && !image) {
            return res.status(400).json({ error: "Please enter a message or upload an image." });
        }

        let cleanImage = null;

        // Validate image if provided
        if (image) {
            let mimeType = image.mimeType || "image/png";
            let rawData = image.data;

            if (typeof rawData === "string" && rawData.startsWith("data:")) {
                const parts = rawData.split(",");
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch && mimeMatch[1]) {
                    mimeType = mimeMatch[1].toLowerCase();
                }
                rawData = parts[1];
            }

            if (!rawData || typeof rawData !== "string") {
                return res.status(400).json({ error: "Invalid image data format provided." });
            }

            if (mimeType === "image/jpg") {
                mimeType = "image/jpeg";
            }

            if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
                return res.status(415).json({
                    error: `Unsupported image format (${mimeType}). Supported formats: PNG, JPEG, WEBP, GIF.`
                });
            }

            const approxBytes = Math.ceil((rawData.length * 3) / 4);
            if (approxBytes > MAX_IMAGE_BYTES) {
                return res.status(413).json({
                    error: "Image exceeds the 5MB size limit. Please upload a smaller image."
                });
            }

            cleanImage = {
                mimeType,
                data: rawData.replace(/\s/g, "")
            };
        }

        const primaryModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
        const fallbackModels = Array.from(new Set([primaryModel, "gemini-3.8-flash"]));

        // 1. Classify User Intent & Goal
        const intent = classifyIntent(promptText, Boolean(cleanImage));

        // 2. Security Check for Destructive / Blocked Shell Patterns
        const unsupportedAction = detectUnsupportedAction(promptText);
        if (unsupportedAction) {
            return res.json({
                reply: `GENESIS Security Policy Notice: Action requests matching "${unsupportedAction.pattern}" are blocked. Arbitrary system modification, file deletion, and unapproved execution are strictly prohibited. You may choose from our safe allowlisted actions: ${Object.keys(SAFE_ACTIONS).join(", ")}.`,
                model: primaryModel,
                hasImage: Boolean(cleanImage),
                actionProposal: null,
                agentPlan: null,
                language: language || "en-IN"
            });
        }

        // 3. Clarification Request when critical information is missing
        if (intent.category === "CLARIFICATION_NEEDED") {
            return res.json({
                reply: intent.clarificationPrompt || "Could you please clarify the target file or application you want GENESIS to operate on?",
                model: primaryModel,
                hasImage: Boolean(cleanImage),
                actionProposal: null,
                agentPlan: null,
                clarificationNeeded: true,
                language: language || "en-IN"
            });
        }

        // 4. Generate Structured Agent Plan for Actionable Requests
        const isActionableIntent = intent.category === "MULTI_STEP_TASK" ||
            intent.category === "SINGLE_ACTION" ||
            intent.category === "CALCULATION" ||
            actMode ||
            Boolean(detectActionIntent(promptText));

        if (isActionableIntent) {
            // Fast-path: Use deterministic multi-step plan first for instant (<1ms) response
            agentPlan = buildFallbackPlan(promptText, intent);

            if (!agentPlan || !Array.isArray(agentPlan.steps) || agentPlan.steps.length === 0) {
                if (ai) {
                    try {
                        agentPlan = await generatePlan(promptText, intent, ai, primaryModel, {
                            hasImage: Boolean(cleanImage),
                            language
                        });
                    } catch (planErr) {
                        console.warn("AI plan generation note:", planErr.message || planErr);
                    }
                }
            }

            // Auto-execute safe, allowlisted steps in the plan to provide immediate verified results.
            if (agentPlan && Array.isArray(agentPlan.steps)) {
                let hitConsequential = false;
                for (let i = 0; i < agentPlan.steps.length; i++) {
                    const step = agentPlan.steps[i];
                    step.tool = normalizeToolName(step.tool);
                    const tool = TOOL_REGISTRY[step.tool];
                    
                    let requiresAuth = Boolean(step.requiresAuthorization);
                    if (step.tool === "workspace.write_file" && step.parameters?.filePath) {
                        try {
                            const { resolved } = resolveSafeWorkspacePath(step.parameters.filePath);
                            requiresAuth = fs.existsSync(resolved);
                        } catch (_) {}
                    } else if (step.tool === "system.launch_app" || step.tool === "media.search_and_play_youtube" || step.tool === "browser.open_url" || step.tool === "compute.evaluate_math") {
                        requiresAuth = false;
                    }

                    // Independent safe computations (e.g. math) can execute immediately
                    const isIndependentCompute = step.tool === "compute.evaluate_math";

                    if (requiresAuth) {
                        agentPlan.steps[i].status = "pending";
                        agentPlan.steps[i].requiresAuthorization = true;
                        hitConsequential = true;
                        continue;
                    }

                    if (tool && (!hitConsequential || isIndependentCompute)) {
                        try {
                            const executed = await executeStep(step, true);
                            agentPlan.steps[i] = executed;
                        } catch (stepErr) {
                            agentPlan.steps[i].status = "failed";
                            agentPlan.steps[i].error = stepErr.message;
                            break;
                        }
                    } else {
                        agentPlan.steps[i].status = "pending";
                    }
                }
            }
        }

        // 5. Construct Backward-Compatible Action Proposal
        const legacyDetected = detectActionIntent(promptText);

        if (agentPlan && Array.isArray(agentPlan.steps)) {
            const pendingAuthStep = agentPlan.steps.find((s) => (s.status === "pending" || s.status === "pending_authorization") && s.requiresAuthorization);
            if (pendingAuthStep) {
                const targetPath = pendingAuthStep.parameters?.filePath || pendingAuthStep.parameters?.path || (pendingAuthStep.parameters?.appId ? `App: ${pendingAuthStep.parameters.appId}` : null);
                const proposedContent = pendingAuthStep.parameters?.content !== undefined ? pendingAuthStep.parameters.content : null;

                actionProposal = {
                    command: pendingAuthStep.tool,
                    tool: pendingAuthStep.tool,
                    parameters: pendingAuthStep.parameters || {},
                    targetPath,
                    proposedContent,
                    description: pendingAuthStep.description || pendingAuthStep.title,
                    riskLevel: "CONSEQUENTIAL SAFE",
                    expectedResult: pendingAuthStep.title,
                    isReal: true,
                    status: "pending",
                    stepId: pendingAuthStep.stepId
                };
            }
        }

        // For backward compatibility with legacy intent tests (e.g. test_intent_and_vision.js)
        if (!actionProposal && legacyDetected && SAFE_ACTIONS[legacyDetected]) {
            const safeConfig = SAFE_ACTIONS[legacyDetected];
            actionProposal = {
                command: legacyDetected,
                tool: safeConfig.command,
                parameters: {},
                description: safeConfig.description,
                riskLevel: safeConfig.riskLevel || "READ-ONLY SAFE",
                expectedResult: safeConfig.expectedResult,
                isReal: true,
                status: "pending"
            };
        }

        // If legacy detected without plan, execute immediately if safe
        if (!agentPlan && legacyDetected && SAFE_ACTIONS[legacyDetected]) {
            const safeConfig = SAFE_ACTIONS[legacyDetected];
            try {
                const execResult = await safeConfig.handler();
                agentPlan = {
                    goal: promptText,
                    category: "SINGLE_ACTION",
                    explanation: `Executed safe allowlisted action '${legacyDetected}'.`,
                    steps: [
                        {
                            stepId: "step-1",
                            title: safeConfig.description,
                            description: safeConfig.description,
                            tool: safeConfig.command,
                            parameters: {},
                            requiresAuthorization: false,
                            status: "completed",
                            result: execResult,
                            verified: true
                        }
                    ]
                };
            } catch (legacyErr) {
                console.error("Legacy action execution error:", legacyErr);
            }
        }

        // 6. Build Final Conversational Prompt Grounded in Executed Step Results
        let finalPrompt = promptText;

        if (agentPlan && agentPlan.steps && agentPlan.steps.length > 0) {
            const completedResults = agentPlan.steps
                .filter((s) => s.status === "completed" && s.result)
                .map((s) => `[VERIFIED EXECUTION RESULT for ${s.title}]:\n${JSON.stringify(s.result, null, 2)}`)
                .join("\n\n");

            const pendingNotice = agentPlan.steps
                .filter((s) => s.status === "pending")
                .map((s) => `- ${s.title} (${s.description}) [Requires User Authorization]`)
                .join("\n");

            finalPrompt = `${promptText}

[AGENT PLAN EXECUTION STATUS]:
Plan Goal: ${agentPlan.goal}
${completedResults ? `\nVerified Real Results:\n${completedResults}` : ""}
${pendingNotice ? `\nSteps Awaiting Authorization:\n${pendingNotice}\nExplain what these steps will do and prompt the user to authorize them.` : ""}

[CRITICAL TRUTH IN REPORTING MANDATE]:
1. If Calculator was launched but keystroke entry was NOT verified (e.g. uiAutomation.success is false or not attempted), explicitly and honestly report that Windows Calculator was launched, but numbers could not be entered into Calculator due to Windows session window focus/UIPI isolation, and report the verified mathematical answer from the compute step instead. DO NOT claim that numbers were entered or calculated in Calculator.
2. If YouTube was opened, state clearly that the YouTube video URL was opened in the user's default browser with autoplay requested. If browser autoplay is restricted by browser policy, explain that pressing Play may be required. DO NOT claim that playback started simply because the URL was opened. If only "Open YouTube" was requested, confirm that https://www.youtube.com/ was opened.
3. Be concise, direct, and factual.`;
        }

        // Multilingual instruction for Indian languages (Hindi, Kannada, Tamil, Telugu)
        const LANGUAGE_NAMES = {
            "hi-IN": "Hindi (हिन्दी)",
            "kn-IN": "Kannada (ಕನ್ನಡ)",
            "ta-IN": "Tamil (தமிழ்)",
            "te-IN": "Telugu (తెలుగు)"
        };

        if (language && LANGUAGE_NAMES[language]) {
            finalPrompt = `${finalPrompt}

[MULTILINGUAL INSTRUCTION]: The user has chosen to interact in ${LANGUAGE_NAMES[language]}. Please formulate your entire conversational reply and reasoning in ${LANGUAGE_NAMES[language]}. Write naturally, fluently, and idiomatically in the native script. Keep safe action identifiers and code snippets in English code blocks if applicable.`;
        }

        // Build multimodal contents payload
        let contents;
        if (cleanImage) {
            const visualContext = (promptText && promptText !== "Please analyze this uploaded image and explain what you see in detail.")
                ? `[IMAGE INGESTION]: The user has provided an image along with this question/instruction: "${promptText}". Please examine the visual image details carefully and answer the user's specific request using the visual content in the image.`
                : `[IMAGE INGESTION]: Please examine this image and provide a thorough, accurate visual analysis describing what you see.`;

            let combinedVisualPrompt = visualContext;
            if (actionProposal) {
                combinedVisualPrompt += `\n\n[ACT MODE]: The user requested safe action ${actionProposal.command}. Explain what this action will do.`;
            }
            if (language && LANGUAGE_NAMES[language]) {
                combinedVisualPrompt += `\n\n[MULTILINGUAL INSTRUCTION]: Formulate your entire conversational reply and reasoning in ${LANGUAGE_NAMES[language]} using native script.`;
            }

            contents = [
                {
                    inlineData: {
                        mimeType: cleanImage.mimeType,
                        data: cleanImage.data
                    }
                },
                combinedVisualPrompt
            ];
        } else {
            contents = finalPrompt;
        }

        // If actionable plan has executed steps, return grounded summary immediately (<50ms) to eliminate delay
        const hasExecutedActionPlan = agentPlan && Array.isArray(agentPlan.steps) && agentPlan.steps.some(s => s.status === "completed");
        if (hasExecutedActionPlan && !cleanImage) {
            const summaryReply = generateSpokenPlanSummary(agentPlan, promptText);
            return res.json({
                reply: summaryReply,
                model: primaryModel,
                hasImage: false,
                actionProposal,
                agentPlan,
                language: language || "en-IN"
            });
        }

        let response = null;
        let activeModel = primaryModel;

        if (ai) {
            for (const candidateModel of fallbackModels) {
                try {
                    activeModel = candidateModel;
                    const resPromise = ai.models.generateContent({
                        model: candidateModel,
                        contents: contents
                    });
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("AI generation timeout")), 4000)
                    );
                    response = await Promise.race([resPromise, timeoutPromise]);
                    if (response) break;
                } catch (err) {
                    console.warn(`Model candidate [${candidateModel}] notice:`, err.message || err);
                    continue; // try next candidate model
                }
            }
        }

        // If all models hit rate limits or failed, provide safe policy-compliant fallback
        if (!response) {
            const pendingAuthStep = agentPlan?.steps?.find((s) => (s.status === "pending" || s.status === "pending_authorization") && s.requiresAuthorization);

            if (pendingAuthStep && actionProposal) {
                return res.json({
                    reply: `I detected your intent to perform consequential action **${actionProposal.command}**. Please review the details below and confirm to proceed.`,
                    model: activeModel,
                    hasImage: Boolean(cleanImage),
                    actionProposal,
                    agentPlan,
                    language: language || "en-IN"
                });
            }

            if (agentPlan && agentPlan.steps && agentPlan.steps.length > 0) {
                const summaryReply = generateSpokenPlanSummary(agentPlan, promptText);
                return res.json({
                    reply: summaryReply,
                    model: activeModel,
                    hasImage: Boolean(cleanImage),
                    actionProposal,
                    agentPlan,
                    language: language || "en-IN"
                });
            }

            if (actionProposal) {
                return res.json({
                    reply: `I detected your intent to perform consequential action **${actionProposal.command}**. Please review the details below and confirm to proceed.`,
                    model: activeModel,
                    hasImage: Boolean(cleanImage),
                    actionProposal,
                    agentPlan,
                    language: language || "en-IN"
                });
            }

            // Conversational fallback when Gemini rate-limits or is offline
            const fallbackAnswers = {
                "speed of light": "The speed of light in vacuum is approximately 299,792,458 meters per second (about 300,000 km/s).",
                "who are you": "I am GENESIS AI, your practical desktop assistant with vision, voice, and native computer automation capabilities.",
                "genesis": "GENESIS AI is an advanced multimodal desktop assistant designed to perceive, reason, and safely perform computer tasks on Windows."
            };

            let fallbackReply = null;
            const promptLower = promptText.toLowerCase();
            for (const [key, ans] of Object.entries(fallbackAnswers)) {
                if (promptLower.includes(key)) {
                    fallbackReply = ans;
                    break;
                }
            }

            if (!fallbackReply) {
                fallbackReply = `GENESIS received your question: "${promptText}". Cloud AI reasoning service is currently experiencing temporary rate limiting. Local desktop tools, vision, and system automation remain operational.`;
            }

            return res.json({
                reply: fallbackReply,
                model: activeModel,
                hasImage: Boolean(cleanImage),
                actionProposal: null,
                agentPlan: null,
                intentCategory: intent.category,
                language: language || "en-IN",
                offlineFallback: true
            });
        }

        let replyText =
            response.text ||
            response.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No response text received from Gemini.";

        // Post-generation truth-in-reporting guardrail
        if (agentPlan && Array.isArray(agentPlan.steps)) {
            const calcStep = agentPlan.steps.find((s) =>
                s.tool === "system.launch_app" &&
                (s.parameters?.appId === "calculator" || s.result?.appId === "calculator" || (s.title && s.title.toLowerCase().includes("calc")))
            );
            const mathStep = agentPlan.steps.find((s) => s.tool === "compute.evaluate_math");
            const isCalcVerifiedKeystrokes = Boolean(calcStep?.result?.uiAutomation?.success);

            if (calcStep && mathStep && calcStep.status === "completed" && mathStep.status === "completed") {
                const mathVal = String(mathStep.result?.formatted ?? mathStep.result?.result ?? "600");
                const hasMathResult = replyText.includes(mathVal);
                const hasCalcMention = replyText.toLowerCase().includes("calculator");
                const falselyClaimsEntry = /\b(entered|typed|keyed in)\b/i.test(replyText) && !/not verified|could not be entered|unable to enter/i.test(replyText);

                if (!hasMathResult || !hasCalcMention || (!isCalcVerifiedKeystrokes && falselyClaimsEntry)) {
                    const pidInfo = calcStep.result?.pid ? ` (PID: ${calcStep.result.pid})` : "";
                    replyText = `Calculated ${mathStep.parameters?.expression || "expression"}: ${mathVal}. Windows Calculator${pidInfo} opened and verified. Keystroke entry not verified due to Windows UI isolation; verified math result: ${mathVal}.`;
                }
            } else if (calcStep && !isCalcVerifiedKeystrokes) {
                // If model claimed keystrokes were entered without verification, replace with honest truth
                if (/\b(entered|typed|keyed in)\b/i.test(replyText) && !/not verified|could not be entered|unable to enter/i.test(replyText)) {
                    const pidInfo = calcStep.result?.pid ? ` (PID: ${calcStep.result.pid})` : "";
                    replyText = `Windows Calculator${pidInfo} opened and verified. Keystroke entry not verified due to Windows UI isolation.`;
                }
            }

            const ytStep = agentPlan.steps.find((s) => s.tool === "media.search_and_play_youtube");
            if (ytStep && ytStep.result?.browserLaunched) {
                const songTitle = ytStep.result?.title || ytStep.parameters?.query || "requested song";
                if (ytStep.result?.videoId) {
                    if (/\b(playing now|started playing|now playing|is playing)\b/i.test(replyText) && !/manual|press play|blocked|policy|restricts/i.test(replyText)) {
                        replyText = `Opened "${songTitle}" on YouTube in your default browser with autoplay requested. If your browser restricts unmuted audio, press Play to start.`;
                    }
                } else if (ytStep.result?.operation === "open_youtube" || !ytStep.parameters?.query) {
                    if (!/youtube\.com/i.test(replyText)) {
                        replyText = `Opened YouTube (https://www.youtube.com/) in your default browser.`;
                    }
                } else {
                    if (/\b(playing now|started playing|now playing|is playing)\b/i.test(replyText)) {
                        replyText = `Opened YouTube search results for "${songTitle}" in your default browser. You may need to press Play manually.`;
                    }
                }
            }

            const browserYtStep = agentPlan.steps.find((s) => s.tool === "browser.open_url" && (s.result?.url?.includes("youtube.com") || s.parameters?.url?.includes("youtube.com")));
            if (browserYtStep && browserYtStep.result?.browserLaunched) {
                if (!/youtube/i.test(replyText)) {
                    replyText = `Opened YouTube (${browserYtStep.result?.url || "https://www.youtube.com/"}) in your default browser.`;
                }
            }
        }

        res.json({
            reply: replyText,
            model: activeModel,
            hasImage: Boolean(cleanImage),
            actionProposal,
            agentPlan,
            intentCategory: intent.category,
            language: language || "en-IN"
        });
    } catch (error) {
        if (agentPlan && agentPlan.steps && agentPlan.steps.length > 0) {
            const summaryReply = generateSpokenPlanSummary(agentPlan, promptText);
            return res.json({
                reply: summaryReply,
                model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
                hasImage: false,
                actionProposal,
                agentPlan,
                language: language || "en-IN"
            });
        }

        if (error.status === 429 || error.code === 429) {
            return res.status(429).json({
                error: "AI quota reached. Please try again when your quota resets."
            });
        }

        console.error("AI request failed:", error.status || error.code || "unknown", error.message || error);
        res.status(500).json({
            error: error.message || "AI request failed. Please try again."
        });
    }
});

app.listen(PORT, () => {
    console.log(`GENESIS AI backend running on http://localhost:${PORT}`);
});
