namespace PulseChat.Application.DTOs.Conversations
{
    public class ConversationSummaryDto
    {
        public Guid Id { get; set; }
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
