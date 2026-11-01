# AAT Journal — GitHub-ready project

## Stack
React + TypeScript + Vite + Tailwind CSS, Firebase Authentication and Cloud Firestore. No Firebase Storage is used.

## Setup
1. Install Node.js 22 or newer.
2. In Firebase Console, enable Authentication > Email/Password and create your private user manually under Authentication > Users. There is no public sign-up.
3. Create a Cloud Firestore database and deploy `firestore.rules`.
4. Copy `frontend/.env.example` to `frontend/.env` and fill in your Firebase Web App values.
5. From the repository root run:
   ```bash
   npm run install:all
   npm run dev
   ```
6. Verify a production build:
   ```bash
   npm run build
   ```

Do not commit `frontend/.env`, service-account credentials, local databases, logs, `node_modules`, or build output.

## Firebase
The frontend accesses Firestore directly using the signed-in user's UID under `users/{uid}/...`. Firestore rules are the authorization boundary. No Storage bucket is required.

## Important
The original ZIP included an older Express/SQLite backend, local database files, build output, logs, dependencies and a Firebase Hosting cache. Those have been excluded from this GitHub-ready package to avoid confusing the Firebase-only application and accidentally publishing local data or generated artifacts. The original uploaded ZIP remains unchanged.

See `AI_STUDIO_BUILD_PROMPT.md` for the detailed implementation and acceptance criteria.
