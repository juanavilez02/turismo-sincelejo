// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// Cuántos lugares trae cada página de la vista pública.
const LUGARES_POR_PAGINA = 6;

document.addEventListener("DOMContentLoaded", () => {
    cargarCategorias();
    cargarLugares();

    // Regla de oro del frontend: TODO el cableado de eventos se registra
    // UNA sola vez, en la fase de arranque. La fase de render (mostrarLugares)
    // solo dibuja; si registrara listeners, se acumularian duplicados.
    // Toda búsqueda nueva empieza desde la página 1.
    document.getElementById("btnBuscar").addEventListener("click", () => cargarLugares(1));

    // Bonus de usabilidad: la tecla Enter en el cuadro de busqueda tambien busca.
    document.getElementById("inputBuscar").addEventListener("keydown", (e) => {
        if (e.key === "Enter") cargarLugares(1);
    });

    // Acceso al panel de administracion. Antes este listener vivia DENTRO de
    // mostrarLugares(): cada busqueda le sumaba un listener nuevo al mismo boton.
    document.getElementById("btnPanelAdmin").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        window.location.href = "login.html";
    });
});

async function cargarCategorias() {
    try {
        const respuesta = await fetch(`${API_URL}/categorias`);
        const categorias = await respuesta.json();
        const select = document.getElementById("selectCategoria");

        select.innerHTML = '<option value="0">Todas las categorías</option>';

        categorias.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.idCategoria;
            option.textContent = cat.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

async function cargarLugares(pagina = 1) {
    const buscar = document.getElementById("inputBuscar").value;
    const idCategoria = document.getElementById("selectCategoria").value;

    let url = `${API_URL}/lugares?pagina=${pagina}&porPagina=${LUGARES_POR_PAGINA}&buscar=${encodeURIComponent(buscar)}`;
    if (idCategoria > 0) {
        url += `&idCategoria=${idCategoria}`;
    }

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        mostrarLugares(datos.lugares);
        mostrarPaginacion(datos.paginacion);
    } catch (error) {
        console.error("Error al consultar la API:", error);
    }
}

function mostrarLugares(lugares) {
    const contenedor = document.getElementById("gridLugares");
    contenedor.innerHTML = "";

    if (lugares.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b;'>No se encontraron lugares con los criterios seleccionados.</p>";
        return;
    }

    lugares.forEach(lugar => {
        const card = document.createElement("article");
        card.className = "card";

        const urlMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.nombre + ' Sincelejo ' + lugar.direccion)}`;

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${lugar.imagen}" alt="${lugar.nombre}" onerror="this.onerror=null; this.src='https://picsum.photos/800/500?random=${lugar.idLugar}';">
            </div>
            <div class="card-body">
                <span class="card-badge">${lugar.categoria}</span>
                <h2 class="card-title">${lugar.nombre}</h2>
                <p class="card-text">${lugar.descripcion}</p>
                <div class="card-info">
                    <p>📍 <strong>Dirección:</strong> ${lugar.direccion}</p>
                    <p>⏰ <strong>Horario:</strong> ${lugar.horario}</p>
                    
                    <a href="${urlMapa}" target="_blank" rel="noopener noreferrer" class="btn-mapa">
                        🗺️ Cómo llegar
                    </a>
                </div>
            </div>
        `;

        contenedor.appendChild(card);
    });
}

// Dibuja los botones de paginación — solo cuando hay más de una página.
function mostrarPaginacion(p) {
    const contenedor = document.getElementById("paginacion");
    contenedor.innerHTML = "";

    if (!p || p.totalPaginas <= 1) return;

    // Fábrica de botones: texto + página destino + estado (deshabilitado/activo)
    const crearBoton = (texto, destino, deshabilitado = false, activo = false) => {
        const btn = document.createElement("button");
        btn.textContent = texto;
        btn.className = "btn-pagina" + (activo ? " activo" : "");
        btn.disabled = deshabilitado;
        btn.addEventListener("click", () => cargarLugares(destino));
        return btn;
    };

    contenedor.appendChild(crearBoton("← Anterior", p.pagina - 1, p.pagina === 1));

    for (let i = 1; i <= p.totalPaginas; i++) {
        contenedor.appendChild(crearBoton(String(i), i, false, i === p.pagina));
    }

    contenedor.appendChild(crearBoton("Siguiente →", p.pagina + 1, p.pagina === p.totalPaginas));
}