TRADING JOURNAL DESKTOP LAUNCHER

This launcher gives the Trading Journal a desktop-app style startup.

ONE-TIME SETUP
1. Put this launcher folder inside the main Journal project folder.
2. Double-click "Install Trading Journal Launcher.bat". If Windows asks for permission, allow it to create the shortcut.
3. A "Trading Journal" shortcut will be created on your Windows desktop.
4. You can then launch the journal by double-clicking that shortcut.

IMPORTANT
The launcher expects these folders to be next to it:
    frontend\
    backend\
    logs\

If you put the launcher files directly in the main Journal folder, everything will work as-is.

WHEN YOU DOUBLE-CLICK THE DESKTOP ICON
- Backend starts silently on port 5000.
- Vite frontend starts silently on port 5173.
- Chrome or Edge opens the journal in app mode.
- There is no terminal window.
- Your existing SQLite database remains unchanged.

REQUIREMENT
Node.js 22.5 or newer must be installed.

If Chrome is installed, it is preferred. Otherwise Edge is used.
If neither is available, the journal opens in the default browser.

The existing Trading Journal.vbs can also be used directly.
