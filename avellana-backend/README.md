# Avellana — Backend (Node.js + PostgreSQL)

## Requisitos previos

- Node.js 18+  →  https://nodejs.org
- PostgreSQL 14+  →  https://www.postgresql.org/download
- Un editor de texto (VS Code recomendado)

---

## Instalación paso a paso

### 1 — Clonar / descomprimir el proyecto

```
avellana-backend/
├── src/
│   ├── index.js               ← Servidor Express (punto de entrada)
│   ├── config/db.js           ← Conexión a PostgreSQL
│   ├── middleware/
│   │   ├── auth.js            ← Verificación de JWT
│   │   └── upload.js          ← Subida de imágenes (Multer)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── posts.controller.js
│   │   ├── users.controller.js
│   │   └── notifications.controller.js
│   └── routes/
│       ├── auth.routes.js
│       ├── posts.routes.js
│       ├── users.routes.js
│       └── notifications.routes.js
├── sql/
│   └── schema.sql             ← Crear tablas en PostgreSQL
├── uploads/                   ← Imágenes subidas (se crea automático)
├── .env.example               ← Plantilla de variables de entorno
└── package.json
```

### 2 — Instalar dependencias

```bash
cd avellana-backend
npm install
```

### 3 — Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=avellana
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=una_clave_larga_y_secreta_aqui
PORT=3000
CLIENT_URL=http://localhost:5500
```

### 4 — Crear la base de datos en PostgreSQL

```bash
# Abrir consola de PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE avellana;
\q

# Crear las tablas
psql -U postgres -d avellana -f sql/schema.sql
```

### 5 — Iniciar el servidor

```bash
# Desarrollo (reinicia automáticamente con nodemon)
npm run dev

# Producción
npm start
```

Deberías ver:
```
🌰 Avellana API corriendo en http://localhost:3000
   Health: http://localhost:3000/api/health
```

---

## Endpoints disponibles

### Autenticación
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Crear cuenta | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET  | `/api/auth/me` | Perfil del usuario actual | Sí |

### Posts
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET    | `/api/posts/feed` | Feed paginado | Sí |
| POST   | `/api/posts` | Crear publicación (con imagen opcional) | Sí |
| GET    | `/api/posts/user/:username` | Posts de un usuario | Sí |
| POST   | `/api/posts/:id/like` | Like / unlike | Sí |
| DELETE | `/api/posts/:id` | Eliminar publicación propia | Sí |

### Usuarios
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET    | `/api/users/search?q=term` | Buscar usuarios | Sí |
| GET    | `/api/users/suggested` | Personas sugeridas | Sí |
| GET    | `/api/users/:username` | Ver perfil | Sí |
| PUT    | `/api/users/me` | Actualizar perfil (con avatar) | Sí |
| POST   | `/api/users/:username/follow` | Seguir / dejar de seguir | Sí |

### Notificaciones
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET    | `/api/notifications` | Listar notificaciones | Sí |
| PATCH  | `/api/notifications/read-all` | Marcar todo como leído | Sí |
| PATCH  | `/api/notifications/:id/read` | Marcar una como leída | Sí |

---

## Conectar el frontend

En cada página HTML, agrega `api.js` **antes** de `global.js`:

```html
<script src="../assets/js/api.js"></script>
<script src="../assets/js/global.js"></script>
```

Luego en `auth.html` reemplaza las llamadas simuladas:

```js
// ANTES (simulado)
Auth.login({ name: 'Ana', username: 'ana', email });

// AHORA (real)
await Auth.login({ email, password });
```

En `feed.html` para cargar posts reales:

```js
const { posts } = await Posts.getFeed();
posts.forEach(post => renderPost(post));
```

---

## Despliegue en Railway (recomendado)

1. Ve a https://railway.app y crea una cuenta
2. Nuevo proyecto → **Deploy from GitHub** (sube el backend a un repo)
3. Agrega un plugin de **PostgreSQL** al proyecto
4. Railway te da las variables de entorno de la BD automáticamente
5. Agrega las variables de `.env` en la sección **Variables**
6. El servidor se despliega solo en cada push

Tu API quedará en una URL como: `https://avellana-backend.up.railway.app`

Cambia en `api.js`:
```js
const API_URL = "https://avellana-backend.up.railway.app/api";
```

---

## Estado de módulos

| Módulo | Estado |
|--------|--------|
| Auth (registro + login) | ✅ Listo |
| Feed de publicaciones   | ✅ Listo |
| Likes                   | ✅ Listo |
| Perfiles de usuario     | ✅ Listo |
| Seguir / dejar seguir   | ✅ Listo |
| Notificaciones          | ✅ Listo |
| Búsqueda de usuarios    | ✅ Listo |
| Subida de imágenes      | ✅ Listo |
| Mensajes en tiempo real | 🚧 Próximo (WebSockets) |
| Comentarios             | 🚧 Próximo |
