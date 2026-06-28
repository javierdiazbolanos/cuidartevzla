-- ====================================================================
-- Cuídarte Venezuela - Migración de Hospitales (Producción)
-- Agrega y actualiza hospitales SIN borrar datos existentes
-- Ejecutar en phpMyAdmin o consola MySQL en InfinityFree
-- ====================================================================

-- Actualizar nombres normalizados y teléfonos existentes
INSERT INTO hospitales (id, nombre, municipio, lat, lng, telefono) VALUES

-- === ACTUALIZACIONES: Nombres normalizados + teléfonos ===

-- Corregir "Miguel Pérez Carreño" → "Dr. Miguel Pérez Carreño" (ya tenía teléfono)
(3, 'Hospital Dr. Miguel Pérez Carreño', 'Libertador', 10.482000, -66.961000, '(0212) 472-8472'),

-- Corregir "Clinica CCCT" → "Clínica CCCT"
(33, 'Clínica CCCT', 'Chacao', 10.491200, -66.837500, '(0212) 959-6444'),

-- Corregir "Clinica El Ávila" → "Clínica El Ávila"
(34, 'Clínica El Ávila', 'Chacao', 10.496800, -66.845000, '(0212) 276-1111'),

-- Actualizar teléfono Sede del Sebin (nuevo número confirmado)
(48, 'Sede del Sebin (La Guaira)', 'Vargas', 10.592500, -66.941000, '(0212) 541-7656'),

-- Corregir nombre + agregar teléfono IVSS Hugo Chávez
(49, 'IVSS — Hospital General de Misiones Nuevas Generaciones Hugo Chávez', 'Libertador', 10.495000, -66.911000, '(0212) 801-1000'),

-- Corregir nombre La Guaira → IVSS La Guaira
(20, 'Hospital Dr. José María Vargas — IVSS La Guaira', 'Vargas', 10.598300, -66.932200, '(0212) 227-1468'),

-- === NUEVOS HOSPITALES: Policlínicas (Caracas) ===
(44, 'Policlínica La Arboleda', 'Libertador', 10.512400, -66.901500, '(0212) 550-1811'),
(45, 'Policlínica Santiago de León', 'Libertador', 10.490500, -66.868200, '(0212) 762-9025'),
(46, 'Policlínica David Lobo', 'Libertador', 10.505000, -66.908000, '(0212) 541-5465'),
(47, 'Policlínica Las Mercedes', 'Baruta', 10.481500, -66.861200, '(0212) 993-2323'),

-- === NUEVO: Clínica Canes ===
(50, 'Clínica Canes', 'Libertador', 10.506400, -66.930900, '(0212) 471-4848'),

-- === NUEVOS: Hospitales nacionales con cobertura completa ===
-- Aragua / Carabobo
(27, 'Ciudad Hospitalaria Dr. Enrique Tejera (CHET)', 'Valencia', 10.169200, -68.012500, NULL),

-- Bolívar
(30, 'Hospital Dr. Raúl Leoni (Guaiparo)', 'Caroní', 8.351400, -62.651400, NULL),

-- Lara
(11, 'Hospital Central Universitario Antonio María Pineda', 'Iribarren', 10.075400, -69.317200, NULL),

-- Mérida
(12, 'Instituto Autónomo Hospital Universitario de los Andes (IAHULA)', 'Libertador', 8.599100, -71.144800, NULL),

-- Anzoátegui
(13, 'Hospital Universitario Dr. Luis Razetti (Barcelona)', 'Simón Bolívar', 10.134200, -64.685300, NULL),
(28, 'Hospital General Dr. Felipe Guevara Rojas', 'Simón Rodríguez', 8.883300, -64.244400, NULL),

-- Falcón
(14, 'Hospital Dr. Alfredo Van Grieken', 'Miranda', 11.411400, -69.673600, NULL),
(29, 'Hospital Dr. Rafael Calles Sierra', 'Carirubana', 11.697500, -70.183300, NULL),

-- Sucre
(15, 'Hospital Universitario Antonio Patricio de Alcalá', 'Sucre', 10.453300, -64.182400, NULL),

-- Nueva Esparta
(16, 'Hospital Dr. Luis Ortega', 'Mariño', 10.957500, -63.858300, NULL),

-- Portuguesa
(17, 'Hospital Dr. Miguel Óraá', 'Guanare', 9.041400, -69.748300, NULL),

-- Trujillo
(18, 'Hospital Universitario Dr. Pedro Emilio Carrillo', 'Valera', 9.317800, -70.603300, NULL),

-- Barinas
(19, 'Hospital Dr. Luis Razetti (Barinas)', 'Barinas', 8.622500, -70.211900, NULL),

-- Guárico
(21, 'Hospital Dr. Israel Ranuárez Balza', 'Juan Germán Roscio', 9.911400, -67.358100, NULL),

-- Cojedes
(22, 'Hospital Dr. Egor Nucete', 'Ezequiel Zamora', 9.653300, -68.583300, NULL),

-- Apure
(23, 'Hospital Dr. Pablo Acosta Ortiz', 'San Fernando', 7.893300, -67.472200, NULL),

-- Yaracuy
(24, 'Hospital Central Dr. Plácido Daniel Rodríguez Rivero', 'San Felipe', 10.339200, -68.742200, NULL),

-- Amazonas
(25, 'Hospital Dr. José Gregorio Hernández (Puerto Ayacucho)', 'Atures', 5.663900, -67.625600, NULL),

-- Delta Amacuro
(26, 'Hospital Dr. Luis Razetti (Tucupita)', 'Tucupita', 9.060300, -62.051400, NULL)

ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    municipio = VALUES(municipio),
    lat = VALUES(lat),
    lng = VALUES(lng),
    telefono = VALUES(telefono);

-- Verificar resultado
SELECT id, nombre, telefono FROM hospitales ORDER BY id;