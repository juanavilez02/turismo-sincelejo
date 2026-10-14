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

        // 1. OBTENER LUGARES (GET)
        [HttpGet]
        public IActionResult GetLugares([FromQuery] string? buscar, [FromQuery] int? idCategoria)
        {
            var lista = new List<object>();

            using (var con = new MySqlConnection(_connectionString))
            {
                con.Open();
                string sql = @"SELECT l.IdLugar, l.Nombre, l.Descripcion, l.Direccion, l.Imagen, l.Horario, l.Estado, c.Nombre AS Categoria, l.IdCategoria 
                               FROM Lugar l 
                               INNER JOIN Categoria c ON l.IdCategoria = c.IdCategoria 
                               WHERE 1=1";

                if (!string.IsNullOrEmpty(buscar))
                    sql += " AND l.Nombre LIKE @buscar";

                if (idCategoria.HasValue && idCategoria > 0)
                    sql += " AND l.IdCategoria = @idCategoria";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    if (!string.IsNullOrEmpty(buscar))
                        cmd.Parameters.AddWithValue("@buscar", $"%{buscar}%");

                    if (idCategoria.HasValue && idCategoria > 0)
                        cmd.Parameters.AddWithValue("@idCategoria", idCategoria.Value);

                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
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

            return Ok(lista);
        }

        // 2. CREAR LUGAR (POST)
        [Authorize]
        [HttpPost]
        public IActionResult CrearLugar([FromBody] LugarModel model)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                con.Open();
                string sql = @"INSERT INTO Lugar (IdCategoria, Nombre, Descripcion, Direccion, Imagen, Horario, Estado) 
                               VALUES (@IdCategoria, @Nombre, @Descripcion, @Direccion, @Imagen, @Horario, 1)";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@IdCategoria", model.IdCategoria);
                    cmd.Parameters.AddWithValue("@Nombre", model.Nombre);
                    cmd.Parameters.AddWithValue("@Descripcion", model.Descripcion);
                    cmd.Parameters.AddWithValue("@Direccion", model.Direccion);
                    cmd.Parameters.AddWithValue("@Imagen", model.Imagen);
                    cmd.Parameters.AddWithValue("@Horario", model.Horario);

                    cmd.ExecuteNonQuery();
                }
            }

            return Ok(new { mensaje = "Lugar creado exitosamente" });
        }

        // 3. EDITAR LUGAR (PUT)
        [Authorize]
        [HttpPut("{id}")]
        public IActionResult EditarLugar(int id, [FromBody] LugarModel model)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                con.Open();
                string sql = @"UPDATE Lugar 
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

                    cmd.ExecuteNonQuery();
                }
            }

            return Ok(new { mensaje = "Lugar actualizado exitosamente" });
        }

        // 4. ELIMINAR LUGAR (DELETE)
        [Authorize]
        [HttpDelete("{id}")]
        public IActionResult EliminarLugar(int id)
        {
            using (var con = new MySqlConnection(_connectionString))
            {
                con.Open();
                string sql = "DELETE FROM Lugar WHERE IdLugar = @IdLugar";

                using (var cmd = new MySqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@IdLugar", id);
                    cmd.ExecuteNonQuery();
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
        public IActionResult GetCategorias()
        {
            var categorias = new List<object>();

            using (var con = new MySqlConnection(_connectionString))
            {
                con.Open();
                string sql = "SELECT IdCategoria, Nombre, Descripcion FROM Categoria";

                using (var cmd = new MySqlCommand(sql, con))
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
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