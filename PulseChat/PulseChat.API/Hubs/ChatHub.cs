using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.Interfaces;
using PulseChat.Infrastructure;

namespace PulseChat.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IPresenceService _presenceService;
        private readonly PulseChatDbContext _context;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(IPresenceService presenceService, PulseChatDbContext context, ILogger<ChatHub> logger)
        {
            _presenceService = presenceService;
            _context = context;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            // Rule: base.OnConnectedAsync() must ALWAYS be called and must NEVER be
            // called on an already-aborted connection. Calling it after Context.Abort()
            // throws internally (outside any try/catch) and causes WebSocket 1011.
            // Solution: skip Context.Abort() entirely — [Authorize] already rejects
            // unauthenticated connections before reaching this method. If we somehow
            // get here without a valid user, just log and let the connection proceed
            // without presence tracking (harmless).

            try
            {
                var userId = GetCurrentUserId();
                if (userId != Guid.Empty)
                {
                    _presenceService.UserConnected(userId, Context.ConnectionId);
                    await Clients.Others.SendAsync("UserOnline", userId);
                }
                else
                {
                    _logger.LogWarning(
                        "OnConnectedAsync: could not resolve user claim for connection {ConnectionId}",
                        Context.ConnectionId);
                }
            }
            catch (Exception ex)
            {
                // Swallow — do not let any exception escape OnConnectedAsync.
                // Any unhandled non-HubException here sends WebSocket close code 1011.
                _logger.LogError(ex, "Error in OnConnectedAsync for connection {ConnectionId}", Context.ConnectionId);
            }

            // Always called unconditionally — never inside try/catch/finally with
            // a possible early-return above it.
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId != Guid.Empty)
                {
                    _presenceService.UserDisconnected(userId, Context.ConnectionId);

                    // Only broadcast offline when this was the user's last active connection
                    // (they may have multiple tabs / devices open).
                    if (!_presenceService.IsOnline(userId))
                        await Clients.Others.SendAsync("UserOffline", userId);
                }

                if (exception != null)
                    _logger.LogError(exception, "Client {ConnectionId} disconnected with error", Context.ConnectionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OnDisconnectedAsync for connection {ConnectionId}", Context.ConnectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Notifies every other member of the conversation that the caller is typing.
        /// Uses Clients.Users() — works for new conversations and across server
        /// instances without requiring explicit group joins.
        /// </summary>
        public async Task Typing(string conversationId)
        {
            if (!Guid.TryParse(conversationId, out var convId))
                throw new HubException("Invalid conversation ID.");

            var userId = GetCurrentUserId();
            if (userId == Guid.Empty) return;

            var otherMemberIds = await _context.ConversationMembers
                .Where(m => m.ConversationId == convId && m.UserId != userId)
                .Select(m => m.UserId.ToString())
                .ToListAsync();

            if (otherMemberIds.Count == 0) return;

            await Clients.Users(otherMemberIds)
                .SendAsync("UserTyping", new { UserId = userId, ConversationId = conversationId });
        }

        private Guid GetCurrentUserId()
        {
            var value = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(value, out var id) ? id : Guid.Empty;
        }
    }
}
