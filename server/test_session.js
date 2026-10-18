const { execSync } = require('child_process');

const ps = `
$currSession = [System.Diagnostics.Process]::GetCurrentProcess().SessionId
$expSession = (Get-Process -Name explorer -ErrorAction SilentlyContinue | Select-Object -First 1).SessionId
Write-Output "CURR_SESSION: $currSession, EXPLORER_SESSION: $expSession"
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
