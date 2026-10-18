const https = require('https');

function testYT(query) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return new Promise((resolve) => {
        let settled = false;
        let req;
        const overallTimer = setTimeout(() => {
            console.log("Timed out after 3000ms");
            finish({ found: false, searchUrl });
        }, 3000);

        const finish = (result) => {
            if (!settled) {
                settled = true;
                clearTimeout(overallTimer);
                if (req) {
                    try { req.destroy(); } catch (_) {}
                }
                resolve(result);
            }
        };

        req = https.get(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 3000
        }, (res) => {
            let html = "";
            res.on("data", chunk => {
                if (settled) return;
                html += chunk;

                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    let title = query;
                    const titleMatch = html.match(/"title":{"runs":\[{"text":"(.*?)"}\]/) || html.match(/"title":{"simpleText":"(.*?)"}/);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1];
                    }
                    console.log("Matched stream at length:", html.length, "id:", idMatch[1], "title:", title);
                    return finish({ found: true, videoId: idMatch[1], title });
                }
            });

            res.on("end", () => {
                if (settled) return;
                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    return finish({ found: true, videoId: idMatch[1], title: query });
                }
                finish({ found: false, searchUrl });
            });
        });

        req.on("error", (e) => {
            console.log("req error:", e.message);
            finish({ found: false, searchUrl });
        });
        req.on("timeout", () => {
            console.log("req timeout");
            finish({ found: false, searchUrl });
        });
    });
}

testYT("Kannada song").then(r => console.log("Final:", r));
