using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LugaresController : ControllerBase
    {
        private readonly string _connectionString;

        public LugaresController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        // 1. OBTENER LUGARES (GET) — paginado
        // async: mientras MySQL responde, este hilo queda libre para atender otras peticiones.
        // Parámetros: pagina (default 1) y porPagina (default 6, techo de 50).
        [HttpGet]
        public async Task<IActionResult> GetLugaresAsync([FromQuery] string? buscar, [FromQuery] int? idCategoria,
                                                         [FromQuery] int pagina = 1, [FromQuery] int porPagina = 6)
        {
            // Higiene de parámetros: NUNCA confiar en lo que el cliente envía.
            if (pagina < 1) pagina = 1;
            if (porPagina < 1) porPagina = 6;
            if (porPagina > 50) porPagina = 50;

            var lista = new List<object>();
            // 'total' se declara FUERA del using porque lo necesitamos DESPUÉS del bloque:
            // una variable declarada dentro de un bloque { } muere cuando el bloque termina.
            int total = 0;

            using (var con = new MySqlConnection(_connectionString))
            {
                await con.OpenAsync();

                // Nombres de tabla en MINUSCULAS: en Linux/MySQL (Aiven, Docker) las tablas
                // son case-sensitive ('Lugar' != 'lugar'). Windows perdonaba; Linux no.
                string desde = @" FROM lugar l 
                               INNER JOIN categoria c ON l.IdCategoria = c.IdCategoria 
                               WHERE 1=1";

                string filtros = "";
                if (!string.IsNullOrEmpty(buscar))
                    filtros += " AND l.Nombre LIKE @buscar";

                if (idCategoria.HasValue && idCategoria > 0)
                    filtros += " AND l.IdCategoria = @idCategoria";

                // --- 1) TOTAL de registros que cumplen los filtros (para calcular páginas) ---
                using (var cmdTotal = new MySqlCommand("SELECT COUNT(*)" + desde + filtros, con))
                {
                    if (!string.IsNullOrEmpty(buscar))
                        cmdTotal.Parameters.AddWithValue("@buscar", $"%{buscar}%");

                    if (idCategoria.HasValue && idCategoria > 0)
                        cmdTotal.Parameters.AddWithValue("@idCategoria", idCategoria.Value);

                    total = Convert.ToInt32(await cmdTotal.ExecuteScalarAsync());
                }

                // --- 2) Solo los registros de la página pedida ---
                // ORDER BY es OBLIGATORIO en paginación: sin orden garantizado,
                // las páginas podrían repetir o perder filas entre consultas.
                string sql = @"SELECT l.IdLugar, l.Nombre, l.Descripcion, l.Direccion, l.Imagen, l.Horario, l.Estado, c.Nombre AS Categoria, l.IdCategoria " + desde + filtros + @"
                               ORDER BY l.IdLugar
                               LIMIT @limite OFFSET @offset";

                int offset = (pagina - 1) * porPagina;

                using (var cmd = new MySqlCommand(sql, con))
                {
                    if (!string.IsNullOrEmpty(buscar))
                        cmd.Parameters.AddWithValue("@buscar", $"%{buscar}%");

                    if (idCategoria.HasValue && idCategoria > 0)
                        cmd.Parameters.AddWithValue("@idCategoria", idCategoria.Value);

                    cmd.Parameters.AddWithValue("@limite", porPagina);
                    cmd.Parameters.AddWithValue("@offset", offset);

                    // ExecuteReaderAsync devuelve el tipo genérico (DbDataReader). Hacemos cast al
                    // tipo concreto de MySQL, que es el que implementa los accesores por nombre:
                    // GetInt32("Nombre"). El cast es seguro: MySql.Data siempre devuelve este tipo.
                    using (var reader = (MySqlDataReader)await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            lista.Add(new
                            {
                                idLugar = reader.GetInt32("IdLugar"),
                                nombre = reader.GetString("Nombre"),
                                descripcion = reader.GetString("Descripcion"),
                                direccion = reader.GetString("Direccion"),
                                imagen = reader.GetString("Imagen"),
                                horario = reader.GetString("Horario"),
                                estado = reader.GetBoolean("Estado"),
                                categoria = reader.GetString("Categoria"),
                                idCategoria = reader.GetInt32("IdCategoria")
                            });
                        }
                    }
                }
            }

            // Matemática de paginación: techo de total/porPagina
            // (las sobras forman su propia última página).
            int totalPaginas = (int)Math.Ceiling(total / (double)porPagina);

            return Ok(new
            {
                lugares = lista,
                paginacion = new { pagina, porPagina, total, totalPaginas }
            });
        }

        // 2. CREAR LUGAR (POST)
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CrearLugarAsync([FromBody] LugarModel model)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                await con.OpenAsync();
                string sql = @"INSERT INTO lugar (IdCategoria, Nombre, Descripcion, Direccion, Imagen, Horario, Estado) 
                               VALUES (@IdCategoria, @Nombre, @Descripcion, @Direccion, @Imagen, @Horario, 1)";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@IdCategoria", model.IdCategoria);
                    cmd.Parameters.AddWithValue("@Nombre", model.Nombre);
                    cmd.Parameters.AddWithValue("@Descripcion", model.Descripcion);
                    cmd.Parameters.AddWithValue("@Direccion", model.Direccion);
                    cmd.Parameters.AddWithValue("@Imagen", model.Imagen);
                    cmd.Parameters.AddWithValue("@Horario", model.Horario);

                    await cmd.ExecuteNonQueryAsync();
                }
            }

            return Ok(new { mensaje = "Lugar creado exitosamente" });
        }

        // 3. EDITAR LUGAR (PUT)
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> EditarLugarAsync(int id, [FromBody] LugarModel model)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                await con.OpenAsync();
                string sql = @"UPDATE lugar 
                               SET IdCategoria = @IdCategoria, Nombre = @Nombre, Descripcion = @Descripcion, 
                                   Direccion = @Direccion, Imagen = @Imagen, Horario = @Horario 
                               WHERE IdLugar = @IdLugar";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@IdLugar", id);
                    cmd.Parameters.AddWithValue("@IdCategoria", model.IdCategoria);
                    cmd.Parameters.AddWithValue("@Nombre", model.Nombre);
                    cmd.Parameters.AddWithValue("@Descripcion", model.Descripcion);
                    cmd.Parameters.AddWithValue("@Direccion", model.Direccion);
                    cmd.Parameters.AddWithValue("@Imagen", model.Imagen);
                    cmd.Parameters.AddWithValue("@Horario", model.Horario);

                    var filasAfectadas = await cmd.ExecuteNonQueryAsync();
                    if (filasAfectadas == 0)
                    {
                        // ExecuteNonQuery devuelve las filas tocadas: 0 = el Id no existe.
                        // Responder 200 "exitosamente" seria mentirle al cliente.
                        return NotFound(new { mensaje = "No existe un lugar con ese Id." });
                    }
                }
            }

            return Ok(new { mensaje = "Lugar actualizado exitosamente" });
        }

        // 4. ELIMINAR LUGAR (DELETE)
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarLugarAsync(int id)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                await con.OpenAsync();
                string sql = "DELETE FROM lugar WHERE IdLugar = @IdLugar";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@IdLugar", id);
                    var filasAfectadas = await cmd.ExecuteNonQueryAsync();
                    if (filasAfectadas == 0)
                    {
                        return NotFound(new { mensaje = "No existe un lugar con ese Id." });
                    }
                }
            }

            return Ok(new { mensaje = "Lugar eliminado exitosamente" });
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class CategoriasController : ControllerBase
    {
        private readonly string _connectionString;

        public CategoriasController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        // OBTENER CATEGORÍAS (GET)
        [HttpGet]
        public async Task<IActionResult> GetCategoriasAsync()
        {
            var categorias = new List<object>();

            using (var con = new MySqlConnection(_connectionString))
            {
                await con.OpenAsync();
                string sql = "SELECT IdCategoria, Nombre, Descripcion FROM categoria";

                using (var cmd = new MySqlCommand(sql, con))
                // Cast al tipo concreto: ver comentario en GetLugaresAsync.
                using (var reader = (MySqlDataReader)await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        categorias.Add(new
                        {
                            idCategoria = reader.GetInt32("IdCategoria"),
                            nombre = reader.GetString("Nombre"),
                            descripcion = reader.GetString("Descripcion")
                        });
                    }
                }
            }

            return Ok(categorias);
        }
    }

    public class LugarModel
    {
        public int IdCategoria { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        public string Imagen { get; set; } = string.Empty;
        public string Horario { get; set; } = string.Empty;
    }
}