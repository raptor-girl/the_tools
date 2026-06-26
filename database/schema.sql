CREATE DATABASE IF NOT EXISTS moodle_tools
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE moodle_tools;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  role ENUM('admin') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id CHAR(36) PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  sheet_name VARCHAR(160) NULL,
  uploaded_by CHAR(36) NULL,
  total_rows INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_uploaded_files_user
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mapping_configs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  name VARCHAR(140) NOT NULL,
  original_headers JSON NULL,
  mapping JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mapping_configs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS process_history (
  id CHAR(36) PRIMARY KEY,
  uploaded_file_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  output_file VARCHAR(255) NOT NULL,
  error_report_file VARCHAR(255) NULL,
  processed_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_process_history_file
    FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_process_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS process_errors (
  id CHAR(36) PRIMARY KEY,
  history_id CHAR(36) NOT NULL,
  excel_row_number INT NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  message VARCHAR(255) NOT NULL,
  raw_data JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_process_errors_history
    FOREIGN KEY (history_id) REFERENCES process_history(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_uploaded_files_created_at ON uploaded_files(created_at);
CREATE INDEX idx_process_history_created_at ON process_history(created_at);
CREATE INDEX idx_process_errors_history_id ON process_errors(history_id);
