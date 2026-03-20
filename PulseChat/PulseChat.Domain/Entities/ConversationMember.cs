namespace PulseChat.Domain.Entities
{
    public class ConversationMember
    {
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }

        public Conversation Conversation { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
