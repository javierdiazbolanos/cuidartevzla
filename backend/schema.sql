-- Cuídarte Venezuela - Esquema de Base de Datos MySQL
-- Terremotos de Venezuela - Junio de 2026

CREATE TABLE hospitales (
  id INT UNSIGNED NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  municipio VARCHAR(120) NULL,
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pacientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_origen INT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  nombre_norm VARCHAR(150) NOT NULL,
  cedula VARCHAR(15) NULL,
  edad TINYINT UNSIGNED NULL,
  sexo ENUM('Masculino','Femenino','Desconocido') NOT NULL DEFAULT 'Desconocido',
  procedencia VARCHAR(120) NULL,
  hospital_id INT UNSIGNED NULL,
  hospital_texto VARCHAR(200) NULL,
  ingreso_fecha DATE NULL,
  ingreso_detalle VARCHAR(120) NULL,
  estado ENUM('hospitalizado','alta','referido','fallecido','desconocido') NOT NULL DEFAULT 'desconocido',
  posible_duplicado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nombre_norm (nombre_norm),
  KEY idx_cedula (cedula),
  KEY idx_hospital (hospital_id),
  KEY idx_duplicado (posible_duplicado),
  FULLTEXT KEY ft_nombre (nombre),
  CONSTRAINT fk_pac_hosp FOREIGN KEY (hospital_id) REFERENCES hospitales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medicamentos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(200) NOT NULL,
  nombre_norm VARCHAR(200) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'otro',
  cantidad INT UNSIGNED NOT NULL DEFAULT 0,
  unidad VARCHAR(50) NOT NULL DEFAULT 'unidades',
  hospital_id INT UNSIGNED NULL,
  hospital_texto VARCHAR(200) NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  donante VARCHAR(150) NULL,
  notas TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nombre_norm (nombre_norm),
  KEY idx_categoria (categoria),
  KEY idx_hospital (hospital_id),
  KEY idx_disponible (disponible),
  FULLTEXT KEY ft_nombre (nombre),
  CONSTRAINT fk_med_hosp FOREIGN KEY (hospital_id) REFERENCES hospitales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semilla de Hospitales Principales de Venezuela
INSERT INTO hospitales (id, nombre, municipio, lat, lng) VALUES
(1, 'Hospital Universitario de Caracas (HUC)', 'Libertador', 10.4897, -66.8894),
(2, 'Hospital Dr. José María Vargas', 'Libertador', 10.5173, -66.9189),
(3, 'Hospital Miguel Pérez Carreño', 'Libertador', 10.4820, -66.9610),
(4, 'Hospital Dr. Domingo Luciani', 'Sucre', 10.4862, -66.8153),
(5, 'Hospital Central de Maracay', 'Girarldot', 10.2522, -67.5819),
(6, 'Hospital Universitario Dr. Ángel Larralde', 'Valencia', 10.2241, -68.0163),
(7, 'Hospital Universitario de Maracaibo', 'Maracaibo', 10.6728, -71.6353),
(8, 'Hospital Dr. Luis Razetti', 'Bolívar', 8.1283, -63.5414),
(9, 'Hospital Dr. Manuel Núñez Tovar', 'Maturín', 9.7497, -63.1794),
(10, 'Hospital Central de San Cristóbal', 'San Cristóbal', 7.7656, -72.2198);
