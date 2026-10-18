using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArchivosController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;

        public ArchivosController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        // ============================================================
        // SUBIR IMAGEN (POST /api/archivos) — requiere token.
        // Reglas de seguridad de todo upload de archivos:
        //   1. Techo de tamano (2 MB por imagen)
        //   2. Solo extensiones de imagen (nunca confiar en el nombre
        //      ni en el Content-Type que envia el cliente)
        //   3. Nombre final generado por el SERVIDOR (GUID): nunca
        //      conservar el nombre del usuario (colisiones y rutas maliciosas)
        // ============================================================
        [Authorize]
        [HttpPost]
        [RequestSizeLimit(2 * 1024 * 1024)]
        public async Task<IActionResult> SubirImagenAsync(IFormFile archivo)
        {
            if (archivo is null || archivo.Length == 0)
                return BadRequest(new { mensaje = "No se recibio ningun archivo." });

            var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();
            string[] permitidas = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            if (!permitidas.Contains(extension))
                return BadRequest(new { mensaje = "Solo se permiten imagenes: jpg, jpeg, png, gif o webp." });

            if (archivo.Length > 2 * 1024 * 1024)
                return BadRequest(new { mensaje = "La imagen no puede pesar mas de 2 MB." });

            // Carpeta wwwroot/uploads dentro del proyecto (la crea si no existe).
            var carpeta = Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads");
            Directory.CreateDirectory(carpeta);

            // Nombre nuevo e impredecible: el usuario NO decide como se llama en el servidor.
            var nombreNuevo = Guid.NewGuid().ToString("N") + extension;
            var rutaCompleta = Path.Combine(carpeta, nombreNuevo);

            await using (var flujo = new FileStream(rutaCompleta, FileMode.Create))
            {
                await archivo.CopyToAsync(flujo);
            }

            // Devolvemos la URL ABSOLUTA: el frontend la guarda tal cual en lugar.Imagen.
            // Asi funciona igual en local (http://localhost:5080) y en produccion.
            var url = $"{Request.Scheme}://{Request.Host}/uploads/{nombreNuevo}";
            return Ok(new { url });
        }
    }
}
