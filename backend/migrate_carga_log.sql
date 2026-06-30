-- ============================================================================
-- Cuídarte Venezuela - Migración: Trazabilidad de Cargas + Superusuario
-- Terremotos de Venezuela - Junio de 2026
-- ============================================================================
-- Crea la tabla carga_log para registrar cada lote de carga (timestamp, IP, código de voluntario)
-- y extiende la tabla pacientes con columnas carga_id y carga_secuencial.
-- Incluye FK con ON DELETE CASCADE para borrar pacientes al borrar una carga.
-- ============================================================================

-- 1. Crear tabla de trazabilidad de cargas
CREATE TABLE IF NOT EXISTS carga_log (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    carga_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    carga_ip VARBINARY(16) NOT NULL COMMENT 'IP en formato binario (inet_pton)',
    carga_codigo VARCHAR(20) NOT NULL COMMENT 'Código de voluntario que hizo la carga',
    PRIMARY KEY (id),
    INDEX idx_carga_timestamp (carga_timestamp),
    INDEX idx_carga_codigo (carga_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Extender tabla pacientes con columnas de trazabilidad
ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS carga_id INT UNSIGNED NULL COMMENT 'FK a carga_log.id',
    ADD COLUMN IF NOT EXISTS carga_secuencial INT UNSIGNED NULL COMMENT 'Número de registro dentro de la carga',
    ADD INDEX IF NOT EXISTS idx_carga_id (carga_id);

-- 3. Foreign key con ON DELETE CASCADE (borrar pacientes al borrar carga)
-- NOTA: Si ya existe, esta línea fallará sin afectar los datos — es safe.
ALTER TABLE pacientes
    ADD CONSTRAINT fk_pac_carga
        FOREIGN KEY (carga_id) REFERENCES carga_log(id)
        ON DELETE CASCADE;