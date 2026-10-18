const { spawn } = require("child_process");

function testLaunch(url) {
    return new Promise((resolve, reject) => {
        // Test explorer or cmd
        const proc = spawn("cmd.exe", ["/c", "start", '""', `"${url}"`], {
            windowsVerbatimArguments: true,
            stdio: "pipe"
        });

        let stderr = "";
        proc.stderr?.on("data", (d) => { stderr += d.toString(); });

        proc.on("error", (err) => {
            reject(new Error(`Spawn error: ${err.message}`));
        });

        proc.on("close", (code) => {
            console.log("Process closed with code:", code, "stderr:", stderr);
            if (code !== 0) {
                reject(new Error(`Browser launch failed with exit code ${code}: ${stderr}`));
            } else {
                resolve({ launched: true, code });
            }
        });
    });
}

testLaunch("https://www.example.com")
    .then((res) => console.log("Success:", res))
    .catch((err) => console.error("Error:", err));
