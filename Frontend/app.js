// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// ==================== ESTADO DE LA VISTA ====================
const LUGARES_POR_PAGINA = 6;

let categoriaSeleccionada = 0;   // 0 = "Todas"
let soloFavoritos = false;       // el chip ❤️ activado: filtro local
let lugaresActuales = [];        // última respuesta: permite refiltrar sin ir a la API
let paginaActual = 1;

// Control de carrera: si llega una búsqueda nueva, colgamos la anterior.
let controladorBusqueda = null;

// Fotos del hero (rotan con crossfade cada 6 segundos).
const IMAGENES_HERO = [
    "img/majagual.jpg", "img/catedral.jpg", "img/santander.jpg",
    "img/pozo.jpg", "img/museo.jpg", "img/guacari.jpg"
];

document.addEventListener("DOMContentLoaded", () => {
    // ============ TEMA: claro / oscuro ============
    // Primera visita: respetamos el tema del SISTEMA del usuario
    // (prefers-color-scheme); luego mandamos los clicks del usuario.
    const temaInicial = localStorage.getItem("tema")
        ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro");
    aplicarTema(temaInicial);

    document.getElementById("btnTema").addEventListener("click", () => {
        aplicarTema(document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro");
    });

    // ============ ARRANQUE ============
    cargarCategorias();
    cargarLugares();
    iniciarHero();
    iniciarMapa();

    // ============ BÚSQUEDA EN VIVO (debounce 400ms) ============
    let temporizadorBusqueda = null;
    document.getElementById("inputBuscar").addEventListener("input", () => {
        clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = setTimeout(() => cargarLugares(1), 400);
    });

    // ============ DELEGACIÓN DE EVENTOS DEL GRID ============
    // UN solo listener para tres botones que aún no existen (nacen con
    // cada render): corazones, reintentar conexión y reiniciar filtros.
    document.getElementById("gridLugares").addEventListener("click", (e) => {
        const botonFav = e.target.closest(".btn-favorito");
        if (botonFav) {
            alternarFavorito(Number(botonFav.dataset.id), botonFav);
            return;
        }
        if (e.target.closest(".btn-reintentar")) {
            cargarLugares(paginaActual);
            return;
        }
        if (e.target.closest(".btn-reiniciar-filtros")) {
            reiniciarFiltros();
        }
    });

    // Acceso al panel de administración
    document.getElementById("btnPanelAdmin").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "admin.html";
    });
});

// ==================== TEMA ====================
function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
    document.getElementById("btnTema").textContent = tema === "oscuro" ? "☀️" : "🌙";
    localStorage.setItem("tema", tema);
}

// ==================== HERO VIVO (crossfade) ====================
// Dos capas: mientras una se ve, la otra prepara la siguiente foto en
// la sombra. El intercambio de opacidad crea el fundido suave.
function iniciarHero() {
    const capas = [
        document.getElementById("heroFondoA"),
        document.getElementById("heroFondoB")
    ];
    let indiceImagen = 0;
    let capaVisible = 0;

    capas[0].style.backgroundImage = `url(${IMAGENES_HERO[0]})`;

    setInterval(() => {
        indiceImagen = (indiceImagen + 1) % IMAGENES_HERO.length;
        capaVisible = 1 - capaVisible;

        const entrante = capas[capaVisible];
        const saliente = capas[1 - capaVisible];

        entrante.style.backgroundImage = `url(${IMAGENES_HERO[indiceImagen]})`;
        entrante.style.opacity = "1";
        saliente.style.opacity = "0";
    }, 6000);
}

// ==================== CHIPS DE CATEGORÍAS + FAVORITOS ====================
async function cargarCategorias() {
    try {
        const respuesta = await fetch(`${API_URL}/categorias`);
        const categorias = await respuesta.json();
        const contenedor = document.getElementById("chipsCategorias");
        contenedor.innerHTML = "";

        const crearChip = (texto, alClicar, activo = false) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip" + (activo ? " activo" : "");
            chip.textContent = texto;
            chip.addEventListener("click", () => alClicar(chip));
            return chip;
        };

        contenedor.appendChild(crearChip("Todas", (chip) => seleccionarCategoria(0, chip), true));
        categorias.forEach(cat =>
            contenedor.appendChild(crearChip(cat.nombre, (chip) => seleccionarCategoria(cat.idCategoria, chip)))
        );

        // El chip especial: no viene de la API — vive en el navegador del usuario.
        const chipFavoritos = crearChip("❤️ Mis favoritos", (chip) => seleccionarFavoritos(chip));
        chipFavoritos.classList.add("chip-favoritos");
        contenedor.appendChild(chipFavoritos);
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}

function seleccionarCategoria(id, chip) {
    categoriaSeleccionada = id;
    soloFavoritos = false;
    marcarChipActivo(chip);
    cargarLugares(1);
}

function seleccionarFavoritos(chip) {
    categoriaSeleccionada = 0;
    soloFavoritos = true;
    marcarChipActivo(chip);
    aplicarVistaFavoritos();
}

function marcarChipActivo(chip) {
    document.querySelectorAll("#chipsCategorias .chip").forEach(c => c.classList.remove("activo"));
    chip.classList.add("activo");
}

function reiniciarFiltros() {
    document.getElementById("inputBuscar").value = "";
    categoriaSeleccionada = 0;
    soloFavoritos = false;
    const chips = document.querySelectorAll("#chipsCategorias .chip");
    chips.forEach(c => c.classList.remove("activo"));
    chips[0]?.classList.add("activo");
    cargarLugares(1);
}

// ==================== FAVORITOS (localStorage del navegador) ====================
function obtenerFavoritos() {
    try {
        return new Set(JSON.parse(localStorage.getItem("favoritos")) ?? []);
    } catch {
        return new Set();
    }
}

function guardarFavoritos(favoritos) {
    localStorage.setItem("favoritos", JSON.stringify([...favoritos]));
}

function alternarFavorito(id, boton) {
    const favoritos = obtenerFavoritos();
    if (!favoritos.delete(id)) {      // delete devuelve false si no estaba → lo agregamos
        favoritos.add(id);
    }
    guardarFavoritos(favoritos);

    if (soloFavoritos) {
        aplicarVistaFavoritos();     // en la vista de favoritos la fila entera se redibuja
    } else if (boton) {
        // Fuera de esa vista: solo actualizamos el corazón clickeado, sin redibujar
        const activo = favoritos.has(id);
        boton.classList.toggle("activo", activo);
        boton.textContent = activo ? "❤️" : "🤍";
    }
}

function aplicarVistaFavoritos() {
    const filtrados = lugaresActuales.filter(l => obtenerFavoritos().has(l.idLugar));
    if (filtrados.length === 0) {
        renderTarjetas([]);
        renderEstadoVacio(false);
    } else {
        renderTarjetas(filtrados);
    }
    actualizarPinesMapa(filtrados);   // el mapa refleja la vista de favoritos
    document.getElementById("paginacion").innerHTML = "";   // vista local: sin páginas
}

// ==================== CARGA DE LUGARES ====================
async function cargarLugares(pagina = 1) {
    paginaActual = pagina;
    renderSkeleton();   // mientras la API responde, la página "ya está aquí"

    const buscar = document.getElementById("inputBuscar").value;

    let url = `${API_URL}/lugares?pagina=${pagina}&porPagina=${LUGARES_POR_PAGINA}&buscar=${encodeURIComponent(buscar)}`;
    if (categoriaSeleccionada > 0) {
        url += `&idCategoria=${categoriaSeleccionada}`;
    }

    controladorBusqueda?.abort();
    controladorBusqueda = new AbortController();

    try {
        const respuesta = await fetch(url, { signal: controladorBusqueda.signal });
        const datos = await respuesta.json();

        // Si una petición nueva ganó la carrera, esta respuesta llega abortada
        // y ni siquiera llega a este punto: el await salta al catch (AbortError).
        lugaresActuales = datos.lugares;
        soloFavoritos = false;   // toda carga por API sale de la vista de favoritos

        if (datos.lugares.length === 0) {
            renderTarjetas([]);
            renderEstadoVacio(true);
            document.getElementById("paginacion").innerHTML = "";
        } else {
            renderTarjetas(datos.lugares);
            mostrarPaginacion(datos.paginacion);
        }

        // El mapa siempre refleja lo que está en pantalla
        actualizarPinesMapa(datos.lugares);
    } catch (error) {
        if (error.name !== "AbortError") {
            renderEstadoError();
            actualizarPinesMapa([]);
        }
    }
}

// ==================== RENDER: skeleton, tarjetas, estados ====================
function renderSkeleton() {
    const contenedor = document.getElementById("gridLugares");
    contenedor.innerHTML = "";
    for (let i = 0; i < LUGARES_POR_PAGINA; i++) {
        contenedor.insertAdjacentHTML("beforeend", `
            <div class="skeleton" aria-hidden="true">
                <div class="skeleton-media"></div>
                <div class="skeleton-linea skeleton-linea-ancha"></div>
                <div class="skeleton-linea"></div>
                <div class="skeleton-linea skeleton-linea-corta"></div>
                <div class="skeleton-pie"></div>
            </div>
        `);
    }
}

function renderTarjetas(lugares) {
    const contenedor = document.getElementById("gridLugares");
    contenedor.innerHTML = "";

    if (lugares.length === 0) return;   // el estado vacío lo dibuja quien lo necesita

    lugares.forEach((lugar, indice) => {
        const card = document.createElement("article");
        card.className = "card";
        // Entrada escalonada: cada tarjeta nace 70ms tras la anterior (con techo)
        card.style.animationDelay = `${Math.min(indice * 70, 420)}ms`;

        const esFav = obtenerFavoritos().has(lugar.idLugar);
        const urlMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.nombre + ' Sincelejo ' + lugar.direccion)}`;

        card.innerHTML = `
            <div class="card-media">
                <img src="${lugar.imagen}" alt="${lugar.nombre}" loading="lazy"
                     onerror="this.onerror=null; this.src='https://picsum.photos/800/500?random=${lugar.idLugar}';">
                <span class="card-badge">${lugar.categoria}</span>
                <button class="btn-favorito ${esFav ? "activo" : ""}" data-id="${lugar.idLugar}"
                        aria-label="Marcar ${lugar.nombre} como favorito">${esFav ? "❤️" : "🤍"}</button>
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

// Estado vacío: con personalidad y con ACCION, no un simple "sin resultados".
function renderEstadoVacio(conBotonReiniciar) {
    document.getElementById("gridLugares").insertAdjacentHTML("beforeend", `
        <div class="estado">
            <span class="estado-icono">🌾</span>
            <h3>La Sabana está quieta por aquí</h3>
            <p>No encontramos lugares con esos criterios. Prueba con otra palabra o mira todo lo que hay.</p>
            ${conBotonReiniciar ? '<button class="btn-estado btn-reiniciar-filtros">Ver todos los lugares</button>' : ""}
        </div>
    `);
}

// Estado de error: amable, explicativo y con reintentar. (¿Recuerdas el
// apagón de la BD en la nube? Así se recibe ese día, sin silencio.)
function renderEstadoError() {
    const contenedor = document.getElementById("gridLugares");
    contenedor.innerHTML = `
        <div class="estado">
            <span class="estado-icono">📡</span>
            <h3>No pudimos hablar con el servidor</h3>
            <p>La conexión falló o la base de datos está despertando de su siesta 💤. Dale un momento y reintenta.</p>
            <button class="btn-estado btn-reintentar">🔄 Reintentar</button>
        </div>
    `;
    document.getElementById("paginacion").innerHTML = "";
}

// ==================== PAGINACIÓN ====================
function mostrarPaginacion(p) {
    const contenedor = document.getElementById("paginacion");
    contenedor.innerHTML = "";

    if (!p || p.totalPaginas <= 1) return;

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

// ==================== MAPA INTERACTIVO (Leaflet) ====================
// Sincelejo en el mapa: los lugares de la API como pines clickeables.
let mapa = null;            // la instancia de Leaflet (nace UNA sola vez)
let capaLugares = null;      // la capa de pines (se limpia y repuebla en cada carga)

function iniciarMapa() {
    // El corazón de Sincelejo: Parque Santander (9.3045, -75.3966)
    mapa = L.map("mapaLugares", {
        scrollWheelZoom: false   // UX: sin esto la rueda del mouse queda secuestrada
                                 // por el mapa al pasar por encima. Zoom: con botones.
    }).setView([9.3045, -75.3966], 14);

    // Los "tiles" (los dibujitos del terreno) vienen de OpenStreetMap:
    // gratis, sin API key. Solo pedimos el crédito que la licencia exige.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    capaLugares = L.layerGroup().addTo(mapa);
}

// Puebla el mapa con los pines de la lista recibida.
async function actualizarPinesMapa(lugares) {
    if (!mapa) return;
    capaLugares.clearLayers();

    let pines = 0;
    for (const lugar of lugares) {
        let coords = leerCacheGeo(lugar.nombre);

        if (!coords) {
            coords = await geocodificar(lugar);
            if (!coords) continue;        // no ubicable → no pin (su tarjeta sigue igual)
            await esperar(1100);          // cortesía con Nominatim: máx 1 petición/segundo
        }

        capaLugares.addLayer(crearPin(lugar, coords));
        pines++;
    }

    // Encuadre automático: que todos los pines queden a la vista
    if (pines > 0) {
        mapa.fitBounds(capaLugares.getBounds().pad(0.25));
    }
}

function crearPin(lugar, coords) {
    const urlMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.nombre + ' Sincelejo ' + lugar.direccion)}`;
    const imagen = lugar.imagen
        ? `<img src="${lugar.imagen}" alt="${lugar.nombre}" onerror="this.style.display='none'">`
        : "";

    return L.marker(coords).bindPopup(`
        <div class="popup-mapa">
            ${imagen}
            <strong>${lugar.nombre}</strong>
            <span class="popup-categoria">${lugar.categoria}</span><br>
            <a href="${urlMapa}" target="_blank" rel="noopener noreferrer">Cómo llegar →</a>
        </div>
    `);
}

// ---------- Geocodificación: nombre → coordenadas ----------
// Nominatim (OpenStreetMap) convierte "Plaza Majagual, Sincelejo" en lat/long.
// Es gratis y sin API key, pero su etiqueta de uso pide MÁXIMO 1 petición por
// segundo: por eso consultamos en fila con separación y guardamos cada
// coordenada en localStorage PARA SIEMPRE (cada lugar se geocodifica 1 vez).
function leerCacheGeo(nombre) {
    const cache = localStorage.getItem(`geo:${nombre}`);
    if (!cache) return null;
    try { return JSON.parse(cache); }
    catch { return null; }   // cache corrupto: se recalcula
}

async function geocodificar(lugar) {
    try {
        const consulta = encodeURIComponent(`${lugar.nombre}, Sincelejo, Sucre, Colombia`);
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${consulta}`);
        const resultados = await respuesta.json();

        if (resultados.length > 0) {
            const coords = [parseFloat(resultados[0].lat), parseFloat(resultados[0].lon)];
            localStorage.setItem(`geo:${lugar.nombre}`, JSON.stringify(coords));
            return coords;
        }
    } catch (error) {
        console.warn("Geocodificación falló para:", lugar.nombre, error);
    }
    return null;
}

function esperar(ms) {
    return new Promise(resolver => setTimeout(resolver, ms));
}
