require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// SQLite setup
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, 'refaccionaria.db');

let db; // will hold sqlite database connection

async function initDb() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.exec(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    stock INTEGER,
    price REAL,
    image TEXT,
    createdAt TEXT
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    name TEXT,
    whatsapp TEXT,
    carModel TEXT,
    description TEXT,
    notas TEXT,
    date TEXT,
    time TEXT,
    createdAt TEXT
  )`);

  console.log('✓ SQLite inicializado en', DB_PATH);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'refaccionaria-secret',
  resave: false,
  saveUninitialized: false,
}));

// Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage });

// Public API - Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY datetime(createdAt) DESC');
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Admin auth
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS = process.env.ADMIN_PASS || 'artemio123';
  if (password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else res.status(401).json({ ok: false, message: 'Contraseña incorrecta' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(403).json({ ok: false, message: 'Acceso denegado' });
}

// Validación de producto
function validateProduct(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('El nombre del producto es requerido');
  } else if (data.name.trim().length > 100) {
    errors.push('El nombre no puede exceder 100 caracteres');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('La categoría es requerida');
  }
  
  const stock = Number(data.stock);
  if (isNaN(stock) || stock < 0) {
    errors.push('El stock debe ser un número igual o mayor a 0');
  }
  
  const price = Number(data.price);
  if (isNaN(price) || price < 0) {
    errors.push('El precio debe ser un número igual o mayor a 0');
  }
  
  return errors;
}

// Create product
app.post('/api/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, stock, price } = req.body;
    
    // Validar entrada
    const errors = validateProduct({ name, category, stock, price });
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: 'Validación fallida', details: errors });
    }
    
    const id = uuidv4();
    const image = req.file ? '/uploads/' + path.basename(req.file.path) : null;
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO products (id, name, category, stock, price, image, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, name.trim(), category.trim(), Number(stock), Number(price), image, createdAt
    );

    const product = await db.get('SELECT * FROM products WHERE id = ?', id);
    res.json({ ok: true, product });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ ok: false, error: 'Error al crear producto' });
  }
});

// Update product
app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, stock, price } = req.body;
    
    // Validar entrada
    const errors = validateProduct({ name, category, stock, price });
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: 'Validación fallida', details: errors });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', id);
    if (!product) return res.status(404).json({ ok: false, error: 'Producto no encontrado' });

    // Delete old image if updating with new one
    if (req.file && product.image) {
      try { fs.unlinkSync(path.join(__dirname, product.image)); } catch (e) {}
    }

    const updated = {
      name: name && name.trim().length > 0 ? name.trim() : product.name,
      category: category && category.trim().length > 0 ? category.trim() : product.category,
      stock: stock !== undefined && !isNaN(Number(stock)) ? Number(stock) : product.stock,
      price: price !== undefined && !isNaN(Number(price)) ? Number(price) : product.price,
      image: req.file ? '/uploads/' + path.basename(req.file.path) : product.image
    };

    await db.run(
      `UPDATE products SET name = ?, category = ?, stock = ?, price = ?, image = ? WHERE id = ?`,
      updated.name, updated.category, updated.stock, updated.price, updated.image, id
    );

    const prod = await db.get('SELECT * FROM products WHERE id = ?', id);
    res.json({ ok: true, product: prod });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ ok: false, error: 'Error al actualizar producto' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'ID de producto inválido' });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', id);
    if (!product) return res.status(404).json({ ok: false, error: 'Producto no encontrado' });

    await db.run('DELETE FROM products WHERE id = ?', id);

    if (product.image) {
      try { fs.unlinkSync(path.join(__dirname, product.image)); } catch (e) {}
    }

    res.json({ ok: true, message: 'Producto eliminado exitosamente' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ ok: false, error: 'Error al eliminar producto' });
  }
});

// Validación de cita
function validateAppointment(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('El nombre es requerido');
  }
  
  if (!data.whatsapp || data.whatsapp.trim().length === 0) {
    errors.push('El WhatsApp es requerido');
  } else if (!/^\d{10,}$/.test(data.whatsapp.replace(/\D/g, ''))) {
    errors.push('El WhatsApp debe tener al menos 10 dígitos');
  }
  
  if (!data.carModel || data.carModel.trim().length === 0) {
    errors.push('El modelo del vehículo es requerido');
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('La descripción del servicio es requerida');
  }
  
  if (!data.date || data.date.trim().length === 0) {
    errors.push('La fecha es requerida');
  }
  
  if (!data.time || data.time.trim().length === 0) {
    errors.push('La hora es requerida');
  }
  
  return errors;
}

// Appointments
app.post('/api/appointments', async (req, res) => {
  try {
    const { name, whatsapp, carModel, description, date, time, notas } = req.body;
    
    // Validar entrada
    const errors = validateAppointment({ name, whatsapp, carModel, description, date, time });
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: 'Validación fallida', details: errors });
    }
    
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO appointments (id, name, whatsapp, carModel, description, notas, date, time, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, name.trim(), whatsapp.trim(), carModel.trim(), description.trim(), notas || '', date.trim(), time.trim(), createdAt
    );

    // Send email to configured admin email
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yairivanyanez23@cbtis179.edu.mx';

    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      });

      const html = `<h2>Nueva cita - Refaccionaria y Taller Guerrero</h2>
        <p><strong>Cliente:</strong> ${name}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Modelo del vehículo:</strong> ${carModel}</p>
        <p><strong>Tipo de servicio:</strong> ${description}</p>
        ${notas ? `<p><strong>Notas adicionales:</strong> ${notas}</p>` : ''}
        <p><strong>Fecha:</strong> ${date}</p>
        <p><strong>Hora:</strong> ${time}</p>
        <hr>
        <p style="color: #666; font-size: 0.9em;">Cita recibida: ${new Date().toLocaleString('es-MX')}</p>`;

      transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: ADMIN_EMAIL,
        subject: `Nueva cita: ${name} - ${date} ${time}`,
        html
      }).then(() => {
        res.json({ ok: true, emailed: true });
      }).catch(err => {
        console.error('Error sending mail', err);
        res.json({ ok: true, emailed: false, error: String(err) });
      });
    } else {
      console.warn('SMTP no configurado. La cita se guardó en la base SQLite pero no se envió correo.');
      res.json({ ok: true, emailed: false, message: 'SMTP no configurado. Revisa README para configurar.' });
    }
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ ok: false, error: 'Error al crear cita' });
  }
});

app.get('*', (req, res) => {
  if (req.path === '/' || req.path === '/index.html') return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  res.status(404).send('Not found');
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => console.log(`\n✓ Servidor iniciado en http://localhost:${PORT}\n`));
}).catch(err => {
  console.error('Error inicializando la base de datos:', err);
});

