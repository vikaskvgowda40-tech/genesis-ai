const { spawn, execSync } = require('child_process');
const path = require('path');

// Test 1: Check PowerShell execution with -ExecutionPolicy Bypass
try {
    const psOut = execSync('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Write-Output PS_OK"', { encoding: 'utf-8' });
    console.log('PowerShell Bypass Test:', psOut.trim());
} catch (e) {
    console.error('PowerShell Bypass Error:', e.message);
}

// Test 2: Check WScript.Shell via cscript or PowerShell SendKeys
try {
    const psSendKeysCheck = execSync('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; Write-Output FORMS_OK"', { encoding: 'utf-8' });
    console.log('System.Windows.Forms Test:', psSendKeysCheck.trim());
} catch (e) {
    console.error('System.Windows.Forms Error:', e.message);
}
