USE moodle_tools;

INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  password_salt,
  role,
  is_active
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Administrador Moodle Tools',
  'admin@moodletools.local',
  SHA2(CONCAT('moodle-tools-seed', 'admin123'), 256),
  'moodle-tools-seed',
  'admin',
  1
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  is_active = VALUES(is_active);

INSERT INTO mapping_configs (
  id,
  user_id,
  name,
  original_headers,
  mapping
) VALUES (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Mapeo base Moodle',
  JSON_ARRAY('rut', 'nombre', 'apellido', 'correo', 'curso'),
  JSON_OBJECT(
    'rut', 'rut',
    'firstname', 'nombre',
    'lastname', 'apellido',
    'email', 'correo',
    'course', 'curso'
  )
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  original_headers = VALUES(original_headers),
  mapping = VALUES(mapping);
