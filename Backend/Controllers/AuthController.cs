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
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto login)
        {
            // ⚠️ En un proyecto real validas contra MySQL. Para prueba rápida:
            if (login.Usuario == "admin" && login.Password == "123456")
            {
                var token = GenerarJwtToken(login.Usuario);
                return Ok(new { token });
            }

            return Unauthorized("Usuario o contraseña incorrectos");
        }

        private string GenerarJwtToken(string usuario)
        {
            var key = Encoding.UTF8.GetBytes("TuClaveSecretaSuperSeguraDeAlmenos32Caracteres!");
            var claims = new[] { new Claim(ClaimTypes.Name, usuario) };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(2), // El token dura 2 horas
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