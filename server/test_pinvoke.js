const { execSync } = require('child_process');

const ps = `
Start-Process "calc.exe"
Start-Sleep -Seconds 2

Add-Type @"
  using System;
  using System.Text;
  using System.Collections.Generic;
  using System.Runtime.InteropServices;

  public class WinEnum {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public static List<string> GetMatchingWindows() {
      List<string> list = new List<string>();
      EnumWindows((hWnd, lParam) => {
        if (IsWindowVisible(hWnd)) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(hWnd, sb, 256);
          StringBuilder cb = new StringBuilder(256);
          GetClassName(hWnd, cb, 256);
          string title = sb.ToString();
          string cls = cb.ToString();
          if (!string.IsNullOrEmpty(title) && (title.IndexOf("calc", StringComparison.OrdinalIgnoreCase) >= 0 || title.IndexOf("Calculator", StringComparison.OrdinalIgnoreCase) >= 0 || cls == "ApplicationFrameWindow")) {
            list.Add(hWnd.ToString() + " [" + cls + "]: " + title);
            SetForegroundWindow(hWnd);
          }
        }
        return true;
      }, IntPtr.Zero);
      return list;
    }
  }
"@

$matches = [WinEnum]::GetMatchingWindows()
Write-Output "MATCHED: $($matches -join ' || ')"
`;

try {
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { encoding: 'utf-8' });
    console.log(out);
} catch (e) {
    console.error(e.message);
}
