-- Cuídarte Venezuela - Esquema de Base de Datos MySQL
-- Terremotos de Venezuela - Junio de 2026

-- Tabla de trazabilidad de cargas
CREATE TABLE carga_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  carga_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  carga_ip VARBINARY(16) NOT NULL COMMENT 'IP en formato binario (inet_pton)',
  carga_codigo VARCHAR(20) NOT NULL COMMENT 'Código de voluntario',
  PRIMARY KEY (id),
  INDEX idx_carga_timestamp (carga_timestamp),
  INDEX idx_carga_codigo (carga_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hospitales (
  id INT UNSIGNED NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  municipio VARCHAR(120) NULL,
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  telefono VARCHAR(40) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pacientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_origen INT UNSIGNED NULL,
  nombre VARCHAR(200) NOT NULL,
  nombre_norm VARCHAR(200) NOT NULL,
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
  carga_id INT UNSIGNED NULL COMMENT 'FK a carga_log.id',
  carga_secuencial INT UNSIGNED NULL COMMENT 'N° secuencial dentro de la carga',
  PRIMARY KEY (id),
  KEY idx_nombre_norm (nombre_norm),
  KEY idx_cedula (cedula),
  KEY idx_hospital (hospital_id),
  KEY idx_duplicado (posible_duplicado),
  KEY idx_carga_id (carga_id),
  FULLTEXT KEY ft_nombre (nombre),
  CONSTRAINT fk_pac_hosp FOREIGN KEY (hospital_id) REFERENCES hospitales(id),
  CONSTRAINT fk_pac_carga FOREIGN KEY (carga_id) REFERENCES carga_log(id) ON DELETE CASCADE
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

CREATE TABLE transporte (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  nombre_norm VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  vehiculo VARCHAR(200) NOT NULL,
  capacidad_personas INT UNSIGNED NOT NULL DEFAULT 0,
  capacidad_carga VARCHAR(150) NOT NULL DEFAULT '0 kg',
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  notas TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ciudad (ciudad),
  KEY idx_disponible (disponible),
  KEY idx_nombre_norm (nombre_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semilla de Hospitales Principales de Venezuela (50 centros a nivel nacional)
INSERT INTO hospitales (id, nombre, municipio, lat, lng, telefono) VALUES
(1, 'Hospital Universitario de Caracas (HUC)', 'Libertador', 10.4897, -66.8894, '(0212) 605-4050'),
(2, 'Hospital Dr. José María Vargas', 'Libertador', 10.5173, -66.9189, '(0212) 862-9965'),
(3, 'Hospital Dr. Miguel Pérez Carreño', 'Libertador', 10.4820, -66.9610, '(0212) 472-8472'),
(4, 'Hospital Dr. Domingo Luciani', 'Sucre', 10.4862, -66.8153, '(0212) 205-6501'),
(5, 'Hospital Central de Maracay', 'Girardot', 10.2522, -67.5819, NULL),
(6, 'Hospital Universitario Dr. Ángel Larralde', 'Valencia', 10.2241, -68.0163, NULL),
(7, 'Hospital Universitario de Maracaibo', 'Maracaibo', 10.6728, -71.6353, NULL),
(8, 'Hospital Universitario Ruiz y Páez', 'Heres', 8.1283, -63.5414, NULL),
(9, 'Hospital Dr. Manuel Núñez Tovar', 'Maturín', 9.7497, -63.1794, NULL),
(10, 'Hospital Central de San Cristóbal', 'San Cristóbal', 7.7656, -72.2198, NULL),
(20, 'Hospital Dr. José María Vargas — IVSS La Guaira', 'Vargas', 10.5983, -66.9322, '(0212) 227-1468'),
(31, 'Hospital Dr. Victorino Santaella', 'Guaicaipuro', 10.3139, -67.0403, '(0212) 364-0000'),
(32, 'Hospital Dr. de Niños J.M. de los Ríos', 'Libertador', 10.5103, -66.9031, '(0212) 574-3511'),
(33, 'Clínica CCCT', 'Chacao', 10.4912, -66.8375, '(0212) 959-6444'),
(34, 'Clínica El Ávila', 'Chacao', 10.4968, -66.8450, '(0212) 276-1111'),
(35, 'Cruz Roja Venezolana — Sede La Candelaria (Caracas)', 'Libertador', 10.5042, -66.9001, '(0212) 571-4380'),
(36, 'Grupo Médico Santa Paula', 'Baruta', 10.4632, -66.8322, '(0212) 917-6200'),
(37, 'Hospital Ana Francisca Pérez de León II (Petare)', 'Sucre', 10.4795, -66.8054, '(0212) 256-8448'),
(38, 'Hospital Ciudad Caribia', 'Libertador', 10.5364, -66.9532, '(0412) 377-1206'),
(39, 'Hospital Dr. José Gregorio Hernández (Magallanes)', 'Libertador', 10.5350, -66.9420, '(0212) 862-2910'),
(40, 'Hospital Militar Universitario Dr. Carlos Arvelo', 'Libertador', 10.4988, -66.9242, '(0212) 406-1241'),
(41, 'Hospital Periférico de Catia (Dr. Ricardo Baquero González)', 'Libertador', 10.5284, -66.9382, '(0212) 870-2266'),
(42, 'Hospital Periférico de Coche', 'Libertador', 10.4674, -66.9312, '(0212) 681-1133'),
(43, 'Materno Infantil del Valle (Hugo Chávez Frías)', 'Libertador', 10.4578, -66.8924, '(0212) 671-5902'),
(44, 'Policlínica La Arboleda', 'Libertador', 10.5124, -66.9015, '(0212) 550-1811'),
(45, 'Policlínica Santiago de León', 'Libertador', 10.4905, -66.8682, '(0212) 762-9025'),
(46, 'Policlínica David Lobo', 'Libertador', 10.5050, -66.9080, '(0212) 541-5465'),
(47, 'Policlínica Las Mercedes', 'Baruta', 10.4815, -66.8612, '(0212) 993-2323'),
(48, 'Sede del Sebin (La Guaira)', 'Vargas', 10.5925, -66.9410, '(0212) 541-7656'),
(49, 'IVSS — Hospital General de Misiones Nuevas Generaciones Hugo Chávez', 'Libertador', 10.4950, -66.9110, '(0212) 801-1000'),
(50, 'Clínica Canes', 'Libertador', 10.5064, -66.9309, '(0212) 471-4848');
