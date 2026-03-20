using System.ComponentModel.DataAnnotations;

namespace PulseChat.Application.DTOs.Conversations
{
    public class CreateConversationRequest
    {
        /// <summary>
        /// IDs of the users to add to the conversation.
        /// The caller is always included automatically — only pass the OTHER user(s).
        /// </summary>
        [Required]
        [MinLength(1, ErrorMessage = "At least one member ID is required.")]
        public List<Guid> MemberIds { get; set; } = new();
    }
}
