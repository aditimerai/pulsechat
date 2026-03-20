using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.DTOs.Conversations;
using PulseChat.Domain.Entities;
using PulseChat.Infrastructure;

namespace PulseChat.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Route("[controller]")]          // also handles /conversations (no api/ prefix)
    public class ConversationsController : ControllerBase
    {
        private readonly PulseChatDbContext _context;

        public ConversationsController(PulseChatDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateConversation(List<Guid> memberIds)
        {
            var callerId = GetCurrentUserId();

            // Always include the caller so they are a member of the conversation they created
            if (!memberIds.Contains(callerId))
                memberIds.Add(callerId);

            var conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                Members = memberIds.Select(id => new ConversationMember { UserId = id }).ToList()
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            return Ok(conversation.Id);
        }

        [HttpGet]
        public async Task<IActionResult> GetUserConversations()
        {
            var userId = GetCurrentUserId();

            var conversations = await _context.ConversationMembers
                .Where(m => m.UserId == userId)
                .Select(m => new ConversationSummaryDto
                {
                    Id = m.ConversationId,
                    // For 1-on-1 chats: use the other person's username as the conversation name.
                    // FirstOrDefault falls back to empty string if somehow no other member exists.
                    Name = m.Conversation.Members
                        .Where(cm => cm.UserId != userId)
                        .Select(cm => cm.User.Username)
                        .FirstOrDefault() ?? string.Empty,
                    ParticipantId = m.Conversation.Members
                        .Where(cm => cm.UserId != userId)
                        .Select(cm => (Guid?)cm.UserId)
                        .FirstOrDefault(),
                    Members = m.Conversation.Members
                        .Select(cm => new MemberDto
                        {
                            UserId = cm.UserId,
                            Username = cm.User.Username
                        })
                        .ToList(),
                    LastMessage = m.Conversation.Messages
                        .OrderByDescending(msg => msg.SentAt)
                        .Select(msg => msg.Content)
                        .FirstOrDefault(),
                    LastMessageAt = m.Conversation.Messages
                        .OrderByDescending(msg => msg.SentAt)
                        .Select(msg => (DateTime?)msg.SentAt)
                        .FirstOrDefault(),
                    UnreadCount = m.Conversation.Messages
                        .Count(msg => !msg.IsRead && msg.SenderId != userId)
                })
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            return Ok(conversations);
        }

        private Guid GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(value, out var id))
                throw new UnauthorizedAccessException("Invalid user identity.");
            return id;
        }
    }
}
