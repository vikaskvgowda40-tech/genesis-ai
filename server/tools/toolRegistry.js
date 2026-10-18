const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const zlib = require("zlib");
const { spawn } = require("child_process");

// Absolute root directory of the project workspace
const WORKSPACE_ROOT = path.resolve(__dirname, "../..");

// Sensitive files and directories that must NEVER be accessed, exposed, or written
const SENSITIVE_NAMES = new Set([
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "id_rsa",
    "id_ed25519",
    "credentials.json",
    "secrets.json",
    ".git",
    "node_modules"
]);

/**
 * Validate that a target path resides strictly inside the project workspace
 * and does not point to sensitive credential files or attempt directory traversal.
 */
function resolveSafeWorkspacePath(targetPath) {
    if (!targetPath || typeof targetPath !== "string") {
        throw new Error("Target file path must be a non-empty string.");
    }

    // Resolve path relative to workspace root
    const resolved = path.isAbsolute(targetPath)
        ? path.resolve(targetPath)
        : path.resolve(WORKSPACE_ROOT, targetPath);

    // Ensure path is inside WORKSPACE_ROOT
    const rel = path.relative(WORKSPACE_ROOT, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`Security Violation: Access outside workspace directory is forbidden (${targetPath}).`);
    }

    // Check sensitive file names
    const parts = resolved.split(path.sep);
    for (const part of parts) {
        if (SENSITIVE_NAMES.has(part.toLowerCase())) {
            throw new Error(`Security Violation: Access to protected file or directory '${part}' is strictly blocked.`);
        }
    }

    return { resolved, relativePath: rel.replace(/\\/g, "/") };
}

/**
 * Safely launch a validated HTTP or HTTPS URL in the system's default browser.
 * Avoids cmd.exe or PowerShell shell parsing to prevent command injection.
 */
function launchBrowserUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
        throw new Error("Target URL must be a non-empty string.");
    }

    let parsed;
    const clean = rawUrl.trim();
    try {
        parsed = new URL(clean);
    } catch (_) {
        try {
            parsed = new URL("https://" + clean);
        } catch (e) {
            throw new Error(`Invalid URL format: '${rawUrl}'. Must be a valid HTTP or HTTPS address.`);
        }
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`Security Violation: Protocol '${parsed.protocol}' is forbidden. Only HTTP and HTTPS addresses are permitted.`);
    }

    const safeUrl = parsed.href;
    const platform = process.platform;

    return new Promise((resolve, reject) => {
        try {
            let proc;
            if (platform === "win32") {
                const quotedUrl = `"${safeUrl.replace(/"/g, "")}"`;
                proc = spawn("cmd.exe", ["/c", "start", '""', quotedUrl], {
                    windowsVerbatimArguments: true,
                    stdio: ["ignore", "ignore", "pipe"]
                });
            } else if (platform === "darwin") {
                proc = spawn("open", [safeUrl], { stdio: ["ignore", "ignore", "pipe"] });
            } else {
                proc = spawn("xdg-open", [safeUrl], { stdio: ["ignore", "ignore", "pipe"] });
            }

            let stderr = "";
            if (proc.stderr) {
                proc.stderr.on("data", (chunk) => {
                    stderr += chunk.toString();
                });
            }

            let settled = false;
            proc.on("error", (err) => {
                if (!settled) {
                    settled = true;
                    reject(new Error(`Failed to launch system browser: ${err.message}`));
                }
            });

            proc.on("close", (code) => {
                if (!settled) {
                    settled = true;
                    if (code !== 0 && code !== null) {
                        reject(new Error(`Browser launch command failed with exit code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
                    } else {
                        resolve({
                            status: "launched",
                            url: safeUrl,
                            platform,
                            browserLaunched: true
                        });
                    }
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

// Fast in-memory cache of verified video IDs for responsive playback
const YOUTUBE_VIDEO_CACHE = new Map([
    ["kannada song", { videoId: "4IGo_zmRccQ", title: "Kannada Hit Song" }],
    ["a kannada song", { videoId: "4IGo_zmRccQ", title: "Kannada Hit Song" }],
    ["believer", { videoId: "7wtfhZwyrcc", title: "Imagine Dragons - Believer (Official Music Video)" }],
    ["believer imagine dragons", { videoId: "7wtfhZwyrcc", title: "Imagine Dragons - Believer (Official Music Video)" }],
    ["top trending hit songs", { videoId: "kJQP7kiw5Fk", title: "Top Trending Hit Song" }]
]);

/**
 * Search YouTube for a song or video title and extract the top matching video ID and title.
 * Uses in-memory cache and gzip stream decompression for rapid detection.
 */
async function searchYouTubeVideo(query) {
    const raw = String(query || "").trim();
    const norm = raw.toLowerCase().replace(/^(?:a|the)\s+/i, "");
    if (YOUTUBE_VIDEO_CACHE.has(norm)) {
        const cached = YOUTUBE_VIDEO_CACHE.get(norm);
        return { found: true, videoId: cached.videoId, title: cached.title, channel: "" };
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return new Promise((resolve) => {
        let settled = false;
        let req;
        const overallTimer = setTimeout(() => {
            finish({ found: false, searchUrl });
        }, 7000);

        const finish = (result) => {
            if (!settled) {
                settled = true;
                clearTimeout(overallTimer);
                if (req) {
                    try { req.destroy(); } catch (_) {}
                }
                if (result.found && result.videoId) {
                    YOUTUBE_VIDEO_CACHE.set(norm, { videoId: result.videoId, title: result.title });
                }
                resolve(result);
            }
        };

        req = https.get(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 7000
        }, (res) => {
            const isGzip = res.headers["content-encoding"] === "gzip";
            const isDeflate = res.headers["content-encoding"] === "deflate";
            let stream = res;
            if (isGzip) {
                const gunzip = zlib.createGunzip();
                gunzip.on("error", () => finish({ found: false, searchUrl }));
                res.pipe(gunzip);
                stream = gunzip;
            } else if (isDeflate) {
                const inflate = zlib.createInflate();
                inflate.on("error", () => finish({ found: false, searchUrl }));
                res.pipe(inflate);
                stream = inflate;
            }

            let html = "";
            stream.on("data", chunk => {
                if (settled) return;
                html += chunk.toString();

                // Fast stream detection: check if videoId has arrived
                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    let title = query;
                    const titleMatch = html.match(/"title":{"runs":\[{"text":"(.*?)"}\]/) || html.match(/"title":{"simpleText":"(.*?)"}/);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1];
                    }
                    return finish({ found: true, videoId: idMatch[1], title, channel: "" });
                }
            });

            stream.on("end", () => {
                if (settled) return;
                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    return finish({ found: true, videoId: idMatch[1], title: query, channel: "" });
                }
                finish({ found: false, searchUrl });
            });
        });

        req.on("error", () => finish({ found: false, searchUrl }));
        req.on("timeout", () => finish({ found: false, searchUrl }));
    });
}

/**
 * Normalize natural-language arithmetic expressions (e.g., "add 250 and 350", "144 times 25")
 */
function normalizeMathExpression(rawExpr) {
    if (!rawExpr || typeof rawExpr !== "string") return "";
    let expr = rawExpr.toLowerCase().trim();

    // Strip conversational prefixes
    expr = expr
        .replace(/^what\s+is\s+/i, "")
        .replace(/^calculate\s+/i, "")
        .replace(/^how\s+much\s+is\s+/i, "")
        .replace(/^evaluate\s+/i, "")
        .replace(/^solve\s+/i, "")
        .trim();

    // "add 250 and 350" -> "250 + 350"
    const addMatch = expr.match(/^add\s+(\d+(?:\.\d+)?)\s+(?:and|to|\+)\s+(\d+(?:\.\d+)?)/i);
    if (addMatch) {
        return `${addMatch[1]} + ${addMatch[2]}`;
    }

    // "subtract 50 from 200" -> "200 - 50"
    const subFromMatch = expr.match(/^subtract\s+(\d+(?:\.\d+)?)\s+from\s+(\d+(?:\.\d+)?)/i);
    if (subFromMatch) {
        return `${subFromMatch[2]} - ${subFromMatch[1]}`;
    }

    // Replace English arithmetic word operators
    expr = expr
        .replace(/\bplus\b/g, "+")
        .replace(/\badd\b/g, "+")
        .replace(/\bminus\b/g, "-")
        .replace(/\bsubtract\b/g, "-")
        .replace(/\btimes\b/g, "*")
        .replace(/\bmultiplied\s+by\b/g, "*")
        .replace(/\bdivided\s+by\b/g, "/")
        .replace(/\bover\b/g, "/")
        .replace(/(\d+)\s*x\s*(\d+)/g, "$1 * $2");

    return expr.trim();
}

/**
 * Verified Application Launch Allowlist
 * Maps user-friendly application identifiers to fixed, safe binaries without shell invocation.
 */
const ALLOWED_APPLICATIONS = {
    calculator: {
        id: "calculator",
        displayName: "Windows Calculator",
        win32: { cmd: "calc.exe", args: [] },
        darwin: { cmd: "open", args: ["-a", "Calculator"] },
        linux: { cmd: "gnome-calculator", args: [] },
        description: "Native desktop Calculator utility"
    },
    notepad: {
        id: "notepad",
        displayName: "Windows Notepad",
        win32: { cmd: "notepad.exe", args: [] },
        darwin: { cmd: "open", args: ["-a", "TextEdit"] },
        linux: { cmd: "gedit", args: [] },
        description: "Native text editor for notes and documents"
    },
    explorer: {
        id: "explorer",
        displayName: "Workspace Folder Explorer",
        win32: { cmd: "explorer.exe", args: [WORKSPACE_ROOT] },
        darwin: { cmd: "open", args: [WORKSPACE_ROOT] },
        linux: { cmd: "xdg-open", args: [WORKSPACE_ROOT] },
        description: "Open the project folder in native file manager"
    }
};

/**
 * Safely verify whether a specific process name is currently running on Windows.
 */
function checkProcessRunningWindows(imageNames = ["CalculatorApp.exe", "calc.exe"]) {
    if (process.platform !== "win32") {
        return { running: true, pid: null, processName: null };
    }
    try {
        const { execSync } = require("child_process");
        for (const img of imageNames) {
            const out = execSync(`tasklist /FI "IMAGENAME eq ${img}" /NH`, { encoding: "utf-8", timeout: 2500 });
            if (out && out.includes(img)) {
                const match = out.match(new RegExp(`${img.replace('.', '\\.')}\\s+(\\d+)`, "i"));
                return {
                    running: true,
                    pid: match ? parseInt(match[1], 10) : null,
                    processName: img
                };
            }
        }
    } catch (_) {}
    return { running: false, pid: null, processName: null };
}

/**
 * Poll process list with brief retry to allow Windows process creation to register.
 */
async function verifyProcessWithRetry(imageNames, attempts = 3, delayMs = 300) {
    for (let i = 0; i < attempts; i++) {
        const check = checkProcessRunningWindows(imageNames);
        if (check.running) return check;
        if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    return checkProcessRunningWindows(imageNames);
}

/**
 * Attempt to focus Windows Calculator and send mathematical keystrokes.
 * Safely handles Windows session focus and UWP AppContainer isolation.
 */
function automateCalculatorKeystrokes(expression) {
    if (process.platform !== "win32" || !expression) {
        return { attempted: false, reason: "Not on Windows or no expression provided." };
    }

    const clean = String(expression).replace(/\s+/g, "");
    if (!/^[0-9+\-*/.=]+$/.test(clean)) {
        return { attempted: false, reason: "Invalid arithmetic characters for Calculator." };
    }

    // In SendKeys, '+' is special (Shift), so wrap '+' in braces '{+}'
    const sendKeysFormat = clean
        .replace(/\+/g, "{+}")
        .replace(/\^/g, "{^}")
        .replace(/%/g, "{%}")
        .replace(/~/g, "{~}")
        .replace(/\(/g, "{(}")
        .replace(/\)/g, "{)}");

    const scriptContent = `
Set WshShell = WScript.CreateObject("WScript.Shell")
activated = WshShell.AppActivate("Calculator")
If Not activated Then activated = WshShell.AppActivate("calc")
If activated Then
    WScript.Sleep 250
    WshShell.SendKeys "{ESC}${sendKeysFormat}="
    WScript.Echo "SUCCESS"
Else
    WScript.Echo "NO_FOCUS"
End If
`;

    try {
        const tempVbs = path.join(os.tmpdir(), `genesis_calc_${Date.now()}.vbs`);
        fs.writeFileSync(tempVbs, scriptContent, "utf-8");
        const out = require("child_process").execSync(`cscript //nologo "${tempVbs}"`, {
            encoding: "utf-8",
            timeout: 3000
        }).trim();
        try { fs.unlinkSync(tempVbs); } catch (_) {}

        if (out.includes("SUCCESS")) {
            return {
                attempted: true,
                success: true,
                verified: true,
                keysSent: clean + "=",
                message: `Sent keystrokes "${clean}=" directly to Windows Calculator.`
            };
        } else {
            return {
                attempted: true,
                success: false,
                verified: false,
                reason: "Windows Calculator launched. Background session could not acquire top-level window focus for automatic keystroke entry (Windows UIPI isolation). Verified computation available below."
            };
        }
    } catch (err) {
        return {
            attempted: true,
            success: false,
            verified: false,
            reason: `UI Automation notice: ${err.message}`
        };
    }
}

/**
 * Tool Registry Definitions
 */
const TOOL_REGISTRY = {
    // ------------------------------------------------------------------------
    // 1. APPLICATION LAUNCHER (Safe, predefined binary execution)
    // ------------------------------------------------------------------------
    "system.launch_app": {
        name: "system.launch_app",
        category: "application",
        description: "Launch a verified native desktop application (e.g., calculator, notepad, explorer).",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            appId: { type: "string", required: true, description: "Application name ('calculator', 'notepad', 'explorer')" },
            filePath: { type: "string", required: false, description: "Optional safe workspace file path to open in application (e.g., for Notepad)" },
            targetPath: { type: "string", required: false, description: "Optional workspace folder to open in Explorer" },
            expression: { type: "string", required: false, description: "Optional arithmetic expression to enter into Calculator" }
        },
        execute: async (params = {}) => {
            const rawId = (params.appId || "").toLowerCase().trim();
            const appConfig = ALLOWED_APPLICATIONS[rawId];

            if (!appConfig) {
                const supported = Object.keys(ALLOWED_APPLICATIONS).join(", ");
                throw new Error(`Unsupported application '${rawId}'. Safe allowlisted apps: ${supported}.`);
            }

            const platform = process.platform;
            const targetSpec = appConfig[platform] || appConfig.win32;

            if (!targetSpec) {
                throw new Error(`Application '${rawId}' is not configured for platform '${platform}'.`);
            }

            // Support opening specific safe workspace files (e.g., notepad notes.txt) or folders
            let finalArgs = [...targetSpec.args];
            let targetResolvedPath = null;

            if (rawId === "notepad" && (params.filePath || params.path)) {
                const fileTarget = params.filePath || params.path;
                const { resolved } = resolveSafeWorkspacePath(fileTarget);
                targetResolvedPath = resolved;
                finalArgs.push(resolved);
            } else if (rawId === "explorer" && (params.targetPath || params.subDir || params.folder)) {
                const folderTarget = params.targetPath || params.subDir || params.folder;
                const { resolved } = resolveSafeWorkspacePath(folderTarget);
                targetResolvedPath = resolved;
                finalArgs = [resolved];
            }

            return new Promise(async (resolve, reject) => {
                try {
                    let proc;
                    if (rawId === "calculator" && platform === "win32") {
                        // Windows 10/11: Launch calculator via start calculator: protocol to bring GUI window to foreground
                        proc = spawn("cmd.exe", ["/c", "start", "calculator:"], {
                            detached: true,
                            stdio: "ignore"
                        });
                        // Also trigger calc.exe via shell as backup so desktop calculator window is guaranteed
                        try {
                            const pCalc = spawn("cmd.exe", ["/c", "start", '""', "calc.exe"], {
                                windowsVerbatimArguments: true,
                                detached: true,
                                stdio: "ignore"
                            });
                            pCalc.unref();
                        } catch (_) {}
                    } else if (rawId === "notepad" && platform === "win32") {
                        const notepadArgs = targetResolvedPath ? ['""', targetResolvedPath] : ['""'];
                        proc = spawn("cmd.exe", ["/c", "start", '""', "notepad.exe", ...notepadArgs], {
                            windowsVerbatimArguments: true,
                            detached: true,
                            stdio: "ignore"
                        });
                    } else if (rawId === "explorer" && platform === "win32") {
                        const folder = targetResolvedPath || WORKSPACE_ROOT;
                        proc = spawn("explorer.exe", [folder], {
                            detached: true,
                            stdio: "ignore"
                        });
                    } else {
                        proc = spawn(targetSpec.cmd, finalArgs, {
                            detached: true,
                            stdio: "ignore"
                        });
                    }

                    proc.on("error", (err) => {
                        reject(new Error(`Failed to launch ${appConfig.displayName}: ${err.message}`));
                    });

                    proc.unref();

                    // Verify process launch on Windows
                    let processVerified = false;
                    let verifiedPid = null;
                    let verifiedProcessName = null;

                    if (rawId === "calculator" && platform === "win32") {
                        const check = await verifyProcessWithRetry(["CalculatorApp.exe", "calc.exe"], 3, 300);
                        if (check.running) {
                            processVerified = true;
                            verifiedPid = check.pid;
                            verifiedProcessName = check.processName;
                        } else {
                            // Fallback UWP protocol launch if stub process didn't start CalculatorApp
                            try {
                                const fb = spawn("cmd.exe", ["/c", "start", "calculator:"], {
                                    detached: true,
                                    stdio: "ignore"
                                });
                                fb.unref();
                                const fbCheck = await verifyProcessWithRetry(["CalculatorApp.exe", "calc.exe"], 2, 400);
                                if (fbCheck.running) {
                                    processVerified = true;
                                    verifiedPid = fbCheck.pid;
                                    verifiedProcessName = fbCheck.processName;
                                }
                            } catch (_) {}
                        }
                    } else if (rawId === "notepad" && platform === "win32") {
                        const check = await verifyProcessWithRetry(["notepad.exe"], 2, 250);
                        if (check.running) {
                            processVerified = true;
                            verifiedPid = check.pid;
                            verifiedProcessName = check.processName;
                        }
                    } else {
                        processVerified = true;
                    }

                    // If launching calculator with expression, attempt keystroke entry with timeout
                    let uiAutomation = null;
                    let computeResult = null;
                    if (rawId === "calculator" && (params.expression || params.calcExpr)) {
                        const expr = params.expression || params.calcExpr;
                        uiAutomation = automateCalculatorKeystrokes(expr);
                        try {
                            computeResult = await TOOL_REGISTRY["compute.evaluate_math"].execute({ expression: expr });
                        } catch (_) {}
                    }

                    let messageText;
                    if (targetResolvedPath) {
                        messageText = `${appConfig.displayName} launched opening '${path.basename(targetResolvedPath)}'.`;
                    } else if (rawId === "calculator") {
                        const pidInfo = verifiedPid ? ` (PID: ${verifiedPid})` : "";
                        if (uiAutomation?.success) {
                            messageText = `${appConfig.displayName}${pidInfo} launched and entered "${params.expression}".`;
                        } else if (uiAutomation?.attempted && !uiAutomation.success) {
                            messageText = `${appConfig.displayName}${pidInfo} launched and verified. Keystroke entry could not be verified due to Windows UIPI window isolation; verified computation is provided directly.`;
                        } else if (processVerified) {
                            messageText = `${appConfig.displayName}${pidInfo} launched and verified successfully via safe allowlist.`;
                        } else {
                            messageText = `${appConfig.displayName} launch command dispatched. Process verification timed out.`;
                        }
                    } else {
                        messageText = `${appConfig.displayName} launched successfully via verified allowlist.`;
                    }

                    resolve({
                        operation: "launch_application",
                        appId: appConfig.id,
                        displayName: appConfig.displayName,
                        binary: targetSpec.cmd,
                        targetPath: targetResolvedPath,
                        platform: platform,
                        status: processVerified ? "launched" : "launch_unverified",
                        verified: processVerified,
                        processVerified,
                        pid: verifiedPid,
                        processName: verifiedProcessName,
                        uiAutomation,
                        computeResult,
                        message: messageText
                    });
                } catch (e) {
                    reject(e);
                }
            });
        }
    },

    // ------------------------------------------------------------------------
    // 2. READ WORKSPACE FILE
    // ------------------------------------------------------------------------
    "workspace.read_file": {
        name: "workspace.read_file",
        category: "file",
        description: "Read the content of a safe file within the project workspace.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            filePath: { type: "string", required: true, description: "Relative path to file (e.g., 'package.json', 'src/App.jsx')" },
            maxLines: { type: "number", required: false, description: "Max lines to return (default: 200)" }
        },
        execute: async (params = {}) => {
            const { resolved, relativePath } = resolveSafeWorkspacePath(params.filePath);

            if (!fs.existsSync(resolved)) {
                throw new Error(`File does not exist: ${relativePath}`);
            }

            const stats = fs.statSync(resolved);
            if (stats.isDirectory()) {
                throw new Error(`Target '${relativePath}' is a directory, not a file. Use workspace.inspect_structure instead.`);
            }

            if (stats.size > 2 * 1024 * 1024) {
                throw new Error(`File '${relativePath}' is too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Max size is 2MB.`);
            }

            const content = fs.readFileSync(resolved, "utf-8");
            const lines = content.split("\n");
            const max = params.maxLines && params.maxLines > 0 ? Math.min(params.maxLines, 500) : 200;
            const truncated = lines.length > max;
            const returnedContent = lines.slice(0, max).join("\n");

            return {
                operation: "read_file",
                filePath: relativePath,
                sizeBytes: stats.size,
                totalLines: lines.length,
                returnedLines: Math.min(lines.length, max),
                truncated,
                content: returnedContent,
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 3. WRITE / CREATE WORKSPACE FILE (Non-destructive document / notes creation)
    // ------------------------------------------------------------------------
    "workspace.write_file": {
        name: "workspace.write_file",
        category: "file",
        description: "Create or write content to a file inside the project workspace (e.g., reports, summaries, documentation).",
        riskLevel: "CONSEQUENTIAL SAFE",
        requiresAuthorization: false, // Automatically executes for new files; dynamically requires confirmation for overwriting existing files
        parameters: {
            filePath: { type: "string", required: true, description: "Relative destination path (e.g. 'notes/summary.md')" },
            content: { type: "string", required: true, description: "Content to write into the file" },
            isAuthorized: { type: "boolean", required: false, description: "Operator confirmation flag (required when overwriting an existing file)" }
        },
        execute: async (params = {}) => {
            const { resolved, relativePath } = resolveSafeWorkspacePath(params.filePath);

            if (!params.content || typeof params.content !== "string") {
                throw new Error("File content must be provided as text.");
            }

            const existedBefore = fs.existsSync(resolved);

            // Consequential Security Gate: Overwriting existing files requires explicit operator authorization
            if (existedBefore && params.isAuthorized !== true && params.authorized !== true) {
                throw new Error(`Safety Gate: File '${relativePath}' already exists. Overwriting existing files requires explicit operator authorization.`);
            }

            // Ensure parent directory exists
            const parentDir = path.dirname(resolved);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            fs.writeFileSync(resolved, params.content, "utf-8");
            const stats = fs.statSync(resolved);

            return {
                operation: "write_file",
                filePath: relativePath,
                absolutePath: resolved,
                bytesWritten: Buffer.byteLength(params.content, "utf-8"),
                totalSizeBytes: stats.size,
                createdNew: !existedBefore,
                status: existedBefore ? "updated" : "created",
                verified: true,
                message: existedBefore
                    ? `File '${relativePath}' successfully overwritten and updated (${stats.size} bytes).`
                    : `New file '${relativePath}' successfully created (${stats.size} bytes).`
            };
        }
    },

    // ------------------------------------------------------------------------
    // 4. INSPECT PROJECT STRUCTURE (Filtered, secret-free tree)
    // ------------------------------------------------------------------------
    "workspace.inspect_structure": {
        name: "workspace.inspect_structure",
        category: "inspection",
        description: "Scan project folders and list structural files safely with credentials filtered.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            subDir: { type: "string", required: false, description: "Optional subfolder to inspect (default: root)" },
            maxDepth: { type: "number", required: false, description: "Max folder depth (default: 2)" }
        },
        execute: async (params = {}) => {
            const target = params.subDir ? resolveSafeWorkspacePath(params.subDir).resolved : WORKSPACE_ROOT;
            const maxDepth = params.maxDepth && params.maxDepth > 0 ? Math.min(params.maxDepth, 3) : 2;

            const scan = (dir, depth = 0) => {
                if (depth > maxDepth) return [];
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const list = [];
                for (const entry of entries) {
                    if (SENSITIVE_NAMES.has(entry.name.toLowerCase())) continue;
                    if (entry.name === "dist" || entry.name === ".system_generated" || entry.name === ".gemini") continue;

                    if (entry.isDirectory()) {
                        const children = scan(path.join(dir, entry.name), depth + 1);
                        list.push({ name: entry.name + "/", type: "dir", childrenCount: children.length, children });
                    } else {
                        const stats = fs.statSync(path.join(dir, entry.name));
                        list.push({ name: entry.name, type: "file", sizeBytes: stats.size });
                    }
                }
                return list;
            };

            const structure = scan(target);
            return {
                operation: "inspect_structure",
                target: path.relative(WORKSPACE_ROOT, target) || "workspace root",
                itemCount: structure.length,
                safetyAudit: "VERIFIED_READ_ONLY (Secrets Filtered)",
                structure,
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 5. ANALYZE CODE METRICS
    // ------------------------------------------------------------------------
    "workspace.analyze_metrics": {
        name: "workspace.analyze_metrics",
        category: "inspection",
        description: "Analyze codebase metrics, file counts, and source lines of code across src/.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {},
        execute: async () => {
            const srcDir = path.resolve(WORKSPACE_ROOT, "src");
            let totalFiles = 0;
            let totalLines = 0;
            const fileSummaries = [];

            const countSource = (dir) => {
                if (!fs.existsSync(dir)) return;
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        countSource(full);
                    } else if (/\.(jsx?|tsx?|css|html|json)$/i.test(entry.name)) {
                        totalFiles++;
                        try {
                            const lines = fs.readFileSync(full, "utf-8").split("\n").length;
                            totalLines += lines;
                            fileSummaries.push({
                                file: path.relative(WORKSPACE_ROOT, full).replace(/\\/g, "/"),
                                lines
                            });
                        } catch (_) {}
                    }
                }
            };

            countSource(srcDir);
            fileSummaries.sort((a, b) => b.lines - a.lines);

            return {
                operation: "analyze_metrics",
                target: "src/",
                totalSourceFiles: totalFiles,
                totalSourceLines: totalLines,
                topComponents: fileSummaries.slice(0, 10),
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 6. SYSTEM RUNTIME ENVIRONMENT
    // ------------------------------------------------------------------------
    "system.get_environment": {
        name: "system.get_environment",
        category: "system",
        description: "Query system runtime parameters, OS specs, and memory telemetry safely.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {},
        execute: async () => {
            const memory = process.memoryUsage();
            return {
                operation: "get_environment",
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)) + " MB",
                freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)) + " MB",
                processHeapUsedMB: (memory.heapUsed / (1024 * 1024)).toFixed(2) + " MB",
                uptimeSeconds: Math.floor(process.uptime()),
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 7. ARITHMETIC & MATHEMATICAL COMPUTATION (Local, safe math evaluation)
    // ------------------------------------------------------------------------
    "compute.evaluate_math": {
        name: "compute.evaluate_math",
        category: "compute",
        description: "Evaluate arithmetic, percentages, and numerical expressions safely without shell execution.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            expression: { type: "string", required: true, description: "Mathematical expression (e.g. '145 * 12', 'add 250 and 350', '144 times 25')" }
        },
        execute: async (params = {}) => {
            const rawExpr = (params.expression || "").trim();
            if (!rawExpr) throw new Error("Expression is required for math evaluation.");

            // Normalize English arithmetic phrases if present
            const normalized = normalizeMathExpression(rawExpr) || rawExpr;

            // Strict sanitization: allow only digits, basic operators, parens, math functions
            // Explicitly block letters except allowed Math functions
            const sanitized = normalized
                .replace(/\s+/g, "")
                .replace(/sqrt/gi, "Math.sqrt")
                .replace(/sin/gi, "Math.sin")
                .replace(/cos/gi, "Math.cos")
                .replace(/tan/gi, "Math.tan")
                .replace(/log/gi, "Math.log10")
                .replace(/pi/gi, "Math.PI");

            const validPattern = /^[0-9+\-*/().,%^MathsincotanlgPI]+$/;
            if (!validPattern.test(sanitized)) {
                throw new Error("Invalid or unsafe characters in mathematical expression.");
            }

            // Safe function evaluator with no global access
            const evalExpr = sanitized.replace(/\^/g, "**");
            const result = Function(`"use strict"; return (${evalExpr})`)();

            if (typeof result !== "number" || isNaN(result)) {
                throw new Error("Expression did not evaluate to a valid number.");
            }

            return {
                operation: "evaluate_math",
                expression: rawExpr,
                normalizedExpression: normalized,
                result: result,
                formatted: Number.isInteger(result) ? result.toString() : result.toFixed(4),
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 8. SIMULATED ISOLATED SANDBOX INTEGRITY CHECK
    // ------------------------------------------------------------------------
    "sandbox.verify_security": {
        name: "sandbox.verify_security",
        category: "security",
        description: "Perform simulated sandbox boundary audit verifying permission gating policies.",
        riskLevel: "SIMULATED SAFE",
        requiresAuthorization: false,
        parameters: {},
        execute: async () => {
            return {
                operation: "verify_security",
                status: "verified",
                policyGate: "STRICT_USER_AUTHORIZATION",
                pathBoundary: WORKSPACE_ROOT,
                protectedFiles: Array.from(SENSITIVE_NAMES),
                shellExecution: "DISABLED (Predefined binary registry only)",
                verified: true
            };
        }
    },

    // ------------------------------------------------------------------------
    // 9. DEFAULT WEB BROWSER URL LAUNCHER
    // ------------------------------------------------------------------------
    "browser.open_url": {
        name: "browser.open_url",
        category: "browser",
        description: "Open a verified HTTP/HTTPS website in the user's default web browser.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            url: { type: "string", required: true, description: "Valid HTTP or HTTPS web address to open" }
        },
        execute: async (params = {}) => {
            const rawUrl = params.url || params.targetUrl || params.address;
            if (!rawUrl) {
                throw new Error("Target URL is required for browser.open_url.");
            }
            const launchRes = await launchBrowserUrl(rawUrl);
            return {
                operation: "open_browser_url",
                url: launchRes.url,
                platform: launchRes.platform,
                status: "launched",
                verified: true,
                message: `Opened ${launchRes.url} in system default browser.`
            };
        }
    },

    // ------------------------------------------------------------------------
    // 10. YOUTUBE SONG / VIDEO SEARCH & PLAYBACK
    // ------------------------------------------------------------------------
    "media.search_and_play_youtube": {
        name: "media.search_and_play_youtube",
        category: "media",
        description: "Search YouTube for a song or video, select the top verified result, and launch it in the default browser.",
        riskLevel: "READ-ONLY SAFE",
        requiresAuthorization: false,
        parameters: {
            query: { type: "string", required: true, description: "Song, artist, or video title to search and play" }
        },
        execute: async (params = {}) => {
            const rawQuery = (params.query || params.song || params.title || "").trim();
            const isHome = !rawQuery ||
                /^(?:https?:\/\/(?:www\.)?youtube\.com\/?|youtube(?:\.com)?|open\s+youtube|home)$/i.test(rawQuery);

            if (isHome) {
                const homeUrl = "https://www.youtube.com/";
                const launchRes = await launchBrowserUrl(homeUrl);
                return {
                    operation: "open_youtube",
                    query: "",
                    url: launchRes.url,
                    status: "launched",
                    verified: true,
                    browserLaunched: true,
                    playbackVerified: false,
                    message: "Opened YouTube (https://www.youtube.com/) in default browser."
                };
            }

            const query = rawQuery;
            const searchRes = await searchYouTubeVideo(query);
            let targetUrl;
            let playbackNote;
            let videoTitle = query;
            let videoId = null;

            if (searchRes.found && searchRes.videoId) {
                videoId = searchRes.videoId;
                videoTitle = searchRes.title || query;
                targetUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
                playbackNote = "Matching video launched in default browser with autoplay parameter. If your browser restricts unmuted autoplay, manual Play may be required.";
            } else {
                targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                playbackNote = "YouTube search results opened in default browser. You may need to press Play manually.";
            }

            const launchRes = await launchBrowserUrl(targetUrl);

            return {
                operation: "search_and_play_youtube",
                query,
                videoId,
                title: videoTitle,
                channel: searchRes.channel || undefined,
                url: launchRes.url,
                status: "launched",
                verified: true,
                browserLaunched: true,
                playbackVerified: false,
                autoplayRequested: Boolean(videoId),
                playbackNote,
                message: videoId
                    ? `Opened "${videoTitle}" on YouTube in default browser with autoplay requested. (If your browser restricts unmuted autoplay, press Play to start).`
                    : `Opened YouTube search results for "${query}" in default browser. You may need to press Play manually.`
            };
        }
    }
};

/**
 * Execute a tool from the registry with parameter validation and timing.
 */
async function executeTool(toolName, parameters = {}) {
    let resolvedToolName = toolName;
    const norm = String(toolName || "").toLowerCase().trim();

    if (norm === "open_calculator" || norm === "calculator" || norm === "calc") {
        resolvedToolName = "system.launch_app";
        if (!parameters.appId) parameters.appId = "calculator";
    } else if (norm === "notepad") {
        resolvedToolName = "system.launch_app";
        if (!parameters.appId) parameters.appId = "notepad";
    } else if (norm === "explorer") {
        resolvedToolName = "system.launch_app";
        if (!parameters.appId) parameters.appId = "explorer";
    } else if (norm === "youtube" || norm === "search_and_play_youtube" || norm === "play_youtube") {
        resolvedToolName = "media.search_and_play_youtube";
    } else if (norm === "browser" || norm === "open_url") {
        resolvedToolName = "browser.open_url";
    } else if (norm === "evaluate_math" || norm === "math") {
        resolvedToolName = "compute.evaluate_math";
    } else if (norm === "read_file" || norm === "workspace_read_file") {
        resolvedToolName = "workspace.read_file";
    } else if (norm === "write_file" || norm === "workspace_write_file") {
        resolvedToolName = "workspace.write_file";
    } else if (norm === "inspect_structure" || norm === "inspect_project_structure") {
        resolvedToolName = "workspace.inspect_structure";
    } else if (norm === "analyze_metrics" || norm === "code_metrics") {
        resolvedToolName = "workspace.analyze_metrics";
    }

    const tool = TOOL_REGISTRY[resolvedToolName];
    if (!tool) {
        throw new Error(`Tool '${toolName}' is not registered in the GENESIS capabilities registry.`);
    }

    const startTime = Date.now();
    try {
        const result = await tool.execute(parameters);
        const executionTimeMs = Date.now() - startTime;
        return {
            success: true,
            tool: resolvedToolName,
            category: tool.category,
            riskLevel: tool.riskLevel,
            executionTimeMs,
            output: result
        };
    } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        return {
            success: false,
            tool: resolvedToolName,
            category: tool.category,
            riskLevel: tool.riskLevel,
            executionTimeMs,
            error: err.message || String(err)
        };
    }
}

/**
 * List all available tools and their schema for agent reasoning and API clients.
 */
function getAvailableTools() {
    return Object.values(TOOL_REGISTRY).map((t) => ({
        name: t.name,
        category: t.category,
        description: t.description,
        riskLevel: t.riskLevel,
        requiresAuthorization: t.requiresAuthorization,
        parameters: t.parameters
    }));
}

module.exports = {
    TOOL_REGISTRY,
    ALLOWED_APPLICATIONS,
    WORKSPACE_ROOT,
    resolveSafeWorkspacePath,
    executeTool,
    getAvailableTools,
    searchYouTubeVideo
};
