const { randomUUID } = require("crypto");
const { query } = require("../config/database");

async function listMappings(userId) {
  return query(
    `SELECT id, name, mapping, original_headers, created_at
     FROM mapping_configs
     WHERE user_id = ? OR user_id IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
}

async function saveMapping({ userId, name, mapping, originalHeaders }) {
  const id = randomUUID();

  await query(
    `INSERT INTO mapping_configs
      (id, user_id, name, mapping, original_headers)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      name,
      JSON.stringify(mapping),
      JSON.stringify(originalHeaders || [])
    ]
  );

  return id;
}

module.exports = {
  listMappings,
  saveMapping
};
