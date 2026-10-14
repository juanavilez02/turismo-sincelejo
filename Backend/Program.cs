using Backend.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Registrar los controladores en el contenedor de dependencias
builder.Services.AddControllers();

// ============================================================
// MANEJO GLOBAL DE ERRORES: cualquier excepción no manejada en
// los controladores termina en ExceptionHandlerGlobal, que
// responde con un JSON limpio en lugar de un stack trace.
// ============================================================
builder.Services.AddExceptionHandler<ExceptionHandlerGlobal>();
builder.Services.AddProblemDetails(); // red de seguridad: formato estándar si nadie maneja el error

// ============================================================
// SWAGGER / OPENAPI: el "menú" de la API.
// Genera un documento que la describe (endpoints, parámetros,
// respuestas) y luego lo servimos como panel interactivo.
// ============================================================
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "API Turismo Sincelejo",
        Version = "v1",
        Description = "API REST del portal turistico de Sincelejo. Lugares y categorias con autenticacion JWT."
    });

    // Boton "Authorize" 🔒: permite pegar el token JWT y probar
    // los endpoints protegidos (POST/PUT/DELETE) desde el panel.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega tu token JWT SIN la palabra 'Bearer'. Consíguelo en POST /api/auth/login."
    });

    // En Microsoft.OpenApi v2 las referencias usan OpenApiSecuritySchemeReference
    // (el viejo OpenApiReference/Reference ya no existe).
    // Parametros: (referenceId, hostDocument, externalResource) -> local: null, null.
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            // El lambda nos entrega el documento real de la API: se lo damos
            // a la referencia (hostDocument) para que apunte al esquema "Bearer".
            new OpenApiSecuritySchemeReference("Bearer", document, null),
            new List<string>()
        }
    });
});

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

// El "atrapa-todo" va PRIMERO en la cadena: envuelve a todo lo demás.
app.UseExceptionHandler();

app.UseCors("AllowAll");

// ============================================================
// SWAGGER: el panel de pruebas de la API.
// En un producto real se suele limitar solo a desarrollo:
//   if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
// Aqui lo dejamos siempre visible para poder demostrarlo.
// ============================================================
app.UseSwagger();   // genera el documento "menu" (/swagger/v1/swagger.json)
app.UseSwaggerUI(); // sirve la carta interactiva en /swagger

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
