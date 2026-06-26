const { randomUUID } = require("crypto");
const { query } = require("../config/database");
const { hashPassword } = require("../utils/password");

async function findByEmail(email) {
  const rows = await query(
    "SELECT id, name, email, password_hash, password_salt, role, is_active FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0] || null;
}

async function findById(id) {
  const rows = await query(
    "SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
}

async function listUsers() {
  return query(
    "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
  );
}

async function createAdmin({ name, email, password }) {
  const id = randomUUID();
  const { passwordHash, salt } = hashPassword(password);

  await query(
    "INSERT INTO users (id, name, email, password_hash, password_salt, role, is_active) VALUES (?, ?, ?, ?, ?, 'admin', 1)",
    [id, name, email, passwordHash, salt]
  );

  return findById(id);
}

module.exports = {
  findByEmail,
  findById,
  listUsers,
  createAdmin
};
