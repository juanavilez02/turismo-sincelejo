# 🌴 Turismo en Sincelejo — Plataforma Web

Aplicación web para la promoción turística de Sincelejo (capital de Sucre, Colombia). Permite a los **turistas** consultar lugares emblemáticos de la ciudad (con búsqueda y filtros por categoría) y a los **administradores** gestionar el contenido mediante un panel CRUD protegido con autenticación JWT.

---

## 📑 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Estructura de Carpetas](#-estructura-de-carpetas)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Base de Datos](#-base-de-datos)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Autenticación con JWT](#-autenticación-con-jwt)
- [Vistas del Frontend](#-vistas-del-frontend)
- [Credenciales de Acceso](#-credenciales-de-acceso)
- [Observaciones y Mejoras Futuras](#-observaciones-y-mejoras-futuras)

---

## 📖 Descripción General

El sistema está compuesto por dos módulos principales:

| Módulo | Descripción | Público |
|---|---|---|
| **Vista Pública** | Catálogo de lugares turísticos con tarjetas, búsqueda por nombre, filtro por categoría y enlace a Google Maps ("Cómo llegar"). | Turistas (sin registro) |
| **Panel de Administración** | CRUD completo de lugares (crear, leer, actualizar, eliminar) mediante tabla y formulario modal. Requiere inicio de sesión con JWT. | Administradores |

**Flujo de la aplicación:**

```
┌─────────────┐      login (admin/123456)      ┌──────────────┐
│  login.html │ ─────────────────────────────► │  auth API    │
└─────────────┘                                 │ (emite JWT)  │
      ▲                                         └──────┬───────┘
      │ almacena token en localStorage                 │
      │                                                ▼
┌─────────────┐   GET /api/lugares (público)   ┌──────────────┐        ┌──────────┐
│  index.html │ ◄───────────────────────────── │              │ ◄────► │  MySQL   │
│  (turista)  │                                │  Backend     │        │ lugares  │
└─────────────┘                                 │  .NET 10     │        │sincelejo │
      │                                         │  (API REST)  │        └──────────┘
      │ acceso al panel                        └──────▲───────┘
      ▼                                                │
┌─────────────┐   POST/PUT/DELETE + Bearer Token       │
│  admin.html │ ─────────────────────────────────────┘
│  (CRUD)     │
└─────────────┘
```

---

## 🛠 Tecnologías Utilizadas

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| **ASP.NET Core Web API** | .NET 10 (`net10.0`) | Framework del servidor REST |
| **MySQL** (vía `MySql.Data`) | 26.7.0 | Conexión a la base de datos `lugaressincelejo` |
| **JWT Bearer** | 10.0.12 / 8.23.0 | Autenticación por tokens |
| **Microsoft.AspNetCore.OpenApi** | 10.0.12 | Soporte OpenAPI/Swagger |

### Frontend
| Tecnología | Uso |
|---|---|
| **HTML5 / CSS3** (`styles.css`) | Estructura y estilos (diseño responsivo con Grid/Flexbox) |
| **JavaScript** (vanilla, ES6+ con `fetch` y `async/await`) | Consumo de la API y manipulación del DOM |
| **Google Maps** (enlace externo) | Botón "Cómo llegar" en cada lugar |

---

## 🏗 Arquitectura del Proyecto

Arquitectura **cliente-servidor** desacoplada:

- **Backend**: API REST que expone los recursos `Lugares`, `Categorias` y `Auth`. Usa ADO.NET directo (`MySqlConnection`/`MySqlCommand`) con **consultas parametrizadas** (`@parametros`) para prevenir inyección SQL.
- **Frontend**: Aplicación estática (sin framework ni build) que se comunica con la API vía `fetch` a `http://localhost:5080/api`.
- **Archivos estáticos**: El backend sirve la carpeta `Frontend/img` en la ruta `/img`, de modo que las imágenes de los lugares también pueden resolverse desde el servidor.

---

## 📁 Estructura de Carpetas

```
ProyectoSincelejo/
├── Backend/                          # API REST (ASP.NET Core .NET 10)
│   ├── Controllers/
│   │   ├── AuthController.cs         # Login y generación de JWT
│   │   └── LugaresController.cs      # CRUD de Lugares + Categorías (GET)
│   ├── Properties/
│   │   └── launchSettings.json       # Puertos: 5080 (HTTP) / 7268 (HTTPS)
│   ├── appsettings.json              # Cadena de conexión MySQL
│   ├── Backend.csproj                # Dependencias NuGet
│   ├── Backend.http                 # Archivo de pruebas HTTP
│   └── Program.cs                   # Configuración (CORS, JWT, static files)
│
└── Frontend/                         # SPA estática (HTML + CSS + JS)
    ├── img/                          # Imágenes de los lugares
    │   ├── catedral.jpg
    │   ├── guacari.jpg
    │   ├── majagual.jpg
    │   ├── museo.jpg
    │   ├── pozo.jpg
    │   └── santander.jpg
    ├── index.html                    # Vista pública (turista)
    ├── app.js                        # Lógica: búsqueda, filtros, tarjetas
    ├── login.html                    # Vista de acceso administrativo
    ├── login.js                      # Lógica: autenticación y guardado del token
    ├── admin.html                    # Panel de administración (CRUD)
    ├── admin.js                      # Lógica: tabla, modal, guardar/eliminar
    └── styles.css                     # Estilos globales (responsive)
```

---

## ✅ Requisitos Previos

- **.NET SDK 10** o superior — [descargar](https://dotnet.microsoft.com/download)
- **MySQL Server 8.x** en ejecución (por defecto en `localhost:3306`)
- Un navegador web moderno (Chrome, Edge, Firefox…)
- (Opcional) **Visual Studio 2022+** o **VS Code** con la extensión C#

---

## 🚀 Instalación y Ejecución

### 1. Preparar la base de datos MySQL

Crea el esquema y las tablas (ver sección [Base de Datos](#-base-de-datos)):

```sql
CREATE DATABASE lugaressincelejo;
```

Si tu usuario o contraseña de MySQL son distintos, ajústalos en `Backend/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Port=3306;Database=lugaressincelejo;User=root;Password=TU_PASSWORD;"
}
```

### 2. Ejecutar el Backend

```bash
cd Backend
dotnet run
```

La API quedará disponible en **`http://localhost:5080`** (perfil HTTP).

> 💡 Con el perfil HTTPS la app escucha en `https://localhost:7268` y `http://localhost:5080`.

### 3. Ejecutar el Frontend

Al ser archivos estáticos, basta con abrir `Frontend/index.html` en el navegador, o servir la carpeta con cualquier servidor estático, por ejemplo con la extensión **Live Server** de VS Code.

> ⚠️ **Importante:** los archivos JS apuntan a `const API_URL = "http://localhost:5080/api"`. Si el backend corre en otro puerto, actualiza esta constante en `app.js`, `login.js` y `admin.js`.

---

## 🗄 Base de Datos

Base de datos: **`lugaressincelejo`** (MySQL). Script de referencia:

```sql
-- Nota: los nombres de tablas van en MINUSCULAS. En Linux/MySQL (Aiven, Docker)
-- las tablas son case-sensitive ('Lugar' != 'lugar'); en Windows/MariaDB local
-- no se nota, pero en produccion si. Por eso el codigo consulta en minusculas.
CREATE TABLE categoria (
    IdCategoria INT PRIMARY KEY AUTO_INCREMENT,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(255)
);

CREATE TABLE lugar (
    IdLugar      INT PRIMARY KEY AUTO_INCREMENT,
    IdCategoria  INT NOT NULL,
    Nombre       VARCHAR(150) NOT NULL,
    Descripcion  TEXT,
    Direccion    VARCHAR(255),
    Imagen       VARCHAR(255),       -- Ej: img/majagual.jpg
    Horario      VARCHAR(100),
    Estado       TINYINT(1) DEFAULT 1,
    FOREIGN KEY (IdCategoria) REFERENCES categoria(IdCategoria)
);
```

**Relación:** `lugar.IdCategoria` → `categoria.IdCategoria` (N:1). Las consultas usan `INNER JOIN` para mostrar el nombre de la categoría en cada lugar.

---

## 🔌 API REST — Endpoints

Base URL: `http://localhost:5080/api`

> 🎛️ **Panel interactivo (Swagger UI):** `http://localhost:5080/swagger` — documentación viva de la API, con botón **Authorize** para probar los endpoints protegidos pegando el token JWT.

### Formato de errores

Cuando algo falla, la API responde con JSON estructurado (nunca stack traces):

```json
{ "error": "Ocurrió un problema al procesar la solicitud.", "ruta": "/api/lugares", "detalle": "..." }
```

> El campo `detalle` solo aparece en Development (en producción nunca se exponen internals del servidor). Un `PUT`/`DELETE` a un Id inexistente responde `404` con `{ "mensaje": "No existe un lugar con ese Id." }`.

### Autenticación

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ Pública | Valida credenciales y devuelve un JWT (válido 2 horas) |

**Request:**
```json
{ "usuario": "admin", "password": "123456" }
```

**Response (200 OK):**
```json
{ "token": "eyJhbGciOi..." }
```

**Response (401 Unauthorized):** `"Usuario o contraseña incorrectos"`

### Categorías

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/api/categorias` | ❌ Pública | Lista todas las categorías (`idCategoria`, `nombre`, `descripcion`) |

### Lugares

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/api/lugares` | ❌ Pública | Lista todos los lugares. Filtros opcionales por query string |
| `GET` | `/api/lugares?buscar=texto` | ❌ Pública | Búsqueda por nombre (`LIKE %texto%`) |
| `GET` | `/api/lugares?idCategoria=1` | ❌ Pública | Filtra por categoría (si `idCategoria > 0`) |
| `POST` | `/api/lugares` | ✅ **Bearer Token** | Crea un lugar (Estado = 1 por defecto) |
| `PUT` | `/api/lugares/{id}` | ✅ **Bearer Token** | Actualiza un lugar por `IdLugar` |
| `DELETE` | `/api/lugares/{id}` | ✅ **Bearer Token** | Elimina un lugar por `IdLugar` |

**Body para POST/PUT (`LugarModel`):**
```json
{
  "idCategoria": 1,
  "nombre": "Plaza Majagual",
  "descripcion": "Icónica plaza del barrio Majagual...",
  "direccion": "Carrera 17, Barrio Majagual",
  "imagen": "img/majagual.jpg",
  "horario": "08:00 AM - 06:00 PM"
}
```

**Ejemplo con token (cURL):**
```bash
curl -X POST http://localhost:5080/api/lugares \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"idCategoria":1,"nombre":"Nuevo lugar","descripcion":"...","direccion":"...","imagen":"img/nuevo.jpg","horario":"..."}'
```

---

## 🔐 Autenticación con JWT

1. El administrador inicia sesión en `login.html` → `login.js` envía `POST /api/auth/login`.
2. Si las credenciales son válidas (sección `AdminUser` de `appsettings.json`), el backend genera un **token JWT** firmado con HMAC-SHA256 (expira en **2 horas**). La clave, el Issuer y el Audience viven en la sección `Jwt` de `appsettings.json` — una sola fuente de verdad.
3. El token se guarda en `localStorage` del navegador (`localStorage.setItem("token", ...)`).
4. `admin.js` verifica que exista el token; si no, redirige a `login.html` (bloqueo de acceso directo por URL).
5. Las peticiones de escritura (POST/PUT/DELETE) incluyen la cabecera `Authorization: Bearer <token>`.
6. El backend valida el token con `[Authorize]` antes de ejecutar los cambios. Al **cerrar sesión**, el token se elimina de `localStorage`.

---

## 🖼 Vistas del Frontend

### `index.html` — Vista Pública (Turista)
- **Filtros:** cuadro de búsqueda por nombre + selector de categorías (cargado dinámicamente desde `/api/categorias`).
- **Grid de tarjetas:** cada tarjeta muestra imagen (con *fallback* a `picsum.photos` si la imagen falla), badge de categoría, descripción, dirección y horario.
- **Botón "🗺️ Cómo llegar":** abre Google Maps con la ubicación del lugar en una pestaña nueva.
- **Acceso al panel:** botón "⚙️ Panel de Administración" en el encabezado.

### `login.html` — Acceso Administrativo
- Formulario de usuario/contraseña con validación HTML5.
- Muestra errores (`401` o fallo de conexión) mediante un mensaje estilizado.

### `admin.html` — Panel de Administración (CRUD)
- **Tabla de lugares:** miniatura de imagen, nombre, categoría, dirección, horario y acciones.
- **Modal formulario:** crear (`lugarId = 0` → POST) o editar (`lugarId > 0` → PUT).
- **Eliminar:** con ventana de confirmación `confirm()` antes del DELETE.
- **Cerrar sesión:** borra el token y regresa a la vista pública.
- **Protegida:** redirige a `login.html` si no hay token.

---

## 🔑 Credenciales de Acceso

> ⚠️ Credenciales de prueba definidas **en la configuración** (sección `AdminUser` de `appsettings.json`):

| Usuario | Contraseña |
|---|---|
| `admin` | `123456` |

---

## ⚠️ Observaciones y Mejoras Futuras

Puntos identificados durante el análisis (útiles para evolución del proyecto):

### Seguridad
- ✅ **Clave JWT (RESUELTO):** ya no está en el código; vive en `appsettings.json` (sección `Jwt`) y tanto `Program.cs` como `AuthController.cs` leen de esa única fuente. Para producción: moverla a variables de entorno o user-secrets.
- **Credenciales de admin en configuración:** el login compara contra la sección `AdminUser` de `appsettings.json`. Sugerencia futura: tabla `Usuario` en MySQL con contraseñas hasheadas (bcrypt/PBKDF2).
- **CORS `AllowAll`:** acepta cualquier origen. En producción, restringir al dominio del frontend.
- **Token sin validación de expiración en frontend:** si el token expira a mitad de sesión, la API devuelve `401` pero el panel no lo maneja (solo muestra un `alert` genérico). Sugerencia: capturar el 401 y redirigir al login.

### Funcionales / Calidad de código
- **`GetBoolean("Estado")`**: requiere que la columna MySQL sea `TINYINT(1)`/`BIT`.
- ✅ **`app.js` (RESUELTO):** el listener del botón `btnPanelAdmin` vive ahora en el `DOMContentLoaded` y se registra una sola vez (antes se acumulaba con cada búsqueda). Bonus añadido: la tecla Enter también dispara la búsqueda.
- ✅ **`admin.js` (RESUELTO):** verificación de token única (guard clause), código muerto eliminado y un solo `DOMContentLoaded` concentrando todo el cableado de eventos.
- ✅ **`Backend.http` (RESUELTO):** ahora contiene solicitudes reales de la API (login, lugares, categorías y creación con token) listas para ejecutar desde VS Code.
- **Paginación:** `GET /api/lugares` devuelve todos los registros; convendría paginar (`LIMIT/OFFSET`).
- ✅ **Manejo de errores global (RESUELTO):** `ExceptionHandlerGlobal` (`IExceptionHandler`) captura cualquier excepción y responde con JSON limpio; el detalle técnico queda en los logs del servidor y solo se muestra al cliente en Development. Además, `PUT`/`DELETE` a un Id inexistente responden `404` en vez de un 200 falso.
- **Carga de imágenes:** actualmente se escribe la ruta manualmente (`img/x.jpg`); una mejora natural sería un endpoint de subida de archivos (multipart/form-data).

---

## ☁️ Despliegue (Deployment)

> 🟢 **Este proyecto está LIVE en internet:**
>
> | Pieza | URL |
> |---|---|
> | 🖼️ Sitio público (frontend) | **https://turismo-sincelejo.onrender.com** |
> | 👨‍🍳 API REST + Swagger (`/swagger`) | **https://turismo-sincelejo-api.onrender.com** |
> | 🗄️ MySQL (Aiven, TLS) | `turismo-sincelejo-cun-80d6.i.aivencloud.com:14300` |
>
> Acceso admin de demo: usuario `admin` (la contraseña vive en las variables de entorno de Render, no en el repo).

Arquitectura desplegada (todo en planes gratuitos, sin tarjeta):

| Pieza | Plataforma | Detalle |
|---|---|---|
| 🖼️ Frontend estático | Render Static Site (o GitHub Pages) | Se redespliega con cada push |
| 👨‍🍳 API .NET 10 | Render Web Service (Docker) | Duerme tras 15 min de inactividad (~1 min en despertar) |
| 🗄️ MySQL | Aiven (plan gratuito) | Conexión con TLS |

**Puntos clave:**

- El backend se construye con `Backend/Dockerfile` (multi-stage: SDK para compilar, runtime ligero para correr).
- **Configuración por variables de entorno (12-factor):** `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`, `AdminUser__Usuario`, `AdminUser__Password`, `ConnectionStrings__DefaultConnection`. El doble guion bajo (`__`) equivale a los `:` de `appsettings.json` y **sobrescribe** sus valores — mismo código, distinto entorno, cero cambios.
- Las variables de entorno se configuran en el panel de Render; así la clave JWT de producción **no vive en el repositorio**.
- **CI/CD incluido:** cada `git push` a `main` redespliega backend y frontend automáticamente.
- Migración de datos: `mysqldump` de la BD local → `mysql` hacia la BD remota (respaldo + migración en un paso).

## 👥 Autores

Proyecto académico — *Desarrollo Web* (2026-2).

---
```

Documento generado a partir del análisis del código fuente de `Backend/` y `Frontend/`.
```
