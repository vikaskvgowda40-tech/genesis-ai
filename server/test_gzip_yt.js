const https = require('https');
const zlib = require('zlib');

function testGzipYT(query) {
    const start = Date.now();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    return new Promise((resolve) => {
        const req = https.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            console.log('HTTP status:', res.statusCode, 'encoding:', res.headers['content-encoding'], 'headers received at:', Date.now() - start);
            
            const isGzip = res.headers['content-encoding'] === 'gzip';
            const stream = isGzip ? res.pipe(zlib.createGunzip()) : res;
            
            let html = '';
            stream.on('data', (chunk) => {
                html += chunk.toString();
                const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (idMatch && idMatch[1]) {
                    let title = query;
                    const titleMatch = html.match(/"title":{"runs":\[{"text":"(.*?)"}\]/) || html.match(/"title":{"simpleText":"(.*?)"}/);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1];
                    }
                    console.log('Found video in stream at:', Date.now() - start, 'ms! VideoId:', idMatch[1], 'Title:', title);
                    try { req.destroy(); } catch (_) {}
                    resolve({ found: true, videoId: idMatch[1], title, time: Date.now() - start });
                }
            });
            
            stream.on('end', () => {
                console.log('Stream ended at:', Date.now() - start, 'ms');
                resolve({ found: false, time: Date.now() - start });
            });
        });
        
        req.on('error', (err) => resolve({ found: false, error: err.message }));
    });
}

testGzipYT("Believer").then(r => console.log("Result:", r));
