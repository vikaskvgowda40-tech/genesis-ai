const { execSync } = require('child_process');

const ps = `
Start-Process "calc.exe"
Start-Sleep -Seconds 2

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$allWindows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)

foreach ($w in $allWindows) {
    $name = $w.Current.Name
    $cls = $w.Current.ClassName
    if ($name -or $cls) {
        Write-Output "UIA_WIN: [$cls] $name"
    }
}
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
