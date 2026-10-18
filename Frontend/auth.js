// ============================================================
// auth.js — utilidades de sesión compartidas por login y admin.
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
        alert("Tu sesión expiró. Ingresa de nuevo.");
        window.location.href = "login.html";
        return true;
    }
    return false;
}
