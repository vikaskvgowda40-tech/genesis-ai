const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$wshell = New-Object -ComObject WScript.Shell

# Check if Calculator is running, if not launch it
$proc = Get-Process -Name "CalculatorApp", "calc" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) {
    Start-Process "calc.exe"
    Start-Sleep -Milliseconds 1200
}

# Try activating Calculator window
$activated = $wshell.AppActivate("Calculator")
if (-not $activated) {
    $activated = $wshell.AppActivate("calc")
}

Start-Sleep -Milliseconds 300

# Clear any previous input and send expression
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("250{+}350=")
Start-Sleep -Milliseconds 300

# Copy displayed result
[System.Windows.Forms.SendKeys]::SendWait("^c")
Start-Sleep -Milliseconds 200

$val = Get-Clipboard
Write-Output "CLIPBOARD_RESULT:$val"
`;

try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8', timeout: 8000 });
    console.log('Automation Output:', out);
} catch (e) {
    console.error('Automation Error:', e.message);
}
