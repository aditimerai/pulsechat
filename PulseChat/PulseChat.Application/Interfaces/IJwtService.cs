namespace PulseChat.Application.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(Guid userId, string username);
    }
}
