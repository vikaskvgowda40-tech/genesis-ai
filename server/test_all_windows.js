const { execSync } = require('child_process');

const ps = `
Add-Type @"
  using System;
  using System.Text;
  using System.Collections.Generic;
  using System.Runtime.InteropServices;
  public class WinList2 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static string[] GetWindows() {
      List<string> res = new List<string>();
      EnumWindows((hWnd, lParam) => {
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hWnd, sb, 256);
        string t = sb.ToString();
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (!string.IsNullOrWhiteSpace(t)) {
          res.Add(pid + ": " + t);
        }
        return true;
      }, IntPtr.Zero);
      return res.ToArray();
    }
  }
"@
$arr = [WinList2]::GetWindows()
$arr | ForEach-Object { Write-Output $_ }
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
