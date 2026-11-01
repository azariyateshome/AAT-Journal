# Journal app fix

The Home page previously showed an alert when `POST /api/v1/journal` returned an error (most commonly because MongoDB was not running). It now saves the new entry to the same browser-local journal store used by the Journal page when the API/database is unavailable. Those local entries are picked up by the Journal page and can be synchronized to MongoDB when the backend/database comes back online.

For permanent backend storage, MongoDB still needs to be running.

## Start the backend/database on Windows

1. Make sure MongoDB is installed and the MongoDB service/server is running.
2. Start `start-backend.bat`.
3. Open `http://localhost:5000/api/health`.
4. The response should contain `"databaseConnected":true`.
5. Start the frontend with `start-frontend.bat`.

The backend uses:

`mongodb://localhost:27017/trading_journal`

You can change it in `backend/.env` with `MONGO_URI=...`.

## Important

The local fallback prevents data loss while MongoDB is down, but it is browser storage, not MongoDB. Once MongoDB is available, open the Journal page so pending `local-journal-*` entries can be synchronized.
