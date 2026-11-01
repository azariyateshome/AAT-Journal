# Trading Journal - Setup

## 1. Database

The backend uses **SQLite**. You do not need MongoDB or any separate database server.

The database file is created automatically at:

`backend/data/trading_journal.db`

The backend creates the tables the first time it starts.

## 2. Requirements

- Node.js 22.5 or newer
- npm

## 3. Start everything on Windows

From the project folder, double-click:

`start-journal.bat`

It opens one terminal for the backend and one for the frontend.

Or run them separately:

- `start-backend.bat`
- `start-frontend.bat`

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

A healthy database response should contain:

`"databaseConnected": true`

and:

`"database": "sqlite"`

## 4. Data ownership

The application now uses the SQLite backend as the source of truth for:

- Journal entries
- Trading accounts
- Trading rules
- Dashboard statistics
- Calendar data
- Account balances and journal P/L
- Emotion analytics

The frontend does not use browser localStorage as a database or fallback.
