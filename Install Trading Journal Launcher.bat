@echo off
setlocal

set "ROOT=%~dp0"
set "VBS=%ROOT%Trading Journal.vbs"
set "ICON=%ROOT%trading-journal.ico"

if not exist "%VBS%" (
    echo Trading Journal launcher files are missing.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = Join-Path $desktop 'Trading Journal.lnk'; $shortcut = $ws.CreateShortcut($shortcutPath); $shortcut.TargetPath = (Join-Path $env:WINDIR 'System32\wscript.exe'); $shortcut.Arguments = '"""%VBS%"""'; $shortcut.WorkingDirectory = '"""%ROOT%"""'; $shortcut.IconLocation = '"""%ICON%""",0'; $shortcut.Description = 'Launch Trading Journal'; $shortcut.Save()"

if exist "%USERPROFILE%\Desktop\Trading Journal.lnk" (
    echo.
    echo Trading Journal desktop launcher created successfully.
    echo.
    echo Double-click "Trading Journal" on your desktop to launch it.
    echo No terminal window will be shown.
) else (
    echo.
    echo Could not create the desktop shortcut.
)

pause
