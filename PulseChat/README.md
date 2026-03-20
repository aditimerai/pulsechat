# PulseChat

A real-time chat application built with ASP.NET Core 9.0, SignalR, and Angular 21.

## Architecture

PulseChat follows a layered architecture:

```
PulseChat.API           - ASP.NET Core Web API (controllers, hubs, services)
PulseChat.Application   - DTOs and interface contracts
PulseChat.Domain        - Entity models
PulseChat.Infrastructure - EF Core DbContext and migrations
pulsechat-web/          - Angular 21 frontend
```

## Tech Stack

### Backend
- **ASP.NET Core 9.0** - Web API
- **Entity Framework Core 9.0** - ORM with SQL Server
- **SignalR** - Real-time WebSocket communication
- **Redis** - SignalR backplane for multi-server scalability
- **JWT Bearer** - Authentication
- **BCrypt.Net** - Password hashing

### Frontend
- **Angular 21** - Standalone components, signals-based state
- **Angular Material** - UI components
- **@microsoft/signalr** - WebSocket client
- **RxJS** - Reactive programming

## Features

- User registration and login with JWT authentication
- Real-time 1-on-1 and group conversations via SignalR
- Message persistence with read receipts
- Typing indicators
- User presence tracking (online/offline)
- Polling fallback when WebSocket is unavailable
- Paginated message history

## Prerequisites

- .NET 9 SDK
- Node.js 18+
- SQL Server (local or Docker)
- Redis (local or Docker)

## Getting Started

### 1. Start Dependencies

**SQL Server (Docker):**
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=welcome" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

**Redis (Docker):**
```bash
docker run -p 6379:6379 -d redis
```

### 2. Backend Setup

```bash
cd PulseChat

# Restore packages
dotnet restore

# Apply database migrations
dotnet ef database update --project PulseChat.Infrastructure --startup-project PulseChat.API

# Run the API
dotnet run --project PulseChat.API
```

The API starts at `http://localhost:5095`.

### 3. Frontend Setup

```bash
cd pulsechat-web

npm install
npm start
```

The app opens at `http://localhost:4200`.

## Configuration

Backend configuration is in `PulseChat.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PulseChatDb;User Id=sa;Password=welcome;TrustServerCertificate=True;",
    "Redis": "localhost:6379,abortConnect=false"
  },
  "JwtSettings": {
    "Key": "your-secret-key",
    "Issuer": "PulseChat",
    "Audience": "PulseChatUsers",
    "ExpiryMinutes": 60
  }
}
```

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT token |
| GET | `/api/users` | Yes | List all users except self |
| POST | `/api/conversations` | Yes | Create a new conversation |
| GET | `/api/conversations` | Yes | Get user's conversations |
| POST | `/api/messages` | Yes | Send a message |
| GET | `/api/messages/{conversationId}` | Yes | Get paginated messages |
| POST | `/api/messages/read/{messageId}` | Yes | Mark message as read |

**SignalR Hub:** `/chatHub`

| Event | Direction | Description |
|-------|-----------|-------------|
| `Typing` | Client → Server | Broadcast typing indicator |
| `ReceiveMessage` | Server → Client | New message delivered |
| `MessageRead` | Server → Client | Read receipt notification |
| `UserOnline` / `UserOffline` | Server → Client | Presence updates |
| `UserTyping` | Server → Client | Typing indicator |

## Database Schema

```
Users               - UserId, Username, Email, PasswordHash, CreatedAt
Conversations       - ConversationId, CreatedAt
ConversationMembers - ConversationId (FK), UserId (FK)
Messages            - MessageId, ConversationId (FK), SenderId (FK), Content, SentAt, IsRead, ReadAt
```

## Project Structure

```
PulseChat/
├── PulseChat.API/
│   ├── Controllers/         # Auth, Users, Conversations, Messages
│   ├── Hubs/                # ChatHub (SignalR)
│   ├── Services/            # JwtService, PresenceService
│   └── Program.cs
├── PulseChat.Application/
│   └── DTOs/                # Request/response models
├── PulseChat.Domain/
│   └── Entities/            # User, Conversation, Message, ConversationMember
├── PulseChat.Infrastructure/
│   ├── PulseChatDbContext.cs
│   └── Migrations/
└── pulsechat-web/           # Angular frontend
    └── src/app/
        ├── core/services/   # AuthService, ChatService, SignalrService
        └── features/
            ├── auth/        # Login, Register
            └── chat/        # ChatLayout, ConversationList, ChatWindow, MessageInput
```
