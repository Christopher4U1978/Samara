# Security Specification for SAMARA

## 1. Authentication Boundary
Firebase Authentication is used for user identity. The system relies on Google Sign-In. The client receives an ID token upon login, but the backend does not currently verify this token.

## 2. Firestore Client Boundary
`firestore.rules` enforces a Zero-Trust, default-deny posture.
- Users can only read and write documents in `/users/{userId}` where `request.auth.uid == userId`.
- Subcollections like `/users/{userId}/messages/{messageId}` follow the exact same strict UID path-matching.
- All writes are validated strictly. No unknown fields are allowed (`hasAll` and `size()` checks).

## 3. Backend Authorization Boundary
The backend currently does not handle authorization for database access. Database access is performed directly from the client to Firestore, governed by `firestore.rules`.
**Limitation:** The backend's Gemini API endpoints (`/api/chat`, `/api/tts`, `/live`) do not currently verify Firebase Auth tokens, leaving the AI quota theoretically exposed to unauthenticated users.

## 4. Privileged Admin SDK Boundary
There is no privileged Admin SDK usage in the backend at this time. The Node backend uses `@google/genai` but does not interact with Firestore directly.

## 5. User-data Ownership Model
Ownership is strictly path-based. A user's data is inherently owned by them if it resides under `/users/{request.auth.uid}`. There is no `ownerId` or `userId` field inside the document relied upon for authorization.

## 6. Message Isolation
Messages are stored in `/users/{userId}/messages/{messageId}`. Rules explicitly demand `request.auth.uid == userId` for all operations. They are strictly immutable once created.

## 7. Persistent-setting Validation
`sarcasmLevel` is validated at the database boundary to be an `int` strictly between `0` and `10` inclusive. Values like `11`, `-1`, or `"5"` are explicitly rejected by Firestore rules.

## 8. Secrets Boundary
The `GEMINI_API_KEY` is kept securely on the Node.js backend. It is not exposed to the browser. Client-side code connects to the `/api/chat` route. No Firebase service accounts are used.

## 9. Emulator Test Strategy
Automated tests are written using `@firebase/rules-unit-testing` to run against the local Firebase Emulator. Tests cover unauthenticated access, cross-user violations, valid bounds for values, schema poisoning, and transactional bypasses.

## 10. Security Findings & Remediation (F1-R1)

**F1-SEC-001**
- **Severity**: HIGH
- **Surface**: Gemini backend endpoints (`/api/chat`, `/api/tts`, `/live`)
- **Issue**: Missing Firebase authentication verification allowed unauthenticated usage of AI capabilities, risking quota abuse.
- **Impact**: Unauthorized AI quota/resource consumption.
- **Resolution**: Server-side Firebase ID-token verification implemented via `firebase-admin` in an Express middleware (`verifyFirebaseToken`) and WebSocket handshake, protecting all AI-consuming endpoints.

## 11. Known Limitations
- The frontend exposes a `liveMode` WebSocket connection, which relies on a short-lived Firebase ID token. Re-authentication on token expiry over long-lived websockets is not strictly enforced, though the initial handshake is secure.

## 12. Remaining Risks
- None currently affecting security boundaries.

## 13. Phase F2: Authentication, Authorization & Session Hardening
- **F2.1 - Architecture Inventory**: Frontend uses `signInWithPopup`, sets cookies via SDK, retrieves ID tokens via `auth.currentUser?.getIdToken()`. Backend uses `firebase-admin` with explicit initialization using `firebase-applet-config.json` avoiding credentials leak.
- **F2.2 - Admin SDK Init**: Audited. Uses explicitly defined project ID. No secrets exposed to browser.
- **F2.3 - Auth Middleware**: `verifyFirebaseToken` extracts UID purely from JWT signature.
- **F2.4 - Revocation Policy**: `checkRevoked: true` added to `verifyIdToken` in HTTP middleware and WS handshake. HTTP routes return `401 Token has been revoked`.
- **F2.5 - Authorization Boundary**: Implemented `enforceAuthorization` middleware. Currently allows all authenticated UIDs to pass, but the boundary is firmly established for future RBAC/Multi-user restrictions. Rejects with `403`.
- **F2.6 - Route Protection**: `/api/chat`, `/api/tts`, and `/live` fully gated by Auth + Authz.
- **F2.7 - WebSocket Pre-Auth Hardening**: Implemented 5s handshake timeout. Payload size limited to 10kb. Enforced single authentication attempt per socket.
- **F2.8 - Rate Limit Boundary**: Implemented `enforceRateLimit` middleware (max 60 req/min per UID).
- **F2.9 - App Check Architecture (Deployment-Gated)**: App Check enforcement is explicitly deployment-gated. It requires a registered reCAPTCHA Enterprise / reCAPTCHA v3 site key in the Google Cloud Console which is not available in the preview environment. The backend boundary is prepared to verify App Check tokens once provisioned.
- **F2.10 - Frontend Session Handling**: Fetch catches 401/403 and invokes `signOut(auth)`. WS catches 4001 and invokes `signOut(auth)`.
- **F2.11 - Logging Hygiene**: `verifyIdToken` rejection logs suppress raw tokens.
- **F2.12 - Test Suite**: `server.test.ts` covers unauthenticated, invalid, revoked, disabled, and rate-limited HTTP/WS attempts.

## Directives
1. **Security must fail closed.**
2. **401 vs 403**: 401 means authentication failure. 403 means authenticated identity lacks permission.
3. **Identity Source**: The verified UID must remain the sole identity source. Client-controlled fields (`uid`, `userId`, `email`) must never establish identity.
4. **Boundary Proof**: Authenticated does not mean authorized. Authorized does not mean legitimate application traffic. Every boundary must prove its own claim.

## Phase Status
F1 PASS (Remediated via F1-R1)
F2 PASS (Completed)
