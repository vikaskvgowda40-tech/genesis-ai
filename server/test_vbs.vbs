Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "calc.exe"
WScript.Sleep 1500
activated = WshShell.AppActivate("Calculator")
WScript.Echo "ACTIVATED: " & activated
If Not activated Then
    activated = WshShell.AppActivate("calc")
    WScript.Echo "ACTIVATED_CALC: " & activated
End If
WScript.Sleep 300
On Error Resume Next
WshShell.SendKeys "{ESC}"
WScript.Sleep 100
WshShell.SendKeys "250{+}350{ENTER}"
If Err.Number <> 0 Then
    WScript.Echo "SENDKEYS_ERROR: " & Err.Description
Else
    WScript.Echo "SENDKEYS_SUCCESS"
End If
