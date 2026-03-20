using System.Collections.Concurrent;
using PulseChat.Application.Interfaces;

namespace PulseChat.API.Services
{
    public class PresenceService : IPresenceService
    {
        // ConcurrentDictionary is required — PresenceService is a Singleton and
        // OnConnected/OnDisconnected are called concurrently from multiple SignalR threads.
        private readonly ConcurrentDictionary<Guid, HashSet<string>> _onlineUsers = new();
        private readonly ConcurrentDictionary<Guid, object> _userLocks = new();

        public void UserConnected(Guid userId, string connectionId)
        {
            var lockObj = _userLocks.GetOrAdd(userId, _ => new object());
            lock (lockObj)
            {
                var connections = _onlineUsers.GetOrAdd(userId, _ => new HashSet<string>());
                connections.Add(connectionId);
            }
        }

        public void UserDisconnected(Guid userId, string connectionId)
        {
            if (!_userLocks.TryGetValue(userId, out var lockObj)) return;
            lock (lockObj)
            {
                if (!_onlineUsers.TryGetValue(userId, out var connections)) return;
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    _onlineUsers.TryRemove(userId, out _);
                    _userLocks.TryRemove(userId, out _);
                }
            }
        }

        public bool IsOnline(Guid userId) => _onlineUsers.ContainsKey(userId);

        public IReadOnlyCollection<Guid> GetOnlineUsers() => _onlineUsers.Keys.ToList();
    }
}
