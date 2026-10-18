const { execSync } = require('child_process');

const ps = `
Add-Type @"
  using System;
  using System.Text;
  using System.Runtime.InteropServices;
  public class StationCheck {
    [DllImport("user32.dll")]
    public static extern IntPtr GetProcessWindowStation();
    [DllImport("user32.dll")]
    public static extern bool GetUserObjectInformation(IntPtr hObj, int nIndex, StringBuilder pvInfo, int nLength, out int lpnLengthNeeded);

    public static string GetStation() {
      IntPtr h = GetProcessWindowStation();
      StringBuilder sb = new StringBuilder(256);
      int needed;
      GetUserObjectInformation(h, 2, sb, 256, out needed);
      return "Handle: " + h + ", Name: " + sb.ToString();
    }
  }
"@
Write-Output "STATION: $([StationCheck]::GetStation())"
Write-Output "USER: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
