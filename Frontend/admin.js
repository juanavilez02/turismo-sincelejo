// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// 🔒 VERIFICACIÓN DE SEGURIDAD (guard clause): no basta con que EXISTA un
// token — también verificamos que no haya EXPIRADO (auth.js trae el helper).
const token = localStorage.getItem("token");

if (!token || tokenExpirado(token)) {
    localStorage.removeItem("token"); // limpiamos el token vencido o corrupto
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // Carga inicial de datos
    cargarCategoriasForm();
    cargarTablaLugares();
    cargarTablaCategorias();

    // Cableado de eventos: todo en UN solo lugar y registrado UNA sola vez.
    // (Antes habia dos DOMContentLoaded y la verificacion de token duplicada.)
    document.getElementById("btnNuevoLugar").addEventListener("click", abrirModalCrear);
    document.getElementById("btnCerrarModal").addEventListener("click", cerrarModal);
    document.getElementById("btnCancelarForm").addEventListener("click", cerrarModal);
    document.getElementById("formLugar").addEventListener("submit", guardarLugar);

    // Imagen del lugar: pestañas (subir archivo / URL) + vista previa
    document.getElementById("tabSubir").addEventListener("click", () => activarTabImagen("subir"));
    document.getElementById("tabUrl").addEventListener("click", () => activarTabImagen("url"));
    document.getElementById("formImagenArchivo").addEventListener("change", subirImagenSeleccionada);
    document.getElementById("formImagen").addEventListener("input", mostrarPreviewImagen);

    // Categorías: tabla + modal propio
    document.getElementById("btnNuevaCategoria").addEventListener("click", abrirModalCrearCategoria);
    document.getElementById("btnCerrarModalCategoria").addEventListener("click", cerrarModalCategoria);
    document.getElementById("btnCancelarCategoria").addEventListener("click", cerrarModalCategoria);
    document.getElementById("formCategoriaModal").addEventListener("submit", guardarCategoria);

    // Sidebar (rediseño Fase 2): menú móvil, navegación suave y acción rápida
    const sidebar = document.getElementById("sidebar");
    document.getElementById("btnMenuMovil").addEventListener("click", () => sidebar.classList.toggle("abierta"));
    document.getElementById("btnNuevoLugarNav").addEventListener("click", () => {
        sidebar.classList.remove("abierta");
        abrirModalCrear();
    });
    document.getElementById("btnNuevaCategoriaNav").addEventListener("click", () => {
        sidebar.classList.remove("abierta");
        abrirModalCrearCategoria();
    });
    document.querySelectorAll(".nav-item[data-seccion]").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelector(item.dataset.seccion).scrollIntoView({ behavior: "smooth" });
            sidebar.classList.remove("abierta");   // en móvil: navegar cierra el cajón
        });
    });

    // Reloj del topbar: se actualiza solo cada 30 segundos
    const actualizarReloj = () => {
        document.getElementById("reloj").textContent =
            new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    };
    actualizarReloj();
    setInterval(actualizarReloj, 30000);

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", () => {
            // Borra la pulsera guardada y vuelve a la vista publica
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }
});

async function cargarCategoriasForm() {
    try {
        const respuesta = await fetch(`${API_URL}/categorias`);
        const categorias = await respuesta.json();
        const selectForm = document.getElementById("formCategoria");

        selectForm.innerHTML = '<option value="">Seleccione una categoría</option>';

        categorias.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.idCategoria;
            option.textContent = cat.nombre;
            selectForm.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

async function cargarTablaLugares() {
    try {
        // La API ahora pagina: pedimos el techo permitido (50 por página)
        // para que la tabla de administración muestre el catálogo completo.
        const respuesta = await fetch(`${API_URL}/lugares?porPagina=50`);
        const datos = await respuesta.json();
        renderTabla(datos.lugares);

        // KPIs en vivo: los números del panel salen de los mismos datos
        actualizarKpi("kpiLugares", datos.paginacion.total);
        actualizarKpi("kpiPublicados", datos.lugares.filter(l => l.estado).length);
    } catch (error) {
        console.error("Error al cargar la tabla de administración:", error);
    }
}

// Escribe un valor en una tarjeta KPI (si el elemento existe).
function actualizarKpi(id, valor) {
    const kpi = document.getElementById(id);
    if (kpi) kpi.textContent = valor;
}

// ---- Imagen del lugar: pestañas Subir archivo / URL ----
function activarTabImagen(modo) {
    const esSubir = modo === "subir";
    document.getElementById("tabSubir").classList.toggle("activo", esSubir);
    document.getElementById("tabUrl").classList.toggle("activo", !esSubir);
    document.getElementById("formImagenArchivo").style.display = esSubir ? "block" : "none";
    document.getElementById("formImagen").style.display = esSubir ? "none" : "block";
}

// Cuando eligen un archivo: se sube YA a la API y la URL que devuelve
// queda asignada en el campo de imagen (fuente de verdad del formulario).
async function subirImagenSeleccionada() {
    const input = document.getElementById("formImagenArchivo");
    const archivo = input.files[0];
    if (!archivo) return;

    if (archivo.size > 2 * 1024 * 1024) {
        alert("La imagen no puede pesar más de 2 MB.");
        input.value = "";
        return;
    }

    // FormData construye el cuerpo multipart solo. OJO: NO se envía
    // Content-Type a mano — el navegador agrega el 'boundary' necesario.
    const datos = new FormData();
    datos.append("archivo", archivo);

    try {
        const respuesta = await fetch(`${API_URL}/archivos`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: datos
        });

        if (respuesta.ok) {
            const resultado = await respuesta.json();
            document.getElementById("formImagen").value = resultado.url;
            mostrarPreviewImagen();
            alert("Imagen subida: la URL quedó asignada al lugar.");
            input.value = "";
        } else if (!manejarSesionExpirada(respuesta)) {
            alert("No se pudo subir la imagen.");
        }
    } catch (error) {
        console.error("Error subiendo imagen:", error);
    }
}

// Vista previa con lo que haya en el campo de imagen.
function mostrarPreviewImagen() {
    const url = document.getElementById("formImagen").value.trim();
    const preview = document.getElementById("previewImagen");
    if (url) {
        preview.src = url;
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }
}

// ==================== CATEGORÍAS ====================

async function cargarTablaCategorias() {
    try {
        const respuesta = await fetch(`${API_URL}/categorias`);
        const categorias = await respuesta.json();
        renderTablaCategorias(categorias);
        actualizarKpi("kpiCategorias", categorias.length);
    } catch (error) {
        console.error("Error al cargar las categorías:", error);
    }
}

function renderTablaCategorias(categorias) {
    const tbody = document.getElementById("tablaCategoriasBody");
    tbody.innerHTML = "";

    if (!categorias || categorias.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No hay categorías registradas.</td></tr>";
        return;
    }

    categorias.forEach(cat => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${cat.nombre}</strong></td>
            <td>${cat.descripcion ?? "—"}</td>
            <td>${cat.totalLugares}</td>
            <td>
                <div class="tabla-actions">
                    <button class="btn-editar" onclick='abrirModalEditarCategoria(${JSON.stringify(cat).replace(/'/g, "&#39;")})'>✏️ Editar</button>
                    <button class="btn-eliminar" onclick="eliminarCategoria(${cat.idCategoria})">🗑️ Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalCrearCategoria() {
    document.getElementById("modalCategoriaTitulo").textContent = "Nueva Categoría";
    document.getElementById("categoriaId").value = "0";
    document.getElementById("formCategoriaModal").reset();
    document.getElementById("modalCategoria").style.display = "flex";
}

function abrirModalEditarCategoria(cat) {
    document.getElementById("modalCategoriaTitulo").textContent = "Editar Categoría";
    document.getElementById("categoriaId").value = cat.idCategoria;
    document.getElementById("formCatNombre").value = cat.nombre;
    document.getElementById("formCatDescripcion").value = cat.descripcion ?? "";
    document.getElementById("modalCategoria").style.display = "flex";
}

function cerrarModalCategoria() {
    document.getElementById("modalCategoria").style.display = "none";
}

async function guardarCategoria(e) {
    e.preventDefault();

    const id = document.getElementById("categoriaId").value;
    const datos = {
        nombre: document.getElementById("formCatNombre").value,
        descripcion: document.getElementById("formCatDescripcion").value
    };

    const esEdicion = id > 0;
    const url = esEdicion ? `${API_URL}/categorias/${id}` : `${API_URL}/categorias`;
    const metodo = esEdicion ? "PUT" : "POST";

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert(esEdicion ? "Categoría actualizada correctamente" : "Categoría creada correctamente");
            cerrarModalCategoria();
            cargarTablaCategorias();
            cargarCategoriasForm(); // el select del formulario de lugares se refresca también
        } else if (!manejarSesionExpirada(respuesta)) {
            // Mostramos el mensaje que manda la API (ej: "el nombre es obligatorio")
            const error = await respuesta.json().catch(() => null);
            alert(error?.mensaje ?? "Error al procesar la solicitud");
        }
    } catch (error) {
        console.error("Error al guardar la categoría:", error);
    }
}

async function eliminarCategoria(id) {
    if (!confirm("¿Eliminar esta categoría? (Solo es posible si no tiene lugares asociados)")) return;

    try {
        const respuesta = await fetch(`${API_URL}/categorias/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (respuesta.ok) {
            alert("Categoría eliminada correctamente");
            cargarTablaCategorias();
            cargarCategoriasForm();
        } else if (!manejarSesionExpirada(respuesta)) {
            // Aquí brilla el conteo del backend: "tiene N lugares asociados..."
            const error = await respuesta.json().catch(() => null);
            alert(error?.mensaje ?? "No se pudo eliminar la categoría");
        }
    } catch (error) {
        console.error("Error al eliminar la categoría:", error);
    }
}

function renderTabla(lugares) {
    const tbody = document.getElementById("tablaLugaresBody");
    tbody.innerHTML = "";

    if (lugares.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No hay lugares registrados.</td></tr>";
        return;
    }

    lugares.forEach(lugar => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><img src="${lugar.imagen}" class="img-thumb" alt="${lugar.nombre}" onerror="this.onerror=null; this.src='https://picsum.photos/100/100';"></td>
            <td><strong>${lugar.nombre}</strong></td>
            <td><span class="card-badge">${lugar.categoria}</span></td>
            <td>${lugar.direccion}</td>
            <td>${lugar.horario}</td>
            <td>
                <div class="tabla-actions">
                    <button class="btn-editar" onclick="abrirModalEditar(${JSON.stringify(lugar).replace(/"/g, '&quot;')})">✏️ Editar</button>
                    <button class="btn-eliminar" onclick="eliminarLugar(${lugar.idLugar})">🗑️ Eliminar</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function abrirModalCrear() {
    document.getElementById("modalTitulo").textContent = "Agregar Nuevo Lugar";
    document.getElementById("lugarId").value = "0";
    document.getElementById("formLugar").reset();
    activarTabImagen("subir");
    document.getElementById("previewImagen").style.display = "none";
    document.getElementById("modalLugar").style.display = "flex";
}

function abrirModalEditar(lugar) {
    document.getElementById("modalTitulo").textContent = "Editar Lugar";
    document.getElementById("lugarId").value = lugar.idLugar;
    document.getElementById("formNombre").value = lugar.nombre;
    document.getElementById("formCategoria").value = lugar.idCategoria;
    document.getElementById("formDescripcion").value = lugar.descripcion;
    document.getElementById("formDireccion").value = lugar.direccion;
    document.getElementById("formHorario").value = lugar.horario;
    document.getElementById("formImagen").value = lugar.imagen;

    // Al editar mostramos la pestaña de URL (la imagen ya existe) con su preview.
    activarTabImagen("url");
    mostrarPreviewImagen();

    document.getElementById("modalLugar").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modalLugar").style.display = "none";
}

async function guardarLugar(e) {
    e.preventDefault();

    // Validación de imagen en JS (el campo vive en pestañas: archivo o URL)
    if (!document.getElementById("formImagen").value.trim()) {
        alert("El lugar necesita una imagen: sube un archivo o pega una URL.");
        return;
    }

    const id = document.getElementById("lugarId").value;
    const datos = {
        idCategoria: parseInt(document.getElementById("formCategoria").value),
        nombre: document.getElementById("formNombre").value,
        descripcion: document.getElementById("formDescripcion").value,
        direccion: document.getElementById("formDireccion").value,
        horario: document.getElementById("formHorario").value,
        imagen: document.getElementById("formImagen").value
    };

    const esEdicion = id > 0;
    const url = esEdicion ? `${API_URL}/lugares/${id}` : `${API_URL}/lugares`;
    const metodo = esEdicion ? "PUT" : "POST";

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert(esEdicion ? "Lugar actualizado correctamente" : "Lugar guardado correctamente");
            cerrarModal();
            cargarTablaLugares();
        } else if (!manejarSesionExpirada(respuesta)) {
            alert("Error al procesar la solicitud");
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    }
}

async function eliminarLugar(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este lugar de la base de datos?")) {
        try {
            const respuesta = await fetch(`${API_URL}/lugares/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (respuesta.ok) {
                alert("Lugar eliminado correctamente");
                cargarTablaLugares();
            } else if (!manejarSesionExpirada(respuesta)) {
                alert("No se pudo eliminar el lugar");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
    
}