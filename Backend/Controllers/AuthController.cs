using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        // Inyección de dependencias: .NET nos entrega la configuración al crear el controlador.
        // Es el mismo patrón que ya usaba LugaresController con la cadena de conexión.
        public AuthController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto login)
        {
            // Las credenciales ahora viven en appsettings.json (sección "AdminUser").
            // ⚠️ En un proyecto real se valida contra MySQL con contraseñas hasheadas (BCrypt).
            var usuarioValido = _configuration["AdminUser:Usuario"];
            var passwordValida = _configuration["AdminUser:Password"];

            if (login.Usuario == usuarioValido && login.Password == passwordValida)
            {
                var token = GenerarJwtToken(login.Usuario);
                return Ok(new { token });
            }

            return Unauthorized("Usuario o contraseña incorrectos");
        }

        private string GenerarJwtToken(string usuario)
        {
            // La MISMA clave de appsettings.json que usa Program.cs para validar.
            // Ya no hay duplicados: una sola fuente de verdad en toda la app.
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);
            var claims = new[] { new Claim(ClaimTypes.Name, usuario) };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                // 8 horas = una jornada de trabajo razonable para un panel de admin.
            // El frontend detecta la expiración leyendo 'exp' del JWT (auth.js).
            Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class LoginDto
    {
        public string Usuario { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}