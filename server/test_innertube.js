const https = require('https');

function testInnertube(query) {
    const start = Date.now();
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: "2.20240101.01.00",
                    hl: "en",
                    gl: "US"
                }
            },
            query: query
        });

        const req = https.request({
            hostname: "www.youtube.com",
            path: "/youtubei/v1/search",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                const elapsed = Date.now() - start;
                try {
                    const json = JSON.parse(data);
                    // Find videoRenderer
                    const str = JSON.stringify(json);
                    const matchId = str.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                    const matchTitle = str.match(/"title":{"runs":\[{"text":"(.*?)"}\]/);
                    console.log("Innertube response in:", elapsed, "ms, status:", res.statusCode, "videoId:", matchId ? matchId[1] : null, "title:", matchTitle ? matchTitle[1] : null);
                    resolve({ elapsed, found: Boolean(matchId), videoId: matchId ? matchId[1] : null, title: matchTitle ? matchTitle[1] : null });
                } catch (e) {
                    console.error("Parse error:", e);
                    resolve({ elapsed, found: false });
                }
            });
        });

        req.on("error", (e) => {
            console.error("Req error:", e);
            resolve({ found: false });
        });
        req.write(postData);
        req.end();
    });
}

testInnertube("Believer").then(r => console.log("Final:", r));
