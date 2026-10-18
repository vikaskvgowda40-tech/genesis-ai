function extractYouTubeSongQuery(userPrompt) {
    if (!userPrompt || typeof userPrompt !== 'string') return '';
    const clean = userPrompt.trim();
    const lower = clean.toLowerCase();

    const openPlayMatch = clean.match(/(?:open\s+youtube\s+(?:and|to)\s+(?:play|listen\s+to|stream|search(?:\s+for)?)|play\s+on\s+youtube)\s+(.+)/i);
    if (openPlayMatch && openPlayMatch[1]) {
        let q = openPlayMatch[1].trim().replace(/[.!?,;]+$/, '').trim();
        q = q.replace(/^["']|["']$/g, '').trim();
        q = q.replace(/^(?:a|the)\s+/i, '').trim();
        if (q) return q;
    }

    const playOnYtMatch = clean.match(/(?:play|stream|listen\s+to)\s+(.+?)\s+(?:on|in|using)\s+youtube/i);
    if (playOnYtMatch && playOnYtMatch[1]) {
        let q = playOnYtMatch[1].trim().replace(/[.!?,;]+$/, '').trim();
        q = q.replace(/^["']|["']$/g, '').trim();
        q = q.replace(/^(?:a|the)\s+/i, '').trim();
        if (q) return q;
    }

    if (/search\s+for\s+(?:a\s+)?song\s+on\s+youtube\s+and\s+play/i.test(clean)) {
        return 'top trending hit songs';
    }

    const playMatch = clean.match(/(?:play|stream|listen\s+to)\s+(?:a\s+|the\s+)?(["'][^"']+["']|[a-zA-Z0-9\s]+?)(?:\s+(?:on|in|using)\s+youtube|\s+song|\s+video|\s+track|$)/i);
    if (playMatch && playMatch[1]) {
        let q = playMatch[1].trim().replace(/^["']|["']$/g, '');
        if (!q.toLowerCase().includes('result') && !q.toLowerCase().includes('selected')) {
            if (lower.includes('kannada') && !q.toLowerCase().includes('kannada')) {
                return 'Kannada song';
            }
            return q;
        }
    }

    if (lower.includes('kannada')) {
        return 'Kannada song';
    }

    return '';
}

console.log('1:', JSON.stringify(extractYouTubeSongQuery('Open YouTube')));
console.log('2:', JSON.stringify(extractYouTubeSongQuery('Open YouTube and play Believer')));
console.log('3:', JSON.stringify(extractYouTubeSongQuery('Open YouTube and play a Kannada song')));
console.log('4:', JSON.stringify(extractYouTubeSongQuery('Play Bohemian Rhapsody on YouTube')));
console.log('5:', JSON.stringify(extractYouTubeSongQuery('Search for a song on YouTube and play the selected result')));
console.log('6:', JSON.stringify(extractYouTubeSongQuery('open youtube')));
