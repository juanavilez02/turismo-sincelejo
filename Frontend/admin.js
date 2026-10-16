// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// 🔒 VERIFICACIÓN DE SEGURIDAD (guard clause): si no hay token guardado,
// expulsamos al visitante al login ANTES de ejecutar cualquier otra cosa.
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // Carga inicial de datos
    cargarCategoriasForm();
    cargarTablaLugares();

    // Cableado de eventos: todo en UN solo lugar y registrado UNA sola vez.
    // (Antes habia dos DOMContentLoaded y la verificacion de token duplicada.)
    document.getElementById("btnNuevoLugar").addEventListener("click", abrirModalCrear);
    document.getElementById("btnCerrarModal").addEventListener("click", cerrarModal);
    document.getElementById("btnCancelarForm").addEventListener("click", cerrarModal);
    document.getElementById("formLugar").addEventListener("submit", guardarLugar);

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
    } catch (error) {
        console.error("Error al cargar la tabla de administración:", error);
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

    document.getElementById("modalLugar").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modalLugar").style.display = "none";
}

async function guardarLugar(e) {
    e.preventDefault();

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
        } else {
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
            } else {
                alert("No se pudo eliminar el lugar");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
    
}