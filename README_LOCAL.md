# Refaccionaria y Taller - Sistema Local

Sistema de gestión de refaccionaria y taller con almacenamiento 100% local en archivos JSON.

## 🚀 Inicio Rápido

### 1. Instalación
```bash
npm install
```

### 2. Configuración
Copia `.env.example` a `.env` y configura si es necesario:
```bash
cp .env.example .env
```

### 3. Ejecutar
```bash
npm start
```

El servidor estará en: **http://localhost:3000**

## 📁 Estructura de Datos

Los datos se guardan en archivos JSON en la carpeta `data/`:

```
data/
├── products.json      # Productos del inventario
└── appointments.json  # Citas de clientes
```

### Ejemplo: products.json
```json
[
  {
    "id": "uuid-string",
    "name": "Filtro de aceite",
    "category": "Filtros",
    "stock": 10,
    "price": 350.00,
    "image": "/uploads/image.jpg",
    "createdAt": "2025-12-03T12:00:00.000Z"
  }
]
```

### Ejemplo: appointments.json
```json
[
  {
    "id": "uuid-string",
    "name": "Juan López",
    "whatsapp": "5555555555",
    "carModel": "Honda CRV 2017",
    "description": "Servicio de aceite",
    "notas": "Notas opcionales",
    "date": "2025-12-10",
    "time": "14:30",
    "createdAt": "2025-12-03T12:00:00.000Z"
  }
]
```

## 📡 API Endpoints

### Productos
- `GET /api/products` - Obtener todos los productos
- `POST /api/admin/products` - Crear producto (requiere autenticación)
- `PUT /api/admin/products/:id` - Actualizar producto
- `DELETE /api/admin/products/:id` - Eliminar producto

### Citas
- `POST /api/appointments` - Crear nueva cita

### Autenticación
- `POST /api/admin/login` - Login (envía password en body)
- `POST /api/admin/logout` - Logout

## ⚙️ Variables de Entorno

```env
PORT=3000                           # Puerto del servidor
ADMIN_PASS=artemio123               # Contraseña del admin
ADMIN_EMAIL=admin@example.com       # Email para recibir citas
SESSION_SECRET=refaccionaria-secret # Secret para sesiones

# SMTP (opcional, para envío de emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_SECURE=false
FROM_EMAIL=noreply@example.com
```

## 📦 Dependencias

- **express** - Framework web
- **multer** - Manejo de cargas de archivos
- **express-session** - Sesiones de usuario
- **nodemailer** - Envío de emails
- **uuid** - Generación de IDs únicos
- **dotenv** - Gestión de variables de entorno
- **cors** - CORS middleware

## 🎨 Interfaz

- `public/index.html` - Catálogo de productos
- `public/admin.html` - Panel de administración
- `public/citas.html` - Sistema de citas
- `public/css/style.css` - Estilos
- `public/js/app.js` - Lógica principal

## 📤 Cargar Imágenes

Las imágenes de productos se cargan en la carpeta `uploads/`. Se pueden acceder en:
```
http://localhost:3000/uploads/nombre-archivo.jpg
```

## 🔐 Autenticación

Para acceder al panel de admin:
1. Ve a `http://localhost:3000/admin.html`
2. Contraseña por defecto: `artemio123`
3. Cambia en `.env` si es necesario

## 💾 Respaldo de Datos

Para respaldar tus datos:
```bash
# Copiar carpeta data
cp -r data data-backup-$(date +%Y%m%d)
```

O simplemente haz backup de:
- `data/products.json`
- `data/appointments.json`
- `uploads/` (todas las imágenes)

## 🚨 Solución de Problemas

### Error: "ENOENT: no such file or directory, open 'data/products.json'"
- La carpeta `data/` se crea automáticamente
- Si persiste, crea la carpeta manualmente: `mkdir data`

### Imágenes no se cargan
- Verifica que la carpeta `uploads/` exista y tenga permisos de escritura
- Verifica el error en la consola del servidor

### Servidor no inicia
- Verifica el puerto 3000 no esté en uso: `netstat -ano | findstr :3000`
- Cambia el puerto en `.env`: `PORT=3001`

### Emails no se envían
- Configura las variables SMTP en `.env`
- Las citas se guardan igual aunque no se envíe email

## 📝 Notas

- ✅ 100% local, sin base de datos remota
- ✅ Perfecto para pequeñas/medianas aplicaciones
- ✅ Fácil de respaldar y transportar
- ⚠️ Para miles de registros, considera migrar a BD

## 📞 Contacto

Para soporte o issues, revisa el repositorio en GitHub.

---

**Última actualización:** 3 de diciembre de 2025
