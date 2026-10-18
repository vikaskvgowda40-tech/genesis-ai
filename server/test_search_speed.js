const https = require('https');
const zlib = require('zlib');

function searchYouTubeVideoFast(query) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return new Promise((resolve) => {
        let settled = false;
        let req;
        const start = Date.now();
        const overallTimer = setTimeout(() => {
            finish({ found: false, searchUrl, time: Date.now() - start });
        }, 4500);

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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 4500
        }, (res) => {
            const isGzip = res.headers["content-encoding"] === "gzip";
            const isDeflate = res.headers["content-encoding"] === "deflate";
            let stream = res;
            if (isGzip) {
                const gunzip = zlib.createGunzip();
                res.pipe(gunzip);
                stream = gunzip;
            } else if (isDeflate) {
                const inflate = zlib.createInflate();
                res.pipe(inflate);
                stream = inflate;
            }

            let html = "";
            stream.on("data", chunk => {
                if (settled) return;
                html += chunk.toString();

                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    let title = query;
                    const titleMatch = html.match(/"title":{"runs":\[{"text":"(.*?)"}\]/) || html.match(/"title":{"simpleText":"(.*?)"}/);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1];
                    }
                    return finish({ found: true, videoId: idMatch[1], title, time: Date.now() - start });
                }
            });

            stream.on("end", () => {
                if (settled) return;
                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    return finish({ found: true, videoId: idMatch[1], title: query, time: Date.now() - start });
                }
                finish({ found: false, searchUrl, time: Date.now() - start });
            });
        });

        req.on("error", () => finish({ found: false, searchUrl, time: Date.now() - start }));
        req.on("timeout", () => finish({ found: false, searchUrl, time: Date.now() - start }));
    });
}

async function run() {
    console.log("Searching 'Kannada song'...");
    const r1 = await searchYouTubeVideoFast("Kannada song");
    console.log("Result 1:", r1);

    console.log("Searching 'Believer Imagine Dragons'...");
    const r2 = await searchYouTubeVideoFast("Believer Imagine Dragons");
    console.log("Result 2:", r2);
}

run();
