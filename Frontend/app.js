// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// Cuántos lugares trae cada página de la vista pública.
const LUGARES_POR_PAGINA = 6;

// Categoría seleccionada en los chips (0 = "Todas"). Vive en una variable
// porque ya no hay <select>: los chips son botones y esta es su memoria.
let categoriaSeleccionada = 0;

document.addEventListener("DOMContentLoaded", () => {
    cargarCategorias();
    cargarLugares();

    // ============================================================
    // BÚSQUEDA EN VIVO con DEBOUNCE: consultamos cuando el dedo
    // descansa ~400ms, no en cada tecla (evita ametrallar la API
    // y las condiciones de carrera).
    // ============================================================
    let temporizadorBusqueda = null;
    document.getElementById("inputBuscar").addEventListener("input", () => {
        clearTimeout(temporizadorBusqueda);   // siguió escribiendo: reinicia el cronómetro
        temporizadorBusqueda = setTimeout(() => cargarLugares(1), 400);
    });

    // Acceso al panel de administración: navegación directa; la guardia
    // de admin.html decide si la sesión es válida o redirige al login.
    document.getElementById("btnPanelAdmin").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "admin.html";
    });
});

// ============================================================
// CHIPS DE CATEGORÍAS: píldoras interactivas que reemplazan al
// viejo <select>. Nacen de la misma API; el clic marca la píldora
// activa y refresca el grid al instante.
// ============================================================
async function cargarCategorias() {
    try {
        const respuesta = await fetch(`${API_URL}/categorias`);
        const categorias = await respuesta.json();
        const contenedor = document.getElementById("chipsCategorias");
        contenedor.innerHTML = "";

        const crearChip = (id, nombre, activo) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip" + (activo ? " activo" : "");
            chip.textContent = nombre;
            chip.addEventListener("click", () => {
                categoriaSeleccionada = id;
                // Visual: solo el chip clickeado queda marcado
                contenedor.querySelectorAll(".chip").forEach(c => c.classList.remove("activo"));
                chip.classList.add("activo");
                cargarLugares(1);
            });
            return chip;
        };

        contenedor.appendChild(crearChip(0, "Todas", true));
        categorias.forEach(cat => contenedor.appendChild(crearChip(cat.idCategoria, cat.nombre, false)));
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

// Control de carrera: si llega una búsqueda nueva, colgamos la llamada
// anterior antes de iniciarla (AbortController = "cuelga el teléfono").
let controladorBusqueda = null;

async function cargarLugares(pagina = 1) {
    const buscar = document.getElementById("inputBuscar").value;

    let url = `${API_URL}/lugares?pagina=${pagina}&porPagina=${LUGARES_POR_PAGINA}&buscar=${encodeURIComponent(buscar)}`;
    if (categoriaSeleccionada > 0) {
        url += `&idCategoria=${categoriaSeleccionada}`;
    }

    // ¿Hay una consulta anterior todavía volando? La colgamos: solo
    // la intención más reciente merece pintarse.
    controladorBusqueda?.abort();
    controladorBusqueda = new AbortController();

    try {
        const respuesta = await fetch(url, { signal: controladorBusqueda.signal });
        const datos = await respuesta.json();
        mostrarLugares(datos.lugares);
        mostrarPaginacion(datos.paginacion);
    } catch (error) {
        // Los abortos son INTENCIONADOS (una búsqueda más nueva les ganó):
        // no son errores, se ignoran en silencio.
        if (error.name !== "AbortError") {
            console.error("Error al consultar la API:", error);
        }
    }
}

// ============================================================
// TARJETAS: la vitrina. Badge de categoría sobre la foto, datos
// reales abajo y "cómo llegar" en dorado Sabanero.
// ============================================================
function mostrarLugares(lugares) {
    const contenedor = document.getElementById("gridLugares");
    contenedor.innerHTML = "";

    if (lugares.length === 0) {
        contenedor.innerHTML = "<p class='sin-resultados'>No se encontraron lugares con los criterios seleccionados. Prueba con otra palabra 🌾</p>";
        return;
    }

    lugares.forEach(lugar => {
        const card = document.createElement("article");
        card.className = "card";

        const urlMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.nombre + ' Sincelejo ' + lugar.direccion)}`;

        card.innerHTML = `
            <div class="card-media">
                <img src="${lugar.imagen}" alt="${lugar.nombre}" loading="lazy"
                     onerror="this.onerror=null; this.src='https://picsum.photos/800/500?random=${lugar.idLugar}';">
                <span class="card-badge">${lugar.categoria}</span>
            </div>
            <div class="card-body">
                <h2 class="card-title">${lugar.nombre}</h2>
                <p class="card-text">${lugar.descripcion}</p>
                <div class="card-meta">
                    <p>📍 ${lugar.direccion}</p>
                    <p>⏰ ${lugar.horario}</p>
                </div>
                <a href="${urlMapa}" target="_blank" rel="noopener noreferrer" class="btn-mapa">
                    🗺️ Cómo llegar
                </a>
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
