# Moodle Tools

Plataforma interna para preparar, limpiar y transformar archivos Excel antes de cargarlos a Moodle.

Esta primera base prioriza el flujo central: login, subida de Excel, deteccion de columnas, mapeo manual/asistido, limpieza de RUT/textos, exportacion Moodle e historial en MySQL.

## Stack

- Backend: Node.js + Express
- Frontend: HTML, CSS y JavaScript simple
- Base de datos: MySQL
- Excel: `xlsx`
- Carga multipart: `busboy`

## Estructura

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
  uploads/
  exports/
frontend/
  src/
    components/
    pages/
    services/
database/
  schema.sql
  seed.sql
```

## Requisitos

- Node.js 18 o superior
- MySQL 8 recomendado

## Configurar MySQL

Opcion recomendada para desarrollo con Docker:

```powershell
docker compose up -d mysql
```

La base queda disponible en `localhost:3306` con:

- Base de datos: `moodle_tools`
- Usuario: `moodle_tools`
- Password: `moodle_tools`
- Root password: `root`

El contenedor carga automaticamente `database/schema.sql` y `database/seed.sql` la primera vez que se crea el volumen.

Si usas una instalacion local de MySQL:

Desde la raiz del proyecto:

```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Usuario inicial:

- Email: `admin@moodletools.local`
- Password: `admin123`

## Ejecutar backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Si no quieres usar `nodemon`:

```powershell
npm start
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd`:

```powershell
npm.cmd install
npm.cmd start
```

La API queda en:

```text
http://localhost:3001/api
```

## Ejecutar frontend

En otra terminal:

```powershell
cd frontend
npm start
```

Abrir:

```text
http://localhost:5173
```

## Flujo disponible

Herramientas principales:

- Normalizar Excel.
- Normalizar RUT desde una lista pegada.
- Normalizar RUTs desde una columna de Excel.
- Normalizar textos pegados en varias lineas.
- Normalizar una o mas columnas de Excel.

Normalizar Excel:

1. Iniciar sesion.
2. Subir archivo `.xlsx` o `.xls`.
3. Revisar hojas, columnas y primeras filas.
4. Mapear columnas a `rut`, `firstname`, `lastname`, `fullname`, `email` y `course`.
5. Validar y descargar Excel con columnas:
   - `username`
   - `firstname`
   - `lastname`
   - `email`
   - `course1`
   - `role1`
6. Descargar reporte de errores o advertencias si existen.

## Reglas implementadas

- RUT:
  - limpia puntos, guion, espacios y letras minusculas
  - devuelve formato `11111111-1`
  - valida cuerpo, digito verificador y checksum chileno
  - permite procesar listas y columnas completas de Excel
- Texto:
  - minúsculas
  - MAYÚSCULAS
  - Capitalizar
  - Limpiar espacios
  - remover caracteres de control o raros
  - permite procesar listas y multiples columnas de Excel
- Moodle:
  - `username` se genera desde RUT limpio
  - `role1` queda como `student`
  - primero transforma cada fila usando el mapping elegido y luego valida
  - filas con errores criticos no se agregan al Excel final
  - advertencias como apellido/curso faltante no bloquean el registro
  - duplicados por RUT o email quedan como advertencia y no bloquean la descarga

## Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/files/upload`
- `POST /api/files/preview`
- `POST /api/files/process`
- `GET /api/files/download/:fileName`
- `POST /api/tools/format-rut`
- `POST /api/tools/format-ruts`
- `POST /api/tools/format-ruts-excel`
- `POST /api/tools/normalize-text`
- `POST /api/tools/normalize-texts`
- `POST /api/tools/normalize-texts-excel`
- `GET /api/history`
- `GET /api/mappings`
- `POST /api/mappings`
- `GET /api/users`
- `POST /api/users`


