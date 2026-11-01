# Google AI Studio Project Prompt — AAT Journal

You are working on the existing AAT Journal codebase, not a new greenfield app. First inspect the repository and preserve working UI and functionality unless a change is required below. Do not rewrite the entire application just to change architecture.

## Product
Build AAT Journal: a private, responsive, installable trading journal for forex, indices and prop-firm traders.

## Existing stack
- React + TypeScript + Vite
- Tailwind CSS (the existing project currently uses Tailwind CSS v4)
- Firebase Authentication (email/password only)
- Cloud Firestore
- PWA
- CSS-variable-based light/dark themes

Do not introduce a separate SQL database, Express API, Firebase Cloud Functions, Firebase Storage, or any other file-storage service. Firestore is the only application data store. Keep Firebase web configuration in `frontend/.env` using `VITE_FIREBASE_*` variables. Never put service-account credentials in the browser or repository.

## Existing project
The repository already contains the AAT Journal UI, pages, Firebase Auth/Firestore services, trade sharing, PWA assets and Firestore rules. Inspect these before editing. Keep existing branding and the overall visual identity. The mobile design reference is https://pocket-beauty-gallery.lovable.app/ (AAT Journal / Trade Index): compact performance dashboard, Net P/L, win rate, Avg R:R, max drawdown, recent entries, emotion tracking and bottom navigation. Use a desktop sidebar and a mobile bottom navigation/drawer as appropriate.

## Authentication and app protection
- Landing page with Log in; no public registration/sign-up route or button.
- Login with email, password, Remember me, forgot-password.
- Remember me = Firebase browserLocalPersistence; unchecked = browserSessionPersistence.
- Friendly errors for invalid credentials and too many attempts.
- User accounts are created privately by the owner in Firebase Console or through a trusted admin process, never public client-side sign-up.
- Add an optional app PIN lock after successful Firebase authentication. It is an additional privacy/shoulder-surfing lock, NOT a replacement for Firebase Auth and NOT a security boundary for Firestore. Do not store a plaintext PIN. Prefer a server-verified PIN if a backend is ever introduced; if remaining client-only, clearly document its limitations and store only a salted derived verifier using Web Crypto, with rate limiting and lockout. Provide PIN setup/change/recovery and auto-lock after inactivity. Signing out must always return to Firebase login.

## Firestore structure
All user data must be scoped below `users/{uid}/...`:
- `accounts`: name, broker, accountType (Live | Demo | Funded), fundedStage (Phase 1 | Phase 2 | Funded), targetProfit, initialBalance, currency, leverage, accountNumber, server, platform, logo (small compressed data URL), logoName, notes, accountStatus (Active | Passed | Breached), createdAt, updatedAt.
- `journalEntries`: tradeDate, symbol, tradeType (Buy | Sell), positionSize, entryPrice, exitPrice, result (Win | Loss | Break Even), netPL, notes, emotions[], emotionNotes, brokenRule, accountIds[], accountName (display-only snapshot), chartUrl, mt5Screenshot (compressed data URL), createdAt, updatedAt.
- `rules`: title, description, icon, isActive, createdAt, updatedAt.
- `noTradeDays`: tradeDate, notes, createdAt, updatedAt.
- `certificates`: title, certificateType (Funded Certificate | Payout Certificate | Other), fileData (compressed image or small PDF data URL), fileName, mimeType, accountId, createdAt.

Firestore rules must enforce `request.auth != null && request.auth.uid == userId` for every document under `users/{userId}/**`. Never trust a UID supplied by the client; derive it from the current Firebase Auth user.

## Firestore-only file handling and limits
- Absolutely NO Firebase Storage. Do not import `firebase/storage`, call `uploadBytes`, `getDownloadURL`, or depend on a storage bucket.
- Compress images client-side before saving. Resize and encode images as JPEG/WebP where appropriate; preserve transparency only when needed for logos.
- PDFs may be stored as data URLs only when small enough.
- Enforce a conservative maximum document payload of about 900 KB (below Firestore's 1 MiB document limit), accounting for the entire serialized document, not only the file field. Reject oversized files with a clear inline error and explain how to reduce them.
- Do not store large chart screenshots as external URLs unless the user explicitly chooses an external URL; default is compressed Firestore data URL.
- Do not claim Firestore is a general-purpose file storage service; warn that large files are unsuitable.

## Reliability
- Every Firestore read/write must show loading state and a visible success/error state.
- Wrap writes in a 15-second timeout and display the actual Firebase error code/message in a user-friendly way. A timeout message must say the result may need refreshing before retrying, to avoid accidental duplicate writes.
- Do not silently swallow errors.
- Prevent double-submit while saving.
- Use server timestamps where appropriate, consistent date formats, and robust empty/loading/error states.
- Add inline validation for every form; do not rely on browser-hidden `required` behavior.
- Add accessible modal behavior: focus management, Escape close where safe, labels, keyboard navigation and confirmation for destructive actions.

## Pages
1. Home: Net P/L, win rate, profit factor, total trades, equity curve, recent trades and rule-adherence statistics. Add max drawdown, average R:R, daily loss-limit and challenge drawdown indicators where the data supports them.
2. Journal: responsive table/cards; filters for date range, result, symbol and account; create/edit/delete trade modal; multi-account selection by account document ID; screenshot upload and compression; emotions; broken-rule dropdown populated from the user's Rules collection. Preserve trades when an account is deleted.
3. Calendar: monthly P/L heatmap; click a date to inspect that day's trades; mark/unmark no-trade days with notes; account filter including All.
4. Accounts: account cards with initial/current balance, net change, percentage change, status, funded stage and progress toward Phase 1/2 target. Include Passed/Breached archive. Built-in logo lookup by known firm/broker name (FTMO, FundedNext, The5ers, FundingPips, E8 Markets, Exness, XM, Pepperstone, AvaTrade, HFM, etc.); custom broker/account logo uploads compressed to data URLs. Do not hotlink logos from untrusted sources; use bundled assets or user-uploaded logos.
5. Rules: personal rules CRUD, active/inactive toggle, icons; rules used by new journal entries.
6. Certificates: upload, preview and delete small image/PDF data URLs; optional account link.
7. Trade Share: generate a downloadable/shareable trade-card image from a journal entry with selectable bundled background artwork. Never include account numbers or private notes in a share card.

## Critical business logic
- Link trades to accounts only through `accountIds` document IDs. Never fuzzy-match by account name.
- Account balance is derived as `initialBalance + sum(netPL for journal entries whose accountIds contains that account ID)`. Do not independently mutate a stored currentBalance when trades change. Derive it from the ledger, or maintain a carefully tested derived cache that can be rebuilt from journal entries.
- Account change amount = currentBalance - initialBalance.
- Account percentage change = (change amount / initialBalance) * 100; handle zero initial balance safely.
- When an account is deleted, remove its ID from each linked journal entry's `accountIds`, but keep all journal entries and their historical display snapshot. Do not delete trades.
- Passed/Breached funded accounts should be archived by status, not deleted.
- Follow the requested formula literally: for every account ID present in `accountIds`, include the full trade `netPL` in that account's derived balance. A multi-account trade therefore contributes its full P/L to each linked account. Make this behavior clear in the multi-account selector/help text; do not silently split or allocate P/L.

## Analytics definitions
Document and test calculations:
- Net P/L = sum of netPL.
- Win rate = wins / (wins + losses); break-even trades excluded.
- Profit factor = gross profit / absolute gross loss; handle no-loss and no-trade cases.
- Equity curve = chronological cumulative netPL, with a clearly stated starting point.
- Max drawdown = peak-to-trough decline on the equity curve.
- Rule adherence = trades with no brokenRule / trades with a recorded rule outcome; do not treat missing rule data as adherence.
- Average R:R requires risk data; do not fabricate it from entry/exit alone. Add stop-loss/risk fields if needed, with migration/default handling.
- Trading sessions and daily loss limits require clearly defined timezone and risk settings; expose configuration rather than guessing.

## Design and responsiveness
- Keep a consistent professional trading-terminal visual language: compact but readable metrics, clear positive/negative P/L, strong hierarchy, restrained accent colors, accessible contrast.
- Light and dark themes must both work through CSS variables. Persist theme choice locally.
- Desktop: sidebar + header. Mobile: compact header and bottom navigation inspired by the supplied reference; forms should use full-height/bottom-sheet patterns where useful.
- Ensure tables become readable cards or horizontally scrollable layouts on narrow screens.
- Add installability metadata, icons, offline app shell and update handling. Do not cache private Firestore responses in a shared service-worker cache. Explain that offline writes are not guaranteed unless deliberately implemented and tested.

## Security and privacy
- Firestore rules are the actual authorization boundary; client-side route guards are only UX.
- No public sign-up.
- No analytics/tracking SDK unless explicitly approved.
- Never log passwords, PINs, screenshots, account numbers, or private trading notes.
- Add export and delete-my-data workflows with confirmation. Export should produce a user-owned JSON/CSV backup without exposing data to other users.
- Validate and sanitize all user input. Avoid rendering user text as HTML.

## Implementation workflow
1. Inspect the current repository and report the architecture, working features, broken/missing requirements and risky legacy files.
2. Make a short implementation plan. Do not remove working features without explaining why.
3. Fix Firebase configuration and remove all Firebase Storage dependencies/configuration/documentation.
4. Audit Firestore rules and every data access path for per-user isolation.
5. Implement safe document-size checks and 15-second write timeouts.
6. Verify account linking, account balance derivation, account deletion unlinking and multi-account P/L allocation.
7. Finish all CRUD flows, analytics, empty/loading/error states and mobile responsiveness.
8. Add PIN lock with its limitations documented.
9. Verify PWA installability and ensure private user data is not cached publicly.
10. Run TypeScript checks, lint and production build. Fix all errors. Provide exact changed files, setup steps, required Firebase Console configuration and manual test checklist.

Do not invent that a feature works unless it has been implemented and tested. Ask before making irreversible data migrations or choosing ambiguous multi-account P/L allocation rules.
