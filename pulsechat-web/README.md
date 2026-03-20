# PulseChat Web

A real-time chat application frontend built with **Angular 21**, **Angular Material**, and **SignalR**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone components, signals, `@for`/`@if`) |
| UI Library | Angular Material 21 (M3 theme) |
| Real-time | `@microsoft/signalr` ^10 |
| HTTP | Angular `HttpClient` with JWT interceptor |
| Reactive | RxJS 7.8, Angular Signals |
| Language | TypeScript 5.9 |
| Styling | SCSS with CSS custom properties |

---

## Features

- **Authentication** — JWT-based login & register with persistent session
- **Real-time messaging** — SignalR WebSocket with HTTP polling fallback
- **Conversation list** — Search, unread badge, last message preview, online indicator
- **Chat window** — Message bubbles (sent/received), date dividers, message grouping, auto-scroll
- **Typing indicator** — Animated dots with debounced input detection
- **Optimistic UI** — Messages appear instantly before server confirmation
- **My Profile** — View username, email, online status from sidebar or "More options" menu
- **New Conversation** — Browse and start chats with other users
- **Clear chat** — Remove local message history for a conversation

---

## Prerequisites

- Node.js 20+
- Angular CLI 21: `npm install -g @angular/cli@21`
- Backend running at `http://localhost:5095` (ASP.NET Core + SignalR)

---

## Getting Started

### Install dependencies

```bash
npm install
```

> If you see peer dependency errors, use:
> ```bash
> npm install --legacy-peer-deps
> ```

### Run development server

```bash
ng serve
```

Open `http://localhost:4200` in your browser.

### Build for production

```bash
ng build
```

Output is in `dist/pulsechat-web/`.

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts       # Attaches Bearer JWT to every request
│   │   ├── models/
│   │   │   └── chat.models.ts            # Conversation, Message, User interfaces
│   │   └── services/
│   │       ├── auth.service.ts           # Login / register / logout
│   │       └── chat.service.ts           # All chat state (signals), SignalR, HTTP
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/                    # Login page
│   │   │   └── register/                # Register page
│   │   └── chat/
│   │       ├── chat-layout/             # Root layout (sidebar + main panel)
│   │       ├── conversation-list/       # Sidebar with conversations & profile
│   │       ├── chat-window/             # Message list + header + more-options menu
│   │       └── message-input/           # Textarea with send & typing indicator
│   ├── app.config.ts                    # provideRouter, provideHttpClient, provideAnimationsAsync
│   ├── app.routes.ts                    # /login, /register, /chat
│   └── app.ts
├── styles.scss                          # Global styles, M3 theme, CSS design tokens
└── index.html
```

---

## Backend API Contract

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/Auth/login` | POST | `{ username, password }` | Returns `{ token }` |
| `/api/Auth/register` | POST | `{ username, email, password }` | Register new user |
| `/api/Users` | GET | — | List all users |
| `/api/Conversations` | GET | — | List conversations for current user |
| `/api/Conversations` | POST | `["userId"]` | Create/get conversation (array of UUIDs) |
| `/api/Messages/{conversationId}` | GET | — | Get messages for a conversation |
| `/api/Messages` | POST | `{ conversationId, content }` | Send a message |

**SignalR hub:** `ws://localhost:5095/chatHub`

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| `ReceiveMessage` | `Message` object | New message broadcast |

> Note: If SignalR is unavailable (1011/disconnect), the app falls back to HTTP polling every 5 seconds.

---

## Environment & Configuration

- **API base URL:** `http://localhost:5095` (set in `chat.service.ts`)
- **JWT storage:** `localStorage` key `token`
- **Proxy config:** `proxy.conf.json` (optional, for dev server proxying)

---

## Known Backend Requirements

For full functionality, the backend should:
1. **Not throw in `OnConnectedAsync`** — prevents 1011 WebSocket drops
2. **Return existing conversation** when `POST /api/Conversations` is called with the same participants (instead of creating a duplicate)
3. **Include `senderName`** in message responses so sender names display correctly
4. **Remove test data** — entries with `name: "string"` are filtered out on the frontend

---

## CSS Design Tokens

Defined in `src/styles.scss`:

```scss
--primary:            #6c63ff;   // Brand purple
--sidebar-bg:         #1e1e2e;   // Dark sidebar
--chat-bg:            #f0f2f5;   // Light message area
--bubble-sent-bg:     #6c63ff;   // Sent message bubble
--bubble-received-bg: #ffffff;   // Received message bubble
```
