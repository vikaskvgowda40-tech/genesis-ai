const https = require('https');

const start = Date.now();
const req = https.get('https://www.youtube.com/results?search_query=Kannada+song', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }
}, (res) => {
    console.log('Status code:', res.statusCode, 'Headers:', res.headers['content-type'], 'time:', Date.now() - start);
    let chunks = 0;
    let bytes = 0;
    res.on('data', (c) => {
        chunks++;
        bytes += c.length;
        const idMatch = c.toString().match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (idMatch) {
            console.log('Found videoId in chunk', chunks, 'id:', idMatch[1]);
        }
    });
    res.on('end', () => {
        console.log('Done! Total chunks:', chunks, 'bytes:', bytes, 'total time:', Date.now() - start);
        process.exit(0);
    });
});
req.on('error', (e) => console.error('Req error:', e));
