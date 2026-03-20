using Microsoft.EntityFrameworkCore;
using PulseChat.Domain.Entities;

namespace PulseChat.Infrastructure
{
    public class PulseChatDbContext : DbContext
    {
        public PulseChatDbContext(DbContextOptions<PulseChatDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ConversationMember> ConversationMembers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // --- ConversationMember ---
            modelBuilder.Entity<ConversationMember>()
                .HasKey(cm => new { cm.ConversationId, cm.UserId });

            // --- User indexes ---
            // Unique email: enforced at DB level in addition to app-level check
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Unique username
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // --- Message indexes ---
            // SentAt: used by OrderByDescending in GetMessages
            modelBuilder.Entity<Message>()
                .HasIndex(m => m.SentAt);

            // SenderId: used when querying a user's sent messages
            modelBuilder.Entity<Message>()
                .HasIndex(m => m.SenderId);

            // Composite (ConversationId, SentAt): covers the most common query —
            // "get messages for conversation X ordered by time"
            modelBuilder.Entity<Message>()
                .HasIndex(m => new { m.ConversationId, m.SentAt });
        }
    }
}
