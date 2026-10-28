-- Focales Bienestar — ejecutar en MySQL (local o servidor 205)
CREATE DATABASE IF NOT EXISTS focales_bienestar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'focales'@'localhost' IDENTIFIED BY 'Focales2026!';
CREATE USER IF NOT EXISTS 'focales'@'%' IDENTIFIED BY 'Focales2026!';

GRANT ALL PRIVILEGES ON focales_bienestar.* TO 'focales'@'localhost';
GRANT ALL PRIVILEGES ON focales_bienestar.* TO 'focales'@'%';
FLUSH PRIVILEGES;

SHOW DATABASES LIKE 'focales_bienestar';
