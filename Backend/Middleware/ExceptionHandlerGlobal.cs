using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Backend.Middleware
{
    // ============================================================
    // MANEJADOR GLOBAL DE EXCEPCIONES
    // Atrapa cualquier error no manejado en los controladores y
    // responde con un JSON limpio al cliente (nunca un stack trace).
    // El detalle técnico completo queda registrado en los logs
    // del servidor, donde solo lo ve el equipo.
    // ============================================================
    public class ExceptionHandlerGlobal : IExceptionHandler
    {
        private readonly ILogger<ExceptionHandlerGlobal> _logger;
        private readonly IWebHostEnvironment _environment;

        // Inyección de dependencias: el logger y el entorno llegan solos,
        // igual que la IConfiguration que ya conocemos.
        public ExceptionHandlerGlobal(ILogger<ExceptionHandlerGlobal> logger, IWebHostEnvironment environment)
        {
            _logger = logger;
            _environment = environment;
        }

        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            // El "libro de incidentes": aquí SÍ va todo el detalle técnico.
            _logger.LogError(exception, "Excepcion no manejada en {Metodo} {Ruta}",
                httpContext.Request.Method, httpContext.Request.Path);

            // Lo que el cliente recibe: calma y estructura.
            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            httpContext.Response.ContentType = "application/json";

            var cuerpo = new Dictionary<string, string>
            {
                ["error"] = "Ocurrio un problema al procesar la solicitud.",
                ["ruta"] = httpContext.Request.Path.ToString()
            };

            // En desarrollo nos mostramos el detalle (nos ayuda a debuggear).
            // En produccion NUNCA: revelar internals es regalar informacion
            // a cualquiera que provoqu errores a proposito.
            if (_environment.IsDevelopment())
            {
                cuerpo["detalle"] = exception.Message;
            }

            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(cuerpo), cancellationToken);

            return true; // "Excepcion manejada": no la dejes propagar.
        }
    }
}
