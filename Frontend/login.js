// Doble vida: si abres la pagina en local (localhost) habla con tu PC;
// si la abres en produccion (onrender.com), habla con la API de la nube.
const API_URL = window.location.hostname === "localhost"
    ? "http://localhost:5080/api"
    : "https://turismo-sincelejo-api.onrender.com/api";

// Si ya existe una sesión válida, no repetimos el trámite: directo al panel.
const tokenGuardado = localStorage.getItem("token");
if (tokenGuardado && !tokenExpirado(tokenGuardado)) {
    window.location.href = "admin.html";
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuarioInput = document.getElementById("usuario").value;
    const passwordInput = document.getElementById("password").value;
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.style.display = "none";

    try {
        const respuesta = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: usuarioInput,
                password: passwordInput
            })
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            // 💾 Guardamos la "pulsera VIP" (Token) en el navegador
            localStorage.setItem("token", data.token);
            
            // 🚪 Entramos al panel de administración
            window.location.href = "admin.html";
        } else {
            mensajeError.textContent = "Usuario o contraseña incorrectos";
            mensajeError.style.display = "block";
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        mensajeError.textContent = "Error al conectar con el servidor";
        mensajeError.style.display = "block";
    }
});