# ============================================================
# Dockerfile — API Turismo Sincelejo
# La "receta de la caja de mudanza": empaqueta la API con todo
# lo necesario para que correa identico en cualquier servidor.
#
# MULTI-STAGE BUILD (tecnica pro):
#   Etapa 1: compila usando la imagen SDK (pesada, con compiladores)
#   Etapa 2: empaqueta SOLO el resultado en la imagen runtime (ligera)
# Resultado: imagen final pequena, sin herramientas de desarrollo.
# ============================================================

# ---------- ETAPA 1: COMPILAR ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Truco de cache: copiar SOLO el .csproj y restaurar primero.
# Docker guarda estas capas: si solo cambia tu codigo C#,
# no re-descarga todos los paquetes NuGet en cada build.
COPY Backend.csproj .
RUN dotnet restore

# Ahora si: copiar todo el codigo y compilar en modo Release
COPY . .
RUN dotnet publish -c Release -o /app/publish

# ---------- ETAPA 2: EJECUTAR ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render nos dice en que puerto escuchar mediante la variable PORT.
# ASP.NET Core usa ASPNETCORE_HTTP_PORTS para eso (8080 como default local).
CMD /bin/sh -c "ASPNETCORE_HTTP_PORTS=${PORT:-8080} dotnet Backend.dll"
