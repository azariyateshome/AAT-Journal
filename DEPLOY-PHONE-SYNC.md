# AAT Journal: phone installation and shared database deployment

## Important architecture
The app can be installed on a phone as a PWA. To sync phone and PC while the PC is off, deploy the frontend and API to one HTTPS URL and use a persistent SQLite volume. The app serves the built frontend and API from the same origin. API data is shared because both devices connect to that hosted API/database.

## Build locally
- Install Node.js 22.12+.
- In `frontend`: `npm ci` then `npm run build`.
- In `backend`: `npm ci` then `npm run build`.
- Start backend with `npm start`. It serves `frontend/dist` if the build exists and uses `DB_FILE` for SQLite.

## Hosting requirements
Use a Node hosting service that supports a persistent mounted volume. Set the service root to `Journal` (the folder containing this file), build commands to:

```sh
cd frontend && npm ci && npm run build && cd ../backend && npm ci && npm run build
```

Start command:

```sh
cd backend && npm start
```

Set environment variables:
- `PORT` = provided by host (usually automatic)
- `DB_FILE` = path on the persistent volume, e.g. `/data/trading_journal.db`
- `CORS_ORIGINS` = leave blank for same-origin hosting; if using a separate frontend, set the exact HTTPS frontend origin(s), comma-separated.

Attach/mount the persistent volume at `/data`. Without persistent storage, SQLite data may be lost on redeploy/restart. Back up the existing local database before migrating; local SQLite data is not automatically uploaded to the cloud.

## Install on phone
1. Deploy and open the HTTPS URL on your phone.
2. Android Chrome: menu (⋮) -> **Install app** or **Add to Home screen**.
3. iPhone Safari: Share -> **Add to Home Screen**.
4. Open the installed app. Open the same URL on your PC. Both then use the same hosted database.

## Security warning before publishing
The current sign-in is a frontend-only gate and does not protect API endpoints. Do not publish this app or put sensitive journal data on a public URL until server-side authentication and per-user API authorization are added. CORS is not authentication. Use a private deployment until then.

## Offline limitation
The service worker caches the app shell for faster repeat loads and an offline fallback. It does not yet queue create/edit operations while offline; trade entries and no-trade markers require the API connection. Sync works when both devices can reach the deployed service.
