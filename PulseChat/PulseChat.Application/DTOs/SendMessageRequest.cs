using System.ComponentModel.DataAnnotations;

namespace PulseChat.Application.DTOs
{
    public class SendMessageRequest
    {
        [Required]
        public Guid ConversationId { get; set; }

        [Required]
        [MaxLength(4000)]
        public string Content { get; set; } = string.Empty;
    }
}
