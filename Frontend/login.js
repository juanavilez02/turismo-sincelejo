const API_URL = "http://localhost:5080/api";

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