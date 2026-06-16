// src/config/db.js
const { Pool } = require("pg");
require("dotenv").config();

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else if (process.env.PGHOST) {
  // Railway inyecta variables PGHOST, PGPORT, etc. automáticamente
  poolConfig = {
    host:     process.env.PGHOST,
    port:     parseInt(process.env.PGPORT     || "5432"),
    database: process.env.PGDATABASE          || process.env.DB_NAME,
    user:     process.env.PGUSER              || process.env.DB_USER,
    password: process.env.PGPASSWORD          || process.env.DB_PASSWORD,
    ssl:      { rejectUnauthorized: false }
  };
} else {
  // Local con variables del .env
  poolConfig = {
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME     || "avellana",
    user:     process.env.DB_USER     || "postgres",
    password: process.env.DB_PASSWORD || "",
  };
}

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis:     30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Error en el pool de PostgreSQL:", err.message);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
