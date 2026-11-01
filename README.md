# AAT Journal

A private trading journal for forex, indices and prop-firm traders.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase Authentication (email/password; no public sign-up)
- Cloud Firestore
- PWA
- No Firebase Storage

## Quick start

1. Install Node.js 22 or newer.
2. In Firebase Console, enable Authentication → Email/Password.
3. Create your private login user under Authentication → Users. There is no public registration screen.
4. Create a Cloud Firestore database and deploy `firestore.rules`.
5. Copy `frontend/.env.example` to `frontend/.env` and fill in your Firebase Web App configuration.
6. From the project root run:

   ```bash
   npm run install:all
   npm run dev
   ```

7. Check the production build:

   ```bash
   npm run build
   ```

## Firebase configuration

Set these values in `frontend/.env`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

No Firebase Storage bucket is required. The frontend writes directly to Firestore under `users/{uid}/...`; Firestore Security Rules are the authorization boundary.

## Privacy

Never commit `.env` files, service-account credentials, local databases, logs, `node_modules` or build output. Firebase Web App configuration is supplied at runtime through environment variables. Do not put Admin SDK credentials in frontend code.

## Project notes

- `README-GITHUB-SETUP.md` contains the GitHub publishing steps.
- `AI_STUDIO_BUILD_PROMPT.md` contains the detailed implementation brief and acceptance criteria.
- The old Express/SQLite backend and its local database were excluded from the GitHub-ready archive to avoid conflicting with the Firebase-only architecture.
