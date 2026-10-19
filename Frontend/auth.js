// ============================================================
// auth.js — utilidades compartidas por login y admin:
// sesión, expiración del token y avisos (toasts).
// ============================================================

// Un JWT son 3 bloques base64 unidos por puntos: cabecera.payload.firma.
// Decodificamos el payload para leer la fecha de expiración ('exp', en
// segundos UNIX). Esto NO valida la firma (eso lo hace la API con su clave):
// solo sirve para UX — expulsar al usuario ANTES de que vea errores raros.
function tokenExpirado(token) {
    try {
        let payload64 = token.split(".")[1];
        // base64url usa '-' y '_'; atob espera base64 normal ('+' y '/')
        payload64 = payload64.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(payload64));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true; // token corrupto: lo tratamos como expirado
    }
}

// 401 = "el token no sirve (expiró o es inválido)". OJO: fetch NO lanza
// excepción con los errores 4xx — hay que revisar el status a mano.
function manejarSesionExpirada(respuesta) {
    if (respuesta.status === 401) {
        localStorage.removeItem("token");
        mostrarToast("Tu sesión expiró. Ingresa de nuevo.", "error");
        window.location.href = "login.html";
        return true;
    }
    return false;
}

// ============================================================
// TOASTS: el reemplazo elegante del alert().
// Un aviso flotante que NO bloquea la página, se va solo y cuenta
// lo que pasó con un color claro (verde = bien, rojo = problema).
// ============================================================
function mostrarToast(mensaje, tipo = "exito") {
    // Página sin contenedor de toasts (¿login?): fallback honesto al alert.
    const contenedor = document.getElementById("contenedorToasts");
    if (!contenedor) { alert(mensaje); return; }

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icono">${tipo === "error" ? "⚠️" : "✅"}</span><span>${mensaje}</span>`;
    contenedor.appendChild(toast);

    // A los 3.5s: animación de salida y auto-remoción del DOM.
    setTimeout(() => {
        toast.classList.add("toast-saliendo");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 3500);
}

// ============================================================
// CONFIRMACIÓN ELEGANTE (basada en Promise): el reemplazo del confirm()
// nativo, sin congelar la página. El flujo se lee como lenguaje natural:
//     if (await confirmar("¿Eliminar?")) { ... }
// El await PAUSA la función hasta que el usuario decide — magia de async.
// ============================================================
function confirmar(mensaje, titulo = "¿Estás seguro?") {
    return new Promise(resolver => {
        const modal = document.getElementById("modalConfirmar");
        if (!modal) { resolver(window.confirm(mensaje)); return; }   // fallback

        document.getElementById("confirmarTitulo").textContent = titulo;
        document.getElementById("confirmarMensaje").textContent = mensaje;

        const decidir = (respuesta) => {
            modal.style.display = "none";
            resolver(respuesta);
        };

        // onclick (no addEventListener) reemplaza al handler anterior:
        // sin acumular listeners en cada confirmación
        document.getElementById("btnConfirmarSi").onclick = () => decidir(true);
        document.getElementById("btnConfirmarNo").onclick = () => decidir(false);

        // Clic fuera de la caja o Escape = cancelar (como todo modal decente)
        modal.onclick = (e) => { if (e.target === modal) decidir(false); };
        document.onkeydown = (e) => { if (e.key === "Escape") decidir(false); };

        modal.style.display = "flex";
    });
}
