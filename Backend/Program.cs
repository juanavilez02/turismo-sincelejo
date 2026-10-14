using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Registrar los controladores en el contenedor de dependencias
builder.Services.AddControllers();

// Habilitar política CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
// Configuración de Autenticación con JWT
// La clave secreta ahora vive en appsettings.json (sección "Jwt"), no en el código.
// Un solo lugar donde guardarla = una sola fuente de verdad.
var jwtKey = builder.Configuration["Jwt:Key"];
var key = Encoding.UTF8.GetBytes(jwtKey!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"]
        };
    });
var app = builder.Build();

app.UseCors("AllowAll");

var imageDirectory = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "Frontend", "img"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imageDirectory),
    RequestPath = "/img"
});

app.UseAuthentication(); // 👈 1. Autentica quién es el usuario
app.UseAuthorization();  // 👈 2. Autoriza si tiene permiso
// Mapear automáticamente todos los controladores de la carpeta Controllers
app.MapControllers();

app.Run();
