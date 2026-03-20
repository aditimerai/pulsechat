# PulseChat

PulseChat is a scalable real-time chat application built with **Angular 21** (frontend) and **ASP.NET Core 9.0** (backend) using **SignalR** for WebSocket communication.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| .NET SDK | 9.0+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| npm | 10+ | Frontend package manager |
| SQL Server | 2022 | Database (or Docker) |
| Redis | Latest | SignalR backplane (or Docker) |
| Docker | Any | Optional — run SQL Server & Redis |

## Quick Start

### 1. Start Infrastructure (Docker)

```bash
# SQL Server
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=welcome" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# Redis
docker run -p 6379:6379 -d redis
```

### 2. Backend (.NET)

```bash
cd PulseChat

# Restore NuGet packages
dotnet restore

# Apply database migrations
dotnet ef database update --project PulseChat.Infrastructure --startup-project PulseChat.API

# Run the API
dotnet run --project PulseChat.API
```

API runs at: `http://localhost:5095`
Swagger UI: `http://localhost:5095/swagger`

### 3. Frontend (Angular)

```bash
cd pulsechat-web

# Install npm packages
npm install

# Start dev server
npm start
```

App runs at: `http://localhost:4200`

> Angular dev server proxies all `/api` requests to `http://localhost:5095` via `proxy.conf.json` — no CORS configuration needed in development.

## How Angular and .NET Connect

```
Angular (port 4200)
    │
    ├── HTTP requests (/api/*)  ──proxy──►  ASP.NET Core API (port 5095)
    │       authInterceptor attaches          Controllers handle REST
    │       JWT Bearer token                  endpoints
    │
    └── WebSocket (/chatHub)  ────────────►  SignalR Hub (port 5095)
            token via ?access_token=          Broadcasts real-time events
            query string                      to connected clients
```

### Authentication Flow

1. Angular calls `POST /api/auth/login` → receives a JWT token
2. Token is stored in `localStorage`
3. `authInterceptor` attaches `Authorization: Bearer <token>` to every HTTP request
4. For SignalR, token is passed as `?access_token=<token>` (WebSocket headers are not supported by browsers)

### Real-time Messaging Flow

1. On login, Angular establishes a SignalR WebSocket connection to `/chatHub`
2. If WebSocket is unavailable, Angular falls back to HTTP polling every 5 seconds
3. When a message is sent via `POST /api/messages`, the server:
   - Persists the message in SQL Server
   - Broadcasts `ReceiveMessage` to all conversation members via SignalR
4. Angular receives the event and updates the UI instantly

## Configuration

### Backend — `PulseChat/PulseChat.API/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PulseChatDb;User Id=sa;Password=welcome;TrustServerCertificate=True;",
    "Redis": "localhost:6379,abortConnect=false"
  },
  "JwtSettings": {
    "Key": "your-secret-key-min-32-chars",
    "Issuer": "PulseChat",
    "Audience": "PulseChatUsers",
    "ExpiryMinutes": 60
  }
}
```

### Frontend — `pulsechat-web/proxy.conf.json`

```json
{
  "/api": {
    "target": "http://localhost:5095",
    "secure": false
  }
}
```

## Project Structure

```
PulseChatApplication/
├── PulseChat/                        # .NET backend solution
│   ├── PulseChat.API/                # Controllers, SignalR hub, JWT & presence services
│   ├── PulseChat.Application/        # DTOs and service interfaces
│   ├── PulseChat.Domain/             # Entity models (User, Conversation, Message)
│   ├── PulseChat.Infrastructure/     # EF Core DbContext and migrations
│   └── PulseChat.sln
└── pulsechat-web/                    # Angular frontend
    └── src/app/
        ├── core/
        │   ├── interceptors/         # JWT auth interceptor
        │   ├── models/               # TypeScript interfaces
        │   └── services/             # AuthService, ChatService, SignalrService
        └── features/
            ├── auth/                 # Login, Register pages
            └── chat/                 # ChatLayout, ConversationList, ChatWindow, MessageInput
```

## Shared API Contract

These DTOs are used by both the .NET backend and Angular frontend:

| .NET DTO | Angular Interface | Description |
|----------|-------------------|-------------|
| `AuthResponse` | `{ token, username }` | Login response |
| `MessageDto` | `Message` | Chat message with sender info |
| `ConversationSummaryDto` | `Conversation` | Conversation with last message & unread count |
| `PagedResult<T>` | `{ items, page, pageSize, totalCount, hasMore }` | Paginated response |

## Common Commands

| Task | Command |
|------|---------|
| Add a migration | `dotnet ef migrations add <Name> --project PulseChat.Infrastructure --startup-project PulseChat.API` |
| Apply migrations | `dotnet ef database update --project PulseChat.Infrastructure --startup-project PulseChat.API` |
| Build backend | `dotnet build` (inside `PulseChat/`) |
| Run backend tests | `dotnet test` (inside `PulseChat/`) |
| Install frontend deps | `npm install` (inside `pulsechat-web/`) |
| Run frontend tests | `npm test` (inside `pulsechat-web/`) |
| Format frontend code | `npx prettier --write .` (inside `pulsechat-web/`) |
