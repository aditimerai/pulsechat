namespace PulseChat.Application.DTOs.Conversations
{
    public class ConversationSummaryDto
    {
        public Guid Id { get; set; }

        /// <summary>
        /// For 1-on-1 chats: the other participant's username.
        /// For group chats: a custom name (future) or comma-joined member names.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>The other participant's ID — used by the frontend for routing/display.</summary>
        public Guid? ParticipantId { get; set; }

        public List<MemberDto> Members { get; set; } = new();
        public string? LastMessage { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }

    public class MemberDto
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
    }
}
