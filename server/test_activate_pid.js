const { execSync } = require('child_process');

const ps = `
$wshell = New-Object -ComObject WScript.Shell
$proc = Get-Process -Name "CalculatorApp", "calc" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
    $act = $wshell.AppActivate($proc.Id)
    Write-Output "ACTIVATE_BY_PID: $act (PID: $($proc.Id))"
} else {
    Write-Output "NO_PROC"
}
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
