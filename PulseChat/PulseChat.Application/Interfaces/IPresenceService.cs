namespace PulseChat.Application.Interfaces
{
    public interface IPresenceService
    {
        void UserConnected(Guid userId, string connectionId);
        void UserDisconnected(Guid userId, string connectionId);
        bool IsOnline(Guid userId);
        IReadOnlyCollection<Guid> GetOnlineUsers();
    }
}
