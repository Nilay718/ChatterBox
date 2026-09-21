# ChatterBox - Real-Time Chat Application

## Internship Task

**Task 5: Real-Time Chat Application**

---

## Project Overview

ChatterBox is a real-time messaging application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.io. Users can create an account, sign in, search for other users, and exchange messages in one-to-one conversations and group chats.

Messages are saved in MongoDB so conversation history survives a page refresh. Live delivery, typing indicators, online/offline presence, and read-receipt updates travel over Socket.io on the same Node.js HTTP server as the REST API.

The frontend is a React 18 single-page app (Vite + Tailwind CSS) with a split layout: chat list on the left and conversation view on the right, with a mobile-friendly stacked layout. Optional extras already present in the codebase include JWT authentication, file and image sharing (Cloudinary or local disk), message edit/delete, unread counts, and dark mode.

---

## Objectives

The objective of this task is to build a working real-time chat system, not a static message form. That means:

1. A Node.js backend that can accept HTTP requests and keep long-lived socket connections.
2. A browser chat interface for composing, sending, and displaying messages.
3. Bidirectional delivery so a message sent by one user appears for another user without a manual refresh.
4. Persistence so history can be loaded again after reconnect or reload.
5. Enough operational detail (how to run, how to test, how it would scale) for an internship submission.

ChatterBox maps those objectives onto a REST + Socket.io split: HTTP is used to create and store data; Socket.io is used to notify connected clients of new events.

---

## Key Features

The following features exist in the current repository:

- **User registration and login** — email/password accounts via `/api/auth/register` and `/api/auth/login`.
- **JWT authentication** — short-lived access tokens and rotating refresh tokens; protected REST routes and Socket.io handshake auth.
- **One-to-one real-time chat** — access or create a two-person chat; send/receive over REST + sockets.
- **Group chat** — create a group (minimum three participants including the creator), add/remove members (admin), leave group, system messages.
- **Message persistence** — Mongoose `Message` documents with pagination (`GET /api/messages/:chatId`).
- **Online/offline status** — in-memory socket map plus `isOnline` / `lastSeen` on the User document; UI shows Online / last seen.
- **Typing indicators** — `typing` / `stop_typing` socket events scoped to a chat room.
- **Read receipts** — `readBy` on messages; UI shows a single or double check based on whether more than one user is in `readBy`.
- **Unread counts** — per-user map on the Chat document; incremented on send, reset on `join_chat` / `mark_read`.
- **File and image sharing** — multipart upload on send; Cloudinary when credentials are set, otherwise local `server/uploads`.
- **Message edit and delete** — REST update/soft-delete, then socket broadcast so other clients update in place.
- **User search** — `GET /api/users/search?q=` by name or email.
- **Responsive UI** — sidebar + chat window; on small screens only one pane is shown at a time.
- **Dark mode** — theme context and Tailwind theme classes.

Related capabilities that also exist but are supporting rather than core Task 5 items: emoji picker, reactions, reply-to, infinite scroll for older messages, profile update, and in-app toast notifications for messages in chats that are not currently open.

---

## Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| HTTP client | Axios |
| Backend | Node.js (≥18), Express.js |
| Database | MongoDB with Mongoose |
| Real-time | Socket.io (server) and socket.io-client |
| Authentication | JWT (access + refresh), bcryptjs |
| File storage | Cloudinary (when configured); local disk fallback under `server/uploads` |
| Security middleware | Helmet, CORS, express-rate-limit, express-validator |
| Logging | Winston |

---

## System Architecture

ChatterBox uses two complementary paths between the browser and the server.

### HTTP path (create, read, update, persist)

```
React Client
    ↓  Axios (Bearer JWT)
REST API  (/api/auth, /api/users, /api/chats, /api/messages)
    ↓
Node.js + Express
    ↓
MongoDB (Mongoose models: User, Chat, Message, Notification)
```

Typical HTTP uses:

- Register, login, logout, refresh token
- Search users, load/update profile
- List chats, start a DM, create/update groups
- Load paginated history, send a message (including files), edit, delete, react

The client Axios instance (`client/src/api/axios.js`) attaches `Authorization: Bearer <accessToken>` and retries once after `POST /api/auth/refresh` on HTTP 401.

### Real-time path (live events)

```
React Client
    ↕  Socket.io (JWT in handshake.auth.token)
Node.js HTTP server (same process as Express)
```

Socket.io is initialized on the Express HTTP server in `server/server.js` via `initializeSocket(httpServer)`. It is not a separate microservice. Events are used for delivery and UI sync after (or alongside) REST writes, not as a replacement for MongoDB on the send path.

The repository includes an **optional** same-origin path: if `NODE_ENV=production` and `client/dist` exists, Express can serve the SPA and fall back to `index.html` for non-API GET routes. **That is not the currently verified production topology.** Live hosting uses a separate frontend service and a separate API/Socket.io service (see Deployment).

---

## Real-Time Communication Flow

Implementation lives in `server/socket/index.js`, `chatHandler.js`, `messageHandler.js`, `presenceHandler.js`, and the client `SocketContext` / `ChatContext`.

### Connection authentication

Before `connection` is accepted, `io.use` reads `socket.handshake.auth.token`, verifies it with the access-token secret, loads the user, and attaches `socket.userId` and `socket.userData`. Connections without a valid token are rejected.

The client connects with `socket.io-client` when the user is authenticated, passing the access token from `localStorage`. On `connect` it emits `setup`; the server responds with `initial_online_users`.

### Chat rooms

Each authenticated socket joins a **personal room** named with the user id (for notifications and presence-related emits to that user).

When the user opens a conversation, the client emits `join_chat` with the chat id. The server loads the Chat document and **only joins the Socket.io room if the user is a participant**. Leaving the conversation emits `leave_chat`. Group membership changes can emit `added_to_group` / `removed_from_group` to personal rooms.

### Sending and receiving messages

1. The client sends `POST /api/messages` (JSON or multipart). Express creates a `Message`, updates `latestMessage` and unread counts, and creates `Notification` documents.
2. On success, the sender emits `send_message` with the saved message payload and `chatId`.
3. The server broadcasts `new_message` to the chat room (excluding the sender) and emits `notification` plus `chat_updated` to each other participant’s personal room.
4. The sender receives `message_sent`. Failures emit `message_error`.

Receiving clients append the message if they are viewing that chat, or increment unread state and show a toast if they are not.

Socket `send_message` does **not** write to MongoDB; persistence is the REST handler. An in-memory dedupe map reduces duplicate broadcasts of the same message id.

### Typing events

While the composer has text, the client emits `typing` with `{ chatId }`. A debounced `stop_typing` follows after idle input. The server relays `user_typing` / `user_stop_typing` to the rest of the chat room. The UI shows bouncing dots and “is typing” in the header.

### Presence

The server keeps `onlineUsers`: `Map<userId, Set<socketId>>` so multiple tabs count as one online user. On first socket, the User document is set `isOnline: true` and others receive `user_online`. When the last socket disconnects, `isOnline` is set false, `lastSeen` is stored, and `user_offline` is broadcast.

Clients also maintain a `Set` of online user ids from `initial_online_users`, `user_online`, and `user_offline`.

### Notifications

In-app notifications are socket events (`notification`) to personal rooms, plus MongoDB `Notification` records created on HTTP send. Opening a chat emits `mark_read`, which updates `readBy`, zeroes that user’s unread count, marks related notifications read, and broadcasts `messages_read` to the chat room.

Edit, delete, and reaction REST calls are followed by matching socket emits (`message_edited`, `message_deleted`, `message_reaction`) so other open clients update without refetching the full history.

---

## Database and Message Persistence

MongoDB is the source of truth. Connection logic is in `server/config/db.js` (pool size, retries, reconnect logging).

### Models

| Model | Role |
|--------|------|
| **User** | name, email, hashed password, avatar, bio, `isOnline`, `lastSeen`, refresh token (not selected by default) |
| **Chat** | `isGroupChat`, `participants`, `latestMessage`, `groupAdmin`, `groupAvatar`, `unreadCounts` (Map of userId → number) |
| **Message** | sender, chat, content, `messageType` (`text` / `image` / `file` / `system`), file fields, `readBy`, `isEdited`, `isDeleted`, `replyTo`, `reactions` |
| **Notification** | per-user in-app notification; TTL index expires documents after 30 days |

### Persistence behaviour

- Sending a message is an authenticated `POST /api/messages`. Empty text is rejected unless a file is present.
- History is `GET /api/messages/:chatId` with `page` and `limit` (default 50), newest-first query then reversed for chronological display. Compound index: `{ chat: 1, createdAt: -1 }`.
- Participant checks on get/send/search prevent reading another user’s chat.
- Edit is owner-only, text-only, blocked if already deleted. Delete is a soft delete (placeholder content, file URL cleared).
- Group create/add/remove/leave insert `system` messages.

If Cloudinary env vars are missing, uploaded files are stored on disk and served from `/uploads`. If Cloudinary is configured, message and avatar uploads go to Cloudinary and the local temp file is removed.

---

## Authentication and Security

Mechanisms that exist in the current code (not a claim of a full security audit):

- **JWT** — access token (default 15m) and refresh token (default 7d), separate secrets, refresh rotation stored on the user.
- **Password hashing** — bcryptjs, salt rounds 12; password and refresh token excluded from JSON.
- **Route protection** — `protect` middleware on users, chats, messages, and logout; Socket.io JWT middleware on connect.
- **Validation** — express-validator rules for register/login, chat/group create, send/edit message, pagination.
- **Helmet** — security headers (`crossOriginResourcePolicy: cross-origin` to allow media).
- **CORS** — origin from `CLIENT_URL` (default `http://localhost:5173`), credentials enabled.
- **Rate limiting** — 100 requests / 15 minutes on `/api`; stricter limiter on auth; 60 message POSTs / minute.
- **Search regex escaping** — special characters escaped in user and message search to reduce ReDoS risk.
- **Upload limits** — multer size caps and MIME allowlists for messages and avatars.
- **Error handling** — centralized handler; stack traces only when `NODE_ENV=development`.

Client tokens are stored in `localStorage` (not HTTP-only cookies). `cookie-parser` is registered on Express but is not used to set auth cookies. Socket event handlers after connect do not all re-check chat membership (except `join_chat`). Those are current design facts, not extra features.

---

## Testing and Debugging

The repository does **not** include an automated test suite (no Jest/Vitest/Cypress scripts or `*.test.js` files). Debugging support that does exist:

- `GET /api/health` in `server/server.js` (process liveness on the **API** service). This endpoint was **not** re-tested for this submission. A 404 from the **frontend** host (`chatterbox-3ao8.onrender.com/api/health`) only means the UI service does not mount `/api`; it is not evidence that the backend is down.
- Winston logging (`server/utils/logger.js`); file transports in production.
- `server/test-server.js` — starts MongoDB Memory Server and then the app, so local runs can avoid Atlas.
- Client toasts and Axios 401 refresh for common UI failures.

### Production verification (this submission)

The following were exercised on the live frontend **https://chatterbox-3ao8.onrender.com** against the separate Render API/Socket.io service:

| Area | Result |
|------|--------|
| Signup / registration | **PASSED** |
| Login | **PASSED** |
| MongoDB production connection | **PASSED** (inferred from successful auth, send, and history load) |
| Cloudinary production configuration | **PASSED** (image/file sharing on production) |
| Two-user real-time messaging | **PASSED** |
| Image / file sharing | **PASSED** |
| Message persistence and display | **PASSED** |

Features **not re-tested** during this verification remain unmarked as passed (checklist below). Direct refresh of `/login` on the frontend host was **not re-tested**; an earlier probe returned 404, which is consistent with a static frontend without SPA rewrite rules. Do not treat that as an API outage.

### Manual testing checklist

Rows marked **PASSED** were confirmed in production as above. All other rows are **Not re-tested during this submission verification**.

| # | Area | Steps | Expected | Result |
|---|------|--------|----------|--------|
| 1 | Registration | Open signup, submit valid name, email, password (6+ chars, includes a digit) | Account created, user lands in the app | **PASSED** (production) |
| 2 | Registration validation | Submit invalid email or weak password | Validation error; no account | Not re-tested during this submission verification |
| 3 | Duplicate email | Register with an existing email | Error that the email is already used | Not re-tested during this submission verification |
| 4 | Login | Sign in with correct credentials | Session established; chat list loads | **PASSED** (production) |
| 5 | Login failure | Wrong password | Unauthorized message; stay on login | Not re-tested during this submission verification |
| 6 | Logout | Use logout | Tokens cleared; redirected to login | Not re-tested during this submission verification |
| 7 | Guest/auth routes | Visit `/` logged out; visit `/login` while logged in | Redirect to login / home respectively | Not re-tested during this submission verification |
| 8 | User search | Search another user’s name or email | Matching users appear (not self) | Not re-tested during this submission verification |
| 9 | One-to-one chat | Start a chat from search | DM opens or existing DM is reused | Not re-tested during this submission verification |
| 10 | Send/receive (REST) | Send a text message | Message appears in sender’s thread | **PASSED** (production; covered by two-user messaging) |
| 11 | Real-time delivery | Second user has the same chat open | Message appears without refresh | **PASSED** (production) |
| 12 | Persistence | Refresh the page | History reloads from the API | **PASSED** (production) |
| 13 | Background chat | Receiver is in a different chat | Toast/unread updates; count increases | Not re-tested during this submission verification |
| 14 | Group creation | Select ≥2 others, name the group | Group appears; system “created” message | Not re-tested during this submission verification |
| 15 | Group messaging | Send in the group | All members receive it in real time / after open | Not re-tested during this submission verification |
| 16 | Group add/remove/leave | Admin add/remove; member leave | Membership and system messages update | Not re-tested during this submission verification |
| 17 | Online status | User A online; User B opens the DM | Header shows Online | Not re-tested during this submission verification |
| 18 | Offline / last seen | User A disconnects | Other clients show offline / last seen | Not re-tested during this submission verification |
| 19 | Typing indicator | User A types in an open shared chat | User B sees typing UI | Not re-tested during this submission verification |
| 20 | Read receipts | User B opens a chat with unread messages | Sender’s ticks can become double-check (`readBy.length > 1`) | Not re-tested during this submission verification |
| 21 | Image sharing | Attach an allowed image and send | Image renders in the thread | **PASSED** (production) |
| 22 | File sharing | Attach an allowed document within 10MB | File message with download action | **PASSED** (production) |
| 23 | Rejected upload | File too large or disallowed type | Client toast; message not sent | Not re-tested during this submission verification |
| 24 | Message edit | Edit own text message | Content updates; edited flag; other client updates | Not re-tested during this submission verification |
| 25 | Message delete | Delete own message | Soft-deleted placeholder; other client updates | Not re-tested during this submission verification |
| 26 | Responsive UI | Narrow viewport | Sidebar or chat (not both); back control returns to list | Not re-tested during this submission verification |
| 27 | Dark mode | Toggle theme | Theme classes apply across the shell | Not re-tested during this submission verification |
| 28 | Error handling | Stop the API and send a message | Send failure toast | Not re-tested during this submission verification |
| 29 | Auth expiry path | Wait for access token expiry while using the app | Refresh should obtain new tokens, or login redirect if refresh fails | Not re-tested during this submission verification |
| 30 | Socket reconnect (optional) | Drop network briefly with a chat open | Client attempts reconnect and shows reconnect toasts | Not re-tested during this submission verification |
| 31 | Direct `/login` refresh | Open or refresh `https://chatterbox-3ao8.onrender.com/login` as a full document request | SPA should load if the frontend host rewrites to `index.html` | Not re-tested during this submission verification |

Suggested local setup for remaining checks: two terminals (`server`: `npm run dev`, `client`: `npm run dev`), two browser profiles, MongoDB URI and JWT secrets from `server/.env.example`. Cloudinary is not required locally (disk fallback); production file tests used Cloudinary.

---

## Deployment

### Verified live topology

Production is **two Render services**, not a single Express process serving the UI:

| Role | Where |
|------|--------|
| Frontend (React SPA) | **https://chatterbox-3ao8.onrender.com** |
| Backend (Express REST + Socket.io) | A **separate** Render web service |

The production Vite build is given `VITE_API_URL` and `VITE_SOCKET_URL` so the browser talks to that API/socket host (not `localhost`, and not necessarily the frontend hostname). CORS on the API must allow the frontend origin via `CLIENT_URL`.

`GET https://chatterbox-3ao8.onrender.com/api/health` returning 404 does **not** mean the backend is down: that URL is the frontend host, which does not expose `/api`. `GET /api/health` exists on the **API** service in code; it was **not** separately verified for this write-up.

Signup, login, MongoDB-backed persistence, Cloudinary uploads, and two-user real-time messaging were verified through the live frontend. Render’s free tier may delay the first request while a service wakes.

There is **no** `render.yaml`, Dockerfile, or CI workflow in the repository. Dashboard build/start commands and secrets are not stored in git.

### Code path that is *not* the current live topology

`server/server.js` can, when `NODE_ENV=production` and `../client/dist` exists:

1. Serve static files from `client/dist`
2. Fall back to `index.html` for non-API GET routes
3. Keep REST under `/api/*` and Socket.io on the same HTTP server
4. Serve local `/uploads`

That combined-server mode is **repository capability only**. It is **not** the currently verified production deployment.

If `VITE_API_URL` / `VITE_SOCKET_URL` are omitted at build time, the client falls back to `http://localhost:5000`, which would not work for public users. Production must set those variables to the API service URL.

Required API env vars (`server/.env.example`, `server/config/env.js`): `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Production also needs `CLIENT_URL` matching the frontend origin. Cloudinary vars are optional in code (disk fallback); **production file sharing was verified with Cloudinary configured**.

---

## Scalability Considerations

This section separates **what the code does today** from **what would be needed** for a multi-instance production load. Redis, a Socket.io adapter, and horizontal socket scaling are **not** implemented.

### Current implementation

- **Single Node process model** — Express and Socket.io share one HTTP server. Presence is an in-process `Map`.
- **MongoDB** — connection pool `maxPoolSize: 10`; message query index `{ chat: 1, createdAt: -1 }`; chat list index on participants; pagination on history.
- **Rate limiting** — in-process express-rate-limit (per instance, per IP). The global `/api` cap is 100 requests per 15 minutes, which can constrain a busy UI on one IP.
- **Files** — Cloudinary when configured (external object storage); otherwise local disk, which does not follow the user across multiple hosts.
- **Logging** — Winston console; production also writes local log files (not a central log store).
- **Socket recovery** — ping interval/timeout and Socket.io `connectionStateRecovery` (2 minutes). Client reconnection attempts are enabled in `SocketContext`.

### Future improvements (not built)

| Topic | Current | Possible later |
|--------|---------|----------------|
| Socket.io horizontal scaling | One process; rooms and `onlineUsers` are local | `@socket.io/redis-adapter` (or equivalent) so emits reach sockets on other nodes |
| Load balancing | Assumed single instance on Render | Sticky sessions **or** a Redis adapter so a socket is not isolated on the wrong worker |
| Presence | In-memory `Map<userId, Set<socketId>>` | Redis sets/hashes (or similar) shared across instances; TTL heartbeat so crashed nodes do not leave users “online” |
| Files | Cloudinary or local disk | Prefer object storage + CDN everywhere; do not rely on instance-local `uploads/` |
| API rate limits | Memory store per process | Shared store (e.g. Redis) and limits tuned for chat (history + send + search) |
| Database | Indexes + pagination exist | Watch slow queries; shard only if a single cluster is actually saturated |
| Notifications | MongoDB + socket emit | Optional push (web push / FCM) for closed tabs |
| Monitoring | Winston files/console | Host metrics, log aggregation, socket connection gauges, error tracking |

Until an adapter and shared presence store exist, running **more than one** Node replica would split online status and miss some room broadcasts. A single instance (typical free-tier deploy) matches the current design.

---

## Challenges and Solutions

These challenges follow from the architecture in this repo.

### Real-time communication

HTTP request/response cannot push to an idle open tab. The solution in ChatterBox is Socket.io on the same server: REST persists the message, then a socket event notifies rooms and personal channels. The client listens in `ChatContext` and updates lists, threads, and toasts.

### Authentication of socket connections

A socket that skipped login could join rooms and impersonate traffic. The solution is JWT verification in `io.use` before `connection`. REST still uses `protect` independently, so history and sends remain authorized even if a socket drops.

### Online presence

HTTP login does not equal “currently connected.” Presence is derived from live sockets (multi-tab set), with MongoDB `isOnline` / `lastSeen` for users with no remaining sockets. This is accurate on one server and is the main scaling limit noted above.

### Message persistence

If messages lived only in RAM or only on the socket, refresh would empty the thread. Writes go through Mongoose first; the UI reloads via paginated GET. Soft delete keeps a placeholder instead of removing the row.

### Group communication

Groups need membership, admin rules, and fan-out. Chats store `isGroupChat`, `participants`, and `groupAdmin`. REST enforces admin add/remove and leave (including admin handoff). Socket rooms use the chat id so one emit reaches members who have joined that room; personal rooms cover members not currently viewing the group.

### File sharing

Binary files do not fit cleanly in JSON chat payloads. Multer accepts a `file` field on `POST /api/messages`. Cloudinary is used when keys exist; otherwise files are stored under `server/uploads` and referenced by URL on the Message document. The client validates type and size before upload.

---

## Future Enhancements

Realistic follow-ups, not currently claimed as done:

- Shared Socket.io adapter and presence store for more than one server process
- Re-join the open chat room after socket reconnect (client currently joins on `selectChat`)
- HTTP-only cookie session instead of `localStorage` tokens
- Automated API and socket tests
- Deploy config in-repo (build/start commands and env list)
- Delivery vs read receipts with per-user ticks in groups
- Push notifications when the tab is closed

---

## Conclusion

ChatterBox satisfies Happieloop Internship Task 5: Node.js + Socket.io, a React chat UI, send/receive, real-time delivery, MongoDB persistence, and a live Render deployment with this documentation (including scalability notes).

**Verified in production** for this submission: registration, login, MongoDB connectivity, Cloudinary file/image hosting, two-user real-time messaging, and message persistence/display.

Other capabilities (groups, typing, read receipts, edit/delete, reactions, and similar) **exist in the repository** but were **not re-tested** in this verification pass. Redis and multi-instance Socket.io scaling are **not** implemented.

Application behaviour was not changed for this document.

---

**GitHub Repository:** https://github.com/Nilay718/ChatterBox

**Live Demo:** https://chatterbox-3ao8.onrender.com
