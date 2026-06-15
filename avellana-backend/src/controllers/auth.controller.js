// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { query } = require("../config/db");

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ error: "Todos los campos son requeridos" });

    if (password.length < 8)
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres" });

    // Verificar si ya existe
    const exists = await query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email.toLowerCase(), username.toLowerCase()]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: "El correo o usuario ya está registrado" });

    // Hash de contraseña
    const hash = await bcrypt.hash(password, 12);

    // Insertar usuario
    const result = await query(
      `INSERT INTO users (name, username, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, username, email, bio, avatar_url, created_at`,
      [name, username.toLowerCase(), email.toLowerCase(), hash]
    );

    const user  = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("register:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Correo y contraseña requeridos" });

    const result = await query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = generateToken(user);

    // No devolver el hash de la contraseña
    delete user.password;

    res.json({ token, user });
  } catch (err) {
    console.error("login:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/auth/me  (requiere token)
async function me(req, res) {
  try {
    const result = await query(
      `SELECT id, name, username, email, bio, location, website,
              avatar_url, cover_url, followers, following, posts_count, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("me:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

module.exports = { register, login, me };
