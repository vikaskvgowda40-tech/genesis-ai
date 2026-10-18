const { execSync } = require('child_process');

const psScript = `
$wshell = New-Object -ComObject WScript.Shell
$proc = Get-Process -Name "CalculatorApp", "calc" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) {
    Start-Process "calc.exe"
    Start-Sleep -Milliseconds 1200
}

$activated = $wshell.AppActivate("Calculator")
if (-not $activated) {
    $wshell.AppActivate("calc")
}
Start-Sleep -Milliseconds 500

try {
    $wshell.SendKeys("{ESC}")
    Start-Sleep -Milliseconds 200
    $wshell.SendKeys("250{+}350{ENTER}")
    Start-Sleep -Milliseconds 400
    $wshell.SendKeys("^c")
    Start-Sleep -Milliseconds 200
    $val = Get-Clipboard
    Write-Output "WSHELL_SUCCESS: $val"
} catch {
    Write-Output "WSHELL_ERROR: $_"
}
`;

try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8', timeout: 8000 });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
