using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PulseChat.Infrastructure;

public class PulseChatDbContextFactory : IDesignTimeDbContextFactory<PulseChatDbContext>
{
    public PulseChatDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PulseChatDbContext>();

        optionsBuilder.UseSqlServer(
            "Server=localhost;Database=PulseChatDb;User Id=sa;Password=welcome;TrustServerCertificate=True;"
        );

        return new PulseChatDbContext(optionsBuilder.Options);
    }
}