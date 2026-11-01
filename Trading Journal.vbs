Option Explicit

Dim shell, fso, root, ps
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & root & "\start-journal.ps1"""

' Run completely hidden so no terminal window appears.
shell.Run ps, 0, False

Set fso = Nothing
Set shell = Nothing
