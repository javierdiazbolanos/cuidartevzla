-- Cuídarte Venezuela - Migración: Tabla historial_merge
-- Motor de Deduplicación - Auditoría de Merges
-- Fecha: 2026-06-29
-- Segura: no modifica datos existentes, solo crea tabla nueva

CREATE TABLE IF NOT EXISTS historial_merge (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    paciente_id INT UNSIGNED NOT NULL,
    fuente VARCHAR(100) NOT NULL DEFAULT 'desconocida',
    campos_agregados VARCHAR(500) NULL,
    datos_nuevos JSON NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_paciente (paciente_id),
    KEY idx_fuente (fuente),
    KEY idx_creado (creado_en),
    CONSTRAINT fk_hist_pac FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice compuesto para búsquedas de auditoría por paciente + fecha
CREATE INDEX idx_paciente_fecha ON historial_merge (paciente_id, creado_en DESC);
