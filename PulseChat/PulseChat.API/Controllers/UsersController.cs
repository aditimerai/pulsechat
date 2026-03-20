using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PulseChat.Infrastructure;

namespace PulseChat.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly PulseChatDbContext _context;

        public UsersController(PulseChatDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var userId = GetCurrentUserId();

            var users = await _context.Users
                .Where(u => u.Id != userId)
                .Select(u => new { u.Id, u.Username })
                .ToListAsync();

            return Ok(users);
        }

        private Guid GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(value, out var id))
                throw new UnauthorizedAccessException("Invalid user identity.");
            return id;
        }
    }
}
