AAT TRADING JOURNAL — COMBINED PROJECT + DESKTOP LAUNCHER

This folder combines the Journal redesign project with the desktop launcher.
The frontend design and backend source are preserved.

FIRST RUN
1. Install Node.js 22.12 or newer.
2. Keep this entire Journal folder together. Do not move the launcher files out of this folder.
3. Double-click "Install Trading Journal Launcher.bat".
4. Double-click the "Trading Journal" shortcut on your Windows desktop.
5. On first launch, the launcher installs frontend/backend dependencies if missing,
   starts the backend on port 5000, starts Vite on port 5173, then opens the app in
   Chrome/Edge app mode.

MANUAL RUN
- Backend: open a terminal in backend and run: npm ci, then npm run dev
- Frontend: open a terminal in frontend and run: npm ci, then npm run dev
- App: http://localhost:5173
- Health check: http://localhost:5000/api/health

DATABASE
This project uses SQLite at backend/data/trading_journal.db.
Back up that file before replacing an existing Journal installation.
This ZIP does not include your existing database file, so it will not overwrite it.

IMPORTANT
- The launcher only provides desktop-style startup; it does not add cloud sync or phone sync.
- Keep frontend/, backend/, and the launcher files in this same Journal folder.
- If port 5000 or 5173 is already occupied, stop the old Journal processes before launching.
