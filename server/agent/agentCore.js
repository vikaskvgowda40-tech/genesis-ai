const fs = require("fs");
const { TOOL_REGISTRY, executeTool, getAvailableTools, resolveSafeWorkspacePath } = require("../tools/toolRegistry");

/**
 * Identify the category and intent of a user's request.
 */
function classifyIntent(text = "", hasImage = false) {
    if (!text || typeof text !== "string") {
        return { category: hasImage ? "IMAGE_ANALYSIS" : "CONVERSATION", confidence: 1.0 };
    }

    const lower = text.toLowerCase().trim();

    // 1. Check for pure arithmetic / calculation
    const mathPattern = /^[\d\s+\-*/().,%^sqrtincoaplgPI]+$/i;
    const mathKeywords = ["calculate", "evaluate", "what is", "how much is", "solve", "math", "add", "sum", "plus", "times", "multiplied", "divided", "ಲೆಕ್ಕ"];
    const isExplicitMath = mathKeywords.some((k) => lower.startsWith(k)) && /[\d+\-*/]/.test(lower);
    if ((mathPattern.test(lower) && /[\d]/.test(lower) && /[+\-*/]/.test(lower)) || (isExplicitMath && /[\d]/.test(lower))) {
        return { category: "CALCULATION", goal: "Perform mathematical computation", confidence: 0.95 };
    }

    // 2. Check for vague requests needing clarification
    const vaguePatterns = [
        /^create a file$/i,
        /^write a file$/i,
        /^make a document$/i,
        /^open an app$/i,
        /^launch app$/i,
        /^start program$/i,
        /^save file$/i,
        /^(open|launch|run|start|view|read|write|create|make|save|delete)\s+(it|this|that|something)(\s+now)?$/i
    ];
    if (vaguePatterns.some((p) => p.test(lower))) {
        const question = "Please specify which application, file, or parameters you would like GENESIS to work with.";
        return {
            category: "CLARIFICATION_NEEDED",
            goal: "Request missing details from user",
            clarifyingQuestion: question,
            clarificationPrompt: question,
            confidence: 0.98
        };
    }

    // 3. Multi-step keywords or compound conjunctions indicating combined instructions
    const multiStepIndicators = [
        " and then ", " then ", " and also ", " after that ", " next ", " finally ",
        "as well as", "followed by", " ಮತ್ತು ", " ಆಮೇಲೆ ", " और फिर ", " பிறகு ", " తరువాత "
    ];
    const hasConjunction = multiStepIndicators.some((ind) => lower.includes(ind));

    // Action verbs
    const actionVerbs = [
        "open", "launch", "write", "create", "generate file", "inspect", "count",
        "calculate", "save", "scan", "check environment", "metrics", "read file",
        "play", "search", "navigate", "browse", "visit", "verify", "song", "youtube",
        "explorer", "calculator", "notepad", "add", "multiply",
        "ತೆರೆಯಿರಿ", "ಬರೆಯಿರಿ", "ಹಾಡು", "ನುಡಿಸಿ", "खोलो", "बनाओ", "गाना", "திறக்கவும்", "రాయండి"
    ];
    const matchedVerbs = actionVerbs.filter((v) => lower.includes(v));

    if (hasConjunction || matchedVerbs.length >= 2) {
        return { category: "MULTI_STEP_TASK", goal: text, confidence: 0.9 };
    }

    if (matchedVerbs.length === 1) {
        return { category: "SINGLE_ACTION", goal: text, confidence: 0.85 };
    }

    if (hasImage) {
        return { category: "IMAGE_ANALYSIS", goal: "Analyze visual image content", confidence: 0.95 };
    }

    return { category: "CONVERSATION", goal: "Engage in conversational reasoning", confidence: 0.85 };
}

/**
 * Generate an ordered execution plan for a user request using Gemini AI
 * or deterministic local fallback if offline/rate-limited.
 */
/**
 * Normalize tool aliases and legacy tool names to registered tool names.
 */
function normalizeToolName(toolName) {
    if (!toolName) return toolName;
    const norm = String(toolName).toLowerCase().trim();
    if (norm === "open_calculator" || norm === "calculator" || norm === "calc") {
        return "system.launch_app";
    }
    if (norm === "notepad") {
        return "system.launch_app";
    }
    if (norm === "explorer") {
        return "system.launch_app";
    }
    if (norm === "youtube" || norm === "search_and_play_youtube" || norm === "play_youtube") {
        return "media.search_and_play_youtube";
    }
    if (norm === "browser" || norm === "open_url") {
        return "browser.open_url";
    }
    if (norm === "evaluate_math" || norm === "math") {
        return "compute.evaluate_math";
    }
    if (norm === "read_file" || norm === "workspace_read_file") {
        return "workspace.read_file";
    }
    if (norm === "write_file" || norm === "workspace_write_file") {
        return "workspace.write_file";
    }
    if (norm === "inspect_structure" || norm === "inspect_project_structure") {
        return "workspace.inspect_structure";
    }
    if (norm === "analyze_metrics" || norm === "code_metrics") {
        return "workspace.analyze_metrics";
    }
    return toolName;
}

/**
 * Generate an ordered execution plan for a user request using Gemini AI
 * or deterministic local fallback if offline/rate-limited.
 */
async function generatePlan(userPrompt, intent, aiInstance, modelName = "gemini-3.8-flash", context = {}) {
    const tools = getAvailableTools();
    const toolsDescription = tools
        .map((t) => `- ${t.name}: ${t.description} (Risk: ${t.riskLevel}, Auth Required: ${t.requiresAuthorization})`)
        .join("\n");

    const systemInstruction = `You are the GENESIS AI Task Planner.
Your role is to understand the user's natural language request, preserve ALL parts of their request, and decompose it into an ordered plan of small, understandable, and verifiable steps.

AVAILABLE TOOLS IN GENESIS REGISTRY:
${toolsDescription}

CRITICAL RULES:
1. NEVER discard later steps when an earlier step is recognized. If the user asks for multiple actions (e.g. "open calculator and add 250 and 350"), create steps for ALL of them.
2. If a request involves calculations or arithmetic (e.g. "add 250 and 350", "calculate 144 times 25"), use tool "compute.evaluate_math" with the expression.
3. If a request asks to open desktop calculator alongside arithmetic, include BOTH "compute.evaluate_math" and "system.launch_app" (with appId "calculator" and expression).
4. If a request asks ONLY to open YouTube (e.g. "Open YouTube"), use tool "browser.open_url" with url "https://www.youtube.com/".
5. If a request asks to open YouTube and play or search a song or video (e.g. "Open YouTube and play [song]"), use tool "media.search_and_play_youtube" with the song or video query parameter.
6. If a request asks to open a website or browser URL, use tool "browser.open_url" with the url parameter.
6. If a request involves writing or creating a document/note/letter (e.g. leave letter, notes), use tool "workspace.write_file" with filePath and content.
7. If a request asks to open Notepad and write a letter/document, include BOTH "workspace.write_file" (step 1) and "system.launch_app" with appId "notepad" and filePath (step 2).
8. If a request asks to open File Explorer or navigate to a project folder, use tool "system.launch_app" with appId "explorer".
9. If a request asks to create a file and verify it, include BOTH "workspace.write_file" (step 1) and "workspace.read_file" (step 2) to verify it on disk.
10. Low-risk allowlisted actions (opening Calculator, Notepad, File Explorer, opening websites, YouTube playback, math calculations, and writing NEW files) execute automatically with requiresAuthorization: false. Overwriting existing files requires confirmation.
11. If the request is purely informational/conversational, return an empty steps array and explain the answer.
12. Output MUST be valid JSON adhering strictly to this schema:
{
  "goal": "High-level goal description",
  "category": "CONVERSATION" | "CALCULATION" | "SINGLE_ACTION" | "MULTI_STEP_TASK" | "IMAGE_ANALYSIS" | "CLARIFICATION_NEEDED",
  "explanation": "Brief explanation of how GENESIS will address this request",
  "steps": [
    {
      "stepId": "step-1",
      "title": "Concise step title",
      "description": "Clear explanation of what this step does",
      "tool": "tool.name",
      "parameters": { ... },
      "requiresAuthorization": true | false
    }
  ]
}`;

    // Fast-path: Check deterministic multi-step plan first for instant (<1ms) response
    const fastPlan = buildFallbackPlan(userPrompt, intent);
    if (fastPlan && Array.isArray(fastPlan.steps) && fastPlan.steps.length > 0) {
        return fastPlan;
    }

    if (aiInstance) {
        const candidateModels = Array.from(new Set([modelName || "gemini-3.8-flash", "gemini-3.8-flash"]));
        for (const candidate of candidateModels) {
            try {
                const prompt = `${systemInstruction}

USER REQUEST: "${userPrompt}"
HAS IMAGE ATTACHED: ${Boolean(context.hasImage)}
USER LANGUAGE: ${context.language || "en-IN"}

Respond with ONLY valid JSON:`;

                const resPromise = aiInstance.models.generateContent({
                    model: candidate,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json"
                    }
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Plan generation timeout")), 3500)
                );

                const res = await Promise.race([resPromise, timeoutPromise]);

                const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
                        // Enrich steps with initial status, strict authorization flags, and normalized parameters
                        parsed.steps = parsed.steps.map((s, idx) => {
                            const resolvedTool = normalizeToolName(s.tool);
                            const toolDef = TOOL_REGISTRY[resolvedTool];
                            let requiresAuth = toolDef ? Boolean(toolDef.requiresAuthorization) : Boolean(s.requiresAuthorization);
                            const params = { ...(s.parameters || {}) };

                            if (resolvedTool === "system.launch_app") {
                                if (!params.appId) {
                                    const rawTool = String(s.tool).toLowerCase();
                                    if (rawTool.includes("calc")) params.appId = "calculator";
                                    else if (rawTool.includes("notepad")) params.appId = "notepad";
                                    else if (rawTool.includes("explorer")) params.appId = "explorer";
                                    else params.appId = "calculator";
                                }
                                requiresAuth = false;
                            } else if (resolvedTool === "media.search_and_play_youtube") {
                                requiresAuth = false;
                                if (!params.query && params.song) params.query = params.song;
                            } else if (resolvedTool === "browser.open_url") {
                                requiresAuth = false;
                            } else if (resolvedTool === "compute.evaluate_math") {
                                requiresAuth = false;
                            } else if (resolvedTool === "workspace.write_file") {
                                params.filePath = params.filePath || params.path || params.filename || params.targetPath || "notes/summary.md";
                                if (params.content === undefined || params.content === null) {
                                    params.content = params.text || params.body || params.data || `# GENESIS AI — Verified Document\nTarget: ${params.filePath}\nCreated: ${new Date().toISOString()}`;
                                }
                                // Check if destination file already exists (overwriting requires confirmation; new file does not)
                                try {
                                    const { resolved } = resolveSafeWorkspacePath(params.filePath);
                                    requiresAuth = fs.existsSync(resolved);
                                } catch (_) {
                                    requiresAuth = false;
                                }
                            }

                            return {
                                ...s,
                                stepId: s.stepId || `step-${idx + 1}`,
                                tool: resolvedTool,
                                parameters: params,
                                requiresAuthorization: requiresAuth,
                                status: "pending",
                                result: null,
                                error: null
                            };
                        });
                        return parsed;
                    }
                }
            } catch (err) {
                console.warn(`AI planner [${candidate}] fallback note:`, err.message || err);
            }
        }
    }

    // Deterministic Rule-Based Fallback Planner (guarantees multi-step requests always work)
    return buildFallbackPlan(userPrompt, intent);
}

/**
 * Deterministic multi-step task decomposition fallback.
 * Ensures zero loss of later steps even if Gemini API is rate-limited or offline.
 */
function buildFallbackPlan(userPrompt = "", intent) {
    const lower = userPrompt.toLowerCase().trim();
    const steps = [];

    // 1. Check for Math expressions or calculations (e.g., "calculate 75 * 40 + 500", "add 250 and 350", "calculate 144 times 25", "250 + 350")
    let detectedMathExpr = null;
    const explicitMath = lower.match(/(?:calculate|solve|what is|how much is|evaluate)\s+([\d\s+\-*/().,%^sqrtincoaplgx]+)/i);
    if (explicitMath && explicitMath[1] && /[\d]/.test(explicitMath[1])) {
        detectedMathExpr = explicitMath[1].trim();
    } else {
        const explicitAdd = lower.match(/\badd\s+(\d+(?:\.\d+)?)\s+(?:and|to|\+)\s+(\d+(?:\.\d+)?)/i);
        if (explicitAdd) {
            detectedMathExpr = `${explicitAdd[1]} + ${explicitAdd[2]}`;
        } else {
            const explicitMultiply = lower.match(/(\d+(?:\.\d+)?)\s*(?:times|multiplied\s+by|\*|x)\s*(\d+(?:\.\d+)?)/i);
            if (explicitMultiply) {
                detectedMathExpr = `${explicitMultiply[1]} * ${explicitMultiply[2]}`;
            } else {
                const genericMath = lower.match(/(\d+(?:\.\d+)?\s*[+\-*/]\s*\d+(?:\.\d+)?)/);
                if (genericMath) {
                    detectedMathExpr = genericMath[1].trim();
                }
            }
        }
    }

    if (detectedMathExpr) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: `Compute "${detectedMathExpr}"`,
            description: "Perform verified local mathematical evaluation without shell invocation.",
            tool: "compute.evaluate_math",
            parameters: { expression: detectedMathExpr },
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 2. Check for Calculator intent
    const hasCalc = /\b(?:calculator|calc)\b/i.test(lower) || lower.includes("ಕ್ಯಾಲ್ಕುಲೇಟರ್") || lower.includes("कैलकुलेटर");
    if (hasCalc) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Launch Windows Calculator",
            description: detectedMathExpr
                ? `Open native Calculator utility and enter "${detectedMathExpr}".`
                : "Open the native Calculator utility safely via verified allowlist.",
            tool: "system.launch_app",
            parameters: {
                appId: "calculator",
                ...(detectedMathExpr ? { expression: detectedMathExpr } : {})
            },
            requiresAuthorization: false,
            status: "pending"
        });
    }

/**
 * Extract song or video query from user prompt for YouTube playback.
 */
function extractYouTubeSongQuery(userPrompt) {
    if (!userPrompt || typeof userPrompt !== "string") return "";
    const clean = userPrompt.trim();
    const lower = clean.toLowerCase();

    // 1. "Open YouTube and play [song]" or "Open YouTube to play [song]"
    const openPlayMatch = clean.match(/(?:open\s+youtube\s+(?:and|to)\s+(?:play|listen\s+to|stream|search(?:\s+for)?)|play\s+on\s+youtube)\s+(.+)/i);
    if (openPlayMatch && openPlayMatch[1]) {
        let q = openPlayMatch[1].trim().replace(/[.!?,;]+$/, "").trim();
        q = q.replace(/^["']|["']$/g, "").trim();
        q = q.replace(/^(?:a|the)\s+/i, "").trim();
        if (q) return q;
    }

    // 2. "Play [song] on YouTube" or "Play [song] in YouTube"
    const playOnYtMatch = clean.match(/(?:play|stream|listen\s+to)\s+(.+?)\s+(?:on|in|using)\s+youtube/i);
    if (playOnYtMatch && playOnYtMatch[1]) {
        let q = playOnYtMatch[1].trim().replace(/[.!?,;]+$/, "").trim();
        q = q.replace(/^["']|["']$/g, "").trim();
        q = q.replace(/^(?:a|the)\s+/i, "").trim();
        if (q) return q;
    }

    // 3. "Search for a song on YouTube and play the selected result" -> fallback
    if (/search\s+for\s+(?:a\s+)?song\s+on\s+youtube\s+and\s+play/i.test(clean)) {
        return "top trending hit songs";
    }

    // 4. "Play [song]" (when YouTube is in context)
    const playMatch = clean.match(/(?:play|stream|listen\s+to)\s+(?:a\s+|the\s+)?(["'][^"']+["']|[a-zA-Z0-9\s]+?)(?:\s+(?:on|in|using)\s+youtube|\s+song|\s+video|\s+track|$)/i);
    if (playMatch && playMatch[1]) {
        let q = playMatch[1].trim().replace(/^["']|["']$/g, "");
        if (!q.toLowerCase().includes("result") && !q.toLowerCase().includes("selected")) {
            if (lower.includes("kannada") && !q.toLowerCase().includes("kannada")) {
                return "Kannada song";
            }
            return q;
        }
    }

    if (lower.includes("kannada")) {
        return "Kannada song";
    }

    return "";
}

    // 3. Check for YouTube / Song Playback intent
    const hasYouTube = lower.includes("youtube") || lower.includes("song") || lower.includes("ಹಾಡು") || lower.includes("गाना") || (lower.includes("play") && !lower.includes("calculator"));
    if (hasYouTube && !lower.includes("notepad") && !lower.includes("leave letter")) {
        const songQuery = extractYouTubeSongQuery(userPrompt);
        if (!songQuery && (lower.includes("youtube") || lower.includes("ಯೂಟ್ಯೂಬ್"))) {
            // User requested ONLY to open YouTube without specific playback/search query
            steps.push({
                stepId: `step-${steps.length + 1}`,
                title: "Open YouTube",
                description: "Open https://www.youtube.com/ in default browser.",
                tool: "browser.open_url",
                parameters: { url: "https://www.youtube.com/" },
                requiresAuthorization: false,
                status: "pending"
            });
        } else {
            const query = songQuery || "Kannada song";
            steps.push({
                stepId: `step-${steps.length + 1}`,
                title: `Search & Play "${query}" on YouTube`,
                description: `Search YouTube for "${query}", extract top matching video, and launch in default browser.`,
                tool: "media.search_and_play_youtube",
                parameters: { query },
                requiresAuthorization: false,
                status: "pending"
            });
        }
    }

    // 4. Check for Notepad intent & Leave Letter
    const hasNotepad = lower.includes("notepad") || lower.includes("text editor") || lower.includes("ನೋಟ್‌ಪ್ಯಾಡ್") || lower.includes("नोटपैड");
    const hasLeaveLetter = lower.includes("leave letter") || lower.includes("leave application") || lower.includes("leave note");

    if (hasNotepad && hasLeaveLetter) {
        const leaveLetterPath = "leave_letter.txt";
        const todayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const leaveLetterContent = `LEAVE APPLICATION

Date: ${todayDate}
To: Department Lead / Management
Subject: Request for Leave of Absence

Dear Sir/Madam,

I am writing to formally request a short leave of absence from duties.
I have ensured that all my immediate project responsibilities are updated, documented, and properly handed over to the team.
I will resume my regular responsibilities promptly upon return.

Thank you for your understanding.

Sincerely,
Team Member`;

        let leaveLetterExists = false;
        try {
            const { resolved } = resolveSafeWorkspacePath(leaveLetterPath);
            leaveLetterExists = fs.existsSync(resolved);
        } catch (_) {}

        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: `Draft Leave Letter in '${leaveLetterPath}'`,
            description: `Create structured formal leave letter in '${leaveLetterPath}'.`,
            tool: "workspace.write_file",
            parameters: {
                filePath: leaveLetterPath,
                content: leaveLetterContent
            },
            requiresAuthorization: leaveLetterExists,
            status: "pending"
        });

        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Open Leave Letter in Windows Notepad",
            description: "Launch native Notepad application displaying the created leave letter.",
            tool: "system.launch_app",
            parameters: {
                appId: "notepad",
                filePath: leaveLetterPath
            },
            requiresAuthorization: false,
            status: "pending"
        });
    } else if (hasNotepad) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Launch Windows Notepad",
            description: "Open native text editor for notes and document writing.",
            tool: "system.launch_app",
            parameters: { appId: "notepad" },
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 5. Check for File Explorer / Project folder intent
    const hasExplorer = lower.includes("explorer") || lower.includes("project folder") || lower.includes("project directory") || lower.includes("workspace folder") || lower.includes("navigate to my project");
    if (hasExplorer) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Open Project in File Explorer",
            description: "Launch native Windows File Explorer navigated to the project workspace directory.",
            tool: "system.launch_app",
            parameters: { appId: "explorer" },
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 6. Check for Web Browser / Website opening intent
    const hasBrowser = (lower.includes("website") || lower.includes("browser") || lower.includes("open url") || /\bhttps?:\/\/\S+/i.test(userPrompt)) && !hasYouTube;
    if (hasBrowser) {
        let targetUrl = "https://www.google.com";
        const urlMatch = userPrompt.match(/\b(https?:\/\/[^\s"'<>]+)/i);
        if (urlMatch && urlMatch[1]) {
            targetUrl = urlMatch[1].trim();
        } else {
            const domainMatch = userPrompt.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|io|dev|in|edu|gov))\b/i);
            if (domainMatch && domainMatch[1]) {
                targetUrl = `https://${domainMatch[1]}`;
            }
        }

        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: `Open Website "${targetUrl}" in Browser`,
            description: "Launch target URL in system default web browser.",
            tool: "browser.open_url",
            parameters: { url: targetUrl },
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 7. Check for code metrics / line count
    if (lower.includes("line count") || lower.includes("metrics") || lower.includes("count lines") || lower.includes("analyze code")) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Analyze Codebase Metrics",
            description: "Scan src/ directory and calculate total files and source lines of code.",
            tool: "workspace.analyze_metrics",
            parameters: {},
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 8. Check for directory structure
    if (lower.includes("structure") || lower.includes("hierarchy") || lower.includes("list files") || lower.includes("inspect workspace")) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Inspect Project Hierarchy",
            description: "Inspect workspace folders and files safely with credentials filtered.",
            tool: "workspace.inspect_structure",
            parameters: { maxDepth: 2 },
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 9. Check for dev environment
    if (lower.includes("environment") || lower.includes("specs") || lower.includes("system info") || lower.includes("runtime")) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: "Inspect Runtime Environment",
            description: "Query Node.js, platform specs, and memory allocation safely.",
            tool: "system.get_environment",
            parameters: {},
            requiresAuthorization: false,
            status: "pending"
        });
    }

    // 10. Check for generic document, file, report, or summary creation (workspace.write_file)
    const isWriteIntent = lower.includes("workspace.write_file") ||
        lower.includes("write_file") ||
        /\b(?:write|create|save|generate|make|store)\s+(?:a\s+)?(?:file|note|document|report|summary|text\s+file|workspace\s+file)\b/i.test(userPrompt) ||
        /\b(?:write|save|export)\s+to\s+[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+\b/i.test(userPrompt) ||
        /\b(?:write|create|save)\s+["']?[a-zA-Z0-9_\-./]+\.(?:txt|md|json|js|jsx|css|html|log|csv)["']?/i.test(userPrompt) ||
        lower.includes("ಬರೆಯಿರಿ") || lower.includes("ರಚಿಸಿ") || lower.includes("लिखो") || lower.includes("बनाओ");

    if (isWriteIntent && !(hasNotepad && hasLeaveLetter)) {
        // Extract target file path
        let targetPath = null;

        // 1. Check for explicit parameter syntax: filePath=... or path=...
        const explicitPathMatch = userPrompt.match(/(?:filePath|path|filename|file|target)[:=\s]+["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
        if (explicitPathMatch && explicitPathMatch[1]) {
            targetPath = explicitPathMatch[1].trim();
        }

        // 2. Check for prepositional path: named notes.txt, to notes.txt, into notes.txt
        if (!targetPath) {
            const prepMatch = userPrompt.match(/(?:named|to|called|into|in)\s+["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
            if (prepMatch && prepMatch[1]) {
                targetPath = prepMatch[1].trim();
            }
        }

        // 3. Check for verb + filename: create notes.txt, write notes.txt, write file notes.txt
        if (!targetPath) {
            const verbFileMatch = userPrompt.match(/(?:write|create|save|generate|make)\s+(?:a\s+)?(?:(?:file|note|document|report|summary|text\s+file)\s+)?(?:(?:named|to|called|in|into)\s+)?["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
            if (verbFileMatch && verbFileMatch[1]) {
                targetPath = verbFileMatch[1].trim();
            }
        }

        // 4. Any file-like pattern with extension
        if (!targetPath) {
            const anyFileMatch = userPrompt.match(/\b([a-zA-Z0-9_\-./]+\.(?:txt|md|json|js|jsx|css|html|log|csv))\b/i);
            if (anyFileMatch && anyFileMatch[1]) {
                targetPath = anyFileMatch[1].trim();
            }
        }

        // Default if unspecified
        if (!targetPath) {
            targetPath = "notes/summary.md";
        }

        // Extract proposed content
        let proposedContent = null;

        // 1. Check for explicit content=... or text=...
        const explicitContentMatch = userPrompt.match(/(?:content|text|body|data)[:=]\s*["']?([\s\S]+?)["']?$/i);
        if (explicitContentMatch && explicitContentMatch[1]) {
            proposedContent = explicitContentMatch[1].trim().replace(/^["']|["']$/g, "");
        }

        // 2. Check for with content ... or containing ...
        if (!proposedContent) {
            const withContentMatch = userPrompt.match(/(?:with\s+content|containing|with\s+text|with\s+body|says?|saying)\s*[:=]?\s*["']?([\s\S]+?)["']?$/i);
            if (withContentMatch && withContentMatch[1]) {
                proposedContent = withContentMatch[1].trim().replace(/^["']|["']$/g, "");
            }
        }

        // 3. Check for quoted string not matching target path
        if (!proposedContent) {
            const quotedMatches = userPrompt.match(/["']([^"']{2,})["']/g);
            if (quotedMatches) {
                for (const q of quotedMatches) {
                    const cleanQ = q.replace(/^["']|["']$/g, "").trim();
                    if (cleanQ !== targetPath && !cleanQ.endsWith(".txt") && !cleanQ.endsWith(".md")) {
                        proposedContent = cleanQ;
                        break;
                    }
                }
            }
        }

        // Default meaningful summary content if none specified
        if (!proposedContent) {
            proposedContent = `# GENESIS AI — Workspace Document\nTarget: ${targetPath}\nCreated: ${new Date().toISOString()}\nUser Request: ${userPrompt}\n\nStatus: Verified Non-Destructive Workspace Note.`;
        }

        let fileExists = false;
        try {
            const { resolved } = resolveSafeWorkspacePath(targetPath);
            fileExists = fs.existsSync(resolved);
        } catch (_) {}

        steps.push({
            stepId: `step-${steps.length + 1}`,
            title: `Write File '${targetPath}'`,
            description: fileExists
                ? `Overwriting existing file '${targetPath}' (requires operator confirmation).`
                : `Safely create new workspace file '${targetPath}'.`,
            tool: "workspace.write_file",
            parameters: {
                filePath: targetPath,
                content: proposedContent
            },
            requiresAuthorization: fileExists,
            status: "pending"
        });

        // Check if user requested verification of the file
        const needsVerification = lower.includes("verify") || lower.includes("check it") || lower.includes("confirm");
        if (needsVerification) {
            steps.push({
                stepId: `step-${steps.length + 1}`,
                title: `Verify File '${targetPath}'`,
                description: `Read back '${targetPath}' to verify file size, lines, and content on disk.`,
                tool: "workspace.read_file",
                parameters: { filePath: targetPath },
                requiresAuthorization: false,
                status: "pending"
            });
        }
    }

    // Ensure all steps have strict authorization attributes synchronized
    const finalizedSteps = steps.map((s, idx) => {
        const resolvedTool = normalizeToolName(s.tool);
        const toolDef = TOOL_REGISTRY[resolvedTool];
        let reqAuth = s.requiresAuthorization !== undefined
            ? Boolean(s.requiresAuthorization)
            : (toolDef ? Boolean(toolDef.requiresAuthorization) : false);

        if (resolvedTool === "workspace.write_file" && s.parameters?.filePath) {
            try {
                const { resolved } = resolveSafeWorkspacePath(s.parameters.filePath);
                reqAuth = fs.existsSync(resolved);
            } catch (_) {}
        } else if (resolvedTool === "system.launch_app" || resolvedTool === "media.search_and_play_youtube" || resolvedTool === "browser.open_url" || resolvedTool === "compute.evaluate_math") {
            reqAuth = false;
        }

        return {
            ...s,
            stepId: s.stepId || `step-${idx + 1}`,
            tool: resolvedTool,
            requiresAuthorization: reqAuth,
            status: s.status || "pending",
            result: s.result || null,
            error: s.error || null
        };
    });

    const hasSteps = finalizedSteps.length > 0;
    return {
        goal: userPrompt,
        category: hasSteps ? (finalizedSteps.length > 1 ? "MULTI_STEP_TASK" : "SINGLE_ACTION") : "CONVERSATION",
        explanation: hasSteps
            ? `GENESIS formulated an execution plan with ${finalizedSteps.length} verified step(s) to achieve your goal.`
            : "Conversational question analyzed. Reasoning provided below.",
        steps: finalizedSteps
    };
}

/**
 * Execute a specific step within an agent plan, verify the real result,
 * and update step telemetry.
 */
async function executeStep(step, authorized = false) {
    if (!step || !step.tool) {
        throw new Error("Invalid step definition provided for execution.");
    }

    const resolvedTool = normalizeToolName(step.tool);
    const toolDef = TOOL_REGISTRY[resolvedTool];
    if (!toolDef) {
        return {
            ...step,
            tool: resolvedTool,
            status: "failed",
            error: `Tool '${step.tool}' does not exist in the capability registry.`,
            executedAt: new Date().toLocaleTimeString()
        };
    }

    // Safety Authorization Check:
    // Overwriting existing files requires explicit operator confirmation
    let stepRequiresAuth = Boolean(step.requiresAuthorization);
    if (resolvedTool === "workspace.write_file" && step.parameters?.filePath) {
        try {
            const { resolved } = resolveSafeWorkspacePath(step.parameters.filePath);
            if (fs.existsSync(resolved)) {
                stepRequiresAuth = true;
            }
        } catch (_) {}
    } else if (resolvedTool === "system.launch_app" || resolvedTool === "media.search_and_play_youtube" || resolvedTool === "browser.open_url" || resolvedTool === "compute.evaluate_math") {
        stepRequiresAuth = false;
    } else if (toolDef && toolDef.requiresAuthorization) {
        stepRequiresAuth = true;
    }

    if (stepRequiresAuth && !authorized) {
        const message = resolvedTool === "workspace.write_file"
            ? `Overwriting existing file '${step.parameters?.filePath}' requires explicit operator authorization.`
            : `Step '${step.title}' requires explicit operator authorization before execution.`;
        return {
            ...step,
            tool: resolvedTool,
            status: "pending_authorization",
            requiresAuthorization: true,
            message,
            executedAt: new Date().toLocaleTimeString()
        };
    }

    try {
        const execParams = { ...(step.parameters || {}) };
        if (authorized) {
            execParams.isAuthorized = true;
            execParams.authorized = true;
        }

        const execResult = await executeTool(resolvedTool, execParams);

        if (execResult.success && execResult.output) {
            return {
                ...step,
                tool: resolvedTool,
                status: "completed",
                result: execResult.output,
                executionTimeMs: execResult.executionTimeMs,
                executedAt: new Date().toLocaleTimeString(),
                verified: Boolean(execResult.output.verified !== false)
            };
        } else {
            return {
                ...step,
                tool: resolvedTool,
                status: "failed",
                error: execResult.error || "Step execution returned an unverified outcome.",
                executionTimeMs: execResult.executionTimeMs,
                executedAt: new Date().toLocaleTimeString(),
                verified: false
            };
        }
    } catch (err) {
        return {
            ...step,
            tool: resolvedTool,
            status: "failed",
            error: err.message || String(err),
            executedAt: new Date().toLocaleTimeString(),
            verified: false
        };
    }
}

module.exports = {
    classifyIntent,
    generatePlan,
    buildFallbackPlan,
    normalizeToolName,
    executeStep
};
