using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.DTOs;
using PulseChat.Application.Interfaces;
using PulseChat.Domain.Entities;
using PulseChat.Infrastructure;

namespace PulseChat.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly PulseChatDbContext _context;
        private readonly IJwtService _jwtService;

        public AuthController(PulseChatDbContext context, IJwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var emailTaken = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailTaken)
                return Conflict("Email is already registered.");

            var usernameTaken = await _context.Users.AnyAsync(u => u.Username == request.Username);
            if (usernameTaken)
                return Conflict("Username is already taken.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            // Return same response for "not found" and "wrong password"
            // to avoid leaking which emails are registered (timing attacks aside)
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            var token = _jwtService.GenerateToken(user.Id, user.Username);

            return Ok(new AuthResponse
            {
                Token = token,
                Username = user.Username
            });
        }
    }
}
