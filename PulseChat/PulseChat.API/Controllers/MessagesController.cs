using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PulseChat.API.Hubs;
using PulseChat.Application.Common;
using PulseChat.Application.DTOs;
using PulseChat.Application.DTOs.Messages;
using PulseChat.Domain.Entities;
using PulseChat.Infrastructure;

namespace PulseChat.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly PulseChatDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly ILogger<MessagesController> _logger;

        public MessagesController(
            PulseChatDbContext context,
            IHubContext<ChatHub> hubContext,
            ILogger<MessagesController> logger
        )
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage(SendMessageRequest request)
        {
            var userId = GetCurrentUserId();

            var isMember = await _context.ConversationMembers.AnyAsync(m =>
                m.ConversationId == request.ConversationId && m.UserId == userId
            );
            if (!isMember)
                return Forbid();

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ConversationId = request.ConversationId,
                SenderId = userId,
                Content = request.Content,
                SentAt = DateTime.UtcNow,
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var senderUsername =
                await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => u.Username)
                    .FirstOrDefaultAsync() ?? string.Empty;

            var memberIds = await _context.ConversationMembers
                .Where(m => m.ConversationId == request.ConversationId)
                .Select(m => m.UserId.ToString())
                .ToListAsync();

            var dto = ToDto(message, senderUsername);

            // Broadcast is best-effort — message is already persisted.
            // A Redis outage must not turn a successful DB write into a 500.
            try
            {
                await _hubContext.Clients.Users(memberIds).SendAsync("ReceiveMessage", dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Real-time broadcast failed for message {MessageId}; message is saved",
                    message.Id
                );
            }

            return Ok(dto);
        }

        [HttpGet("{conversationId}")]
        public async Task<IActionResult> GetMessages(
            Guid conversationId,
            int page = 1,
            int pageSize = 20
        )
        {
            var userId = GetCurrentUserId();

            var isMember = await _context.ConversationMembers.AnyAsync(m =>
                m.ConversationId == conversationId && m.UserId == userId
            );
            if (!isMember)
                return Forbid();

            if (pageSize > 100)
                pageSize = 100;

            var totalCount = await _context.Messages.CountAsync(m =>
                m.ConversationId == conversationId
            );

            var messages = await _context
                .Messages.Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Join(
                    _context.Users,
                    m => m.SenderId,
                    u => u.Id,
                    (m, u) => new MessageDto
                    {
                        Id = m.Id,
                        ConversationId = m.ConversationId,
                        SenderId = m.SenderId,
                        SenderName = u.Username,
                        Content = m.Content,
                        SentAt = m.SentAt,
                        IsRead = m.IsRead,
                        ReadAt = m.ReadAt,
                    }
                )
                .ToListAsync();

            return Ok(
                new PagedResult<MessageDto>
                {
                    Items = messages,
                    Page = page,
                    PageSize = pageSize,
                    TotalCount = totalCount,
                }
            );
        }

        [HttpPost("read/{messageId}")]
        public async Task<IActionResult> MarkAsRead(Guid messageId)
        {
            var userId = GetCurrentUserId();

            var message = await _context.Messages.FindAsync(messageId);
            if (message == null)
                return NotFound();

            var isMember = await _context.ConversationMembers.AnyAsync(m =>
                m.ConversationId == message.ConversationId && m.UserId == userId
            );
            if (!isMember)
                return Forbid();

            message.IsRead = true;
            message.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var memberIds = await _context
                .ConversationMembers.Where(m => m.ConversationId == message.ConversationId)
                .Select(m => m.UserId.ToString())
                .ToListAsync();

            try
            {
                await _hubContext.Clients.Users(memberIds).SendAsync(
                    "MessageRead",
                    new
                    {
                        MessageId = messageId,
                        ReadBy = userId,
                        ReadAt = message.ReadAt,
                    }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Real-time broadcast failed for MessageRead {MessageId}; receipt is saved",
                    messageId
                );
            }

            return Ok();
        }

        private Guid GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(value, out var id))
                throw new UnauthorizedAccessException("Invalid user identity.");
            return id;
        }

        private static MessageDto ToDto(Message message, string senderUsername) =>
            new()
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = senderUsername,
                Content = message.Content,
                SentAt = message.SentAt,
                IsRead = message.IsRead,
                ReadAt = message.ReadAt,
            };
    }
}
