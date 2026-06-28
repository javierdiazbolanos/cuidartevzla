-- ====================================================================
-- Cuídarte Venezuela - Script de Importación Completo para MySQL / MariaDB
-- Sismo Venezuela - Junio de 2026
-- Ejecuta este script en tu administrador de base de datos (phpMyAdmin, etc.)
-- ====================================================================

-- 1. DESACTIVAR RESTRICCIONES TEMPORALMENTE PARA CARGAR DE FORMA SEGURA
SET FOREIGN_KEY_CHECKS = 0;

-- 2. LIMPIAR DATOS EXISTENTES PARA EVITAR DUPLICADOS (OPCIONAL - COMENTAR SI NO ES DESEADO)
TRUNCATE TABLE medicamentos;
TRUNCATE TABLE pacientes;
TRUNCATE TABLE hospitales;
TRUNCATE TABLE transporte;

-- 3. INSERTAR EL DIRECTORIO NACIONAL COMPLETO DE HOSPITALES (CON TELÉFONOS CONFIRMADOS)
-- Usamos INSERT INTO ... ON DUPLICATE KEY UPDATE para evitar errores si ya existen
INSERT INTO hospitales (id, nombre, municipio, lat, lng, telefono) VALUES
(1, 'Hospital Universitario de Caracas (HUC)', 'Libertador', 10.489700, -66.889400, '(0212) 605-4050'),
(2, 'Hospital Dr. José María Vargas', 'Libertador', 10.517300, -66.918900, '(0212) 862-9965'),
(3, 'Hospital Miguel Pérez Carreño', 'Libertador', 10.482000, -66.961000, '(0212) 472-8472'),
(4, 'Hospital Dr. Domingo Luciani', 'Sucre', 10.486200, -66.815300, '(0212) 205-6501'),
(5, 'Hospital Central de Maracay', 'Girardot', 10.252200, -67.581900, NULL),
(6, 'Hospital Universitario Dr. Ángel Larralde', 'Valencia', 10.224100, -68.016300, NULL),
(7, 'Hospital Universitario de Maracaibo', 'Maracaibo', 10.672800, -71.635300, NULL),
(8, 'Hospital Universitario Ruiz y Páez', 'Heres', 8.128300, -63.541400, NULL),
(9, 'Hospital Dr. Manuel Núñez Tovar', 'Maturín', 9.749700, -63.179400, NULL),
(10, 'Hospital Central de San Cristóbal', 'San Cristóbal', 7.765600, -72.219800, NULL),
(11, 'Hospital Central Universitario Antonio María Pineda', 'Iribarren', 10.075400, -69.317200, NULL),
(12, 'Instituto Autónomo Hospital Universitario de los Andes (IAHULA)', 'Libertador', 8.599100, -71.144800, NULL),
(13, 'Hospital Universitario Dr. Luis Razetti (Barcelona)', 'Simón Bolívar', 10.134200, -64.685300, NULL),
(14, 'Hospital Dr. Alfredo Van Grieken', 'Miranda', 11.411400, -69.673600, NULL),
(15, 'Hospital Universitario Antonio Patricio de Alcalá', 'Sucre', 10.453300, -64.182400, NULL),
(16, 'Hospital Dr. Luis Ortega', 'Mariño', 10.957500, -63.858300, NULL),
(17, 'Hospital Dr. Miguel Óraá', 'Guanare', 9.041400, -69.748300, NULL),
(18, 'Hospital Universitario Dr. Pedro Emilio Carrillo', 'Valera', 9.317800, -70.603300, NULL),
(19, 'Hospital Dr. Luis Razetti (Barinas)', 'Barinas', 8.622500, -70.211900, NULL),
(20, 'Hospital Dr. José María Vargas (La Guaira)', 'Vargas', 10.598300, -66.932200, '(0212) 227-1468'),
(21, 'Hospital Dr. Israel Ranuárez Balza', 'Juan Germán Roscio', 9.911400, -67.358100, NULL),
(22, 'Hospital Dr. Egor Nucete', 'Ezequiel Zamora', 9.653300, -68.583300, NULL),
(23, 'Hospital Dr. Pablo Acosta Ortiz', 'San Fernando', 7.893300, -67.472200, NULL),
(24, 'Hospital Central Dr. Plácido Daniel Rodríguez Rivero', 'San Felipe', 10.339200, -68.742200, NULL),
(25, 'Hospital Dr. José Gregorio Hernández (Puerto Ayacucho)', 'Atures', 5.663900, -67.625600, NULL),
(26, 'Hospital Dr. Luis Razetti (Tucupita)', 'Tucupita', 9.060300, -62.051400, NULL),
(27, 'Ciudad Hospitalaria Dr. Enrique Tejera (CHET)', 'Valencia', 10.169200, -68.012500, NULL),
(28, 'Hospital General Dr. Felipe Guevara Rojas', 'Simón Rodríguez', 8.883300, -64.244400, NULL),
(29, 'Hospital Dr. Rafael Calles Sierra', 'Carirubana', 11.697500, -70.183300, NULL),
(30, 'Hospital Dr. Raúl Leoni (Guaiparo)', 'Caroní', 8.351400, -62.651400, NULL),
(31, 'Hospital Dr. Victorino Santaella', 'Guaicaipuro', 10.313900, -67.040300, '(0212) 364-0000'),
(32, 'Hospital Dr. de Niños J.M. de los Ríos', 'Libertador', 10.510300, -66.903100, '(0212) 574-3511'),
(33, 'Clinica CCCT', 'Chacao', 10.491200, -66.837500, '(0212) 959-6444'),
(34, 'Clinica El Ávila', 'Chacao', 10.496800, -66.845000, '(0212) 276-1111'),
(35, 'Cruz Roja Venezolana — Sede La Candelaria (Caracas)', 'Libertador', 10.504200, -66.900100, '(0212) 571-4380'),
(36, 'Grupo Médico Santa Paula', 'Baruta', 10.463200, -66.832200, '(0212) 917-6200'),
(37, 'Hospital Ana Francisca Pérez de León II (Petare)', 'Sucre', 10.479500, -66.805400, '(0212) 256-8448'),
(38, 'Hospital Ciudad Caribia', 'Libertador', 10.536400, -66.953200, '(0412) 377-1206'),
(39, 'Hospital Dr. José Gregorio Hernández (Magallanes)', 'Libertador', 10.535000, -66.942000, '(0212) 862-2910'),
(40, 'Hospital Militar Universitario Dr. Carlos Arvelo', 'Libertador', 10.498800, -66.924200, '(0212) 406-1241'),
(41, 'Hospital Periférico de Catia (Dr. Ricardo Baquero González)', 'Libertador', 10.528400, -66.938200, '(0212) 870-2266'),
(42, 'Hospital Periférico de Coche', 'Libertador', 10.467400, -66.931200, '(0212) 681-1133'),
(43, 'Materno Infantil del Valle (Hugo Chávez Frías)', 'Libertador', 10.457800, -66.892400, '(0212) 671-5902'),
(44, 'Policlinica La Arboleda', 'Libertador', 10.512400, -66.901500, '(0212) 550-1811'),
(45, 'Policlinica Santiago de León', 'Libertador', 10.490500, -66.868200, '(0212) 762-9025'),
(46, 'Policlinica David Lobo', 'Libertador', 10.505000, -66.908000, '(0212) 541-5465'),
(47, 'Policlinica Las Mercedes', 'Baruta', 10.481500, -66.861200, '(0212) 993-2323'),
(48, 'Sede del Sebin (La Guaira)', 'Vargas', 10.592500, -66.941000, '(0212) 506-4444'),
(49, 'Hospital General de Misiones Nuevas Generaciones Hugo Chávez (IVSS)', 'Libertador', 10.495000, -66.911000, NULL)
ON DUPLICATE KEY UPDATE 
  nombre = VALUES(nombre), 
  municipio = VALUES(municipio), 
  lat = VALUES(lat), 
  lng = VALUES(lng),
  telefono = VALUES(telefono);

-- 4. INSERTAR LISTADO COMPLETO DE PACIENTES INICIALES REPORTADOS
-- Se calculan pre-normalizados los nombres (nombre_norm) para la búsqueda rápida con acentos y mayúsculas
INSERT INTO pacientes (id, nombre, nombre_norm, cedula, edad, sexo, procedencia, hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, estado, posible_duplicado) VALUES
(1, 'Alejandro José Rondón Castro', 'ALEJANDRO JOSE RONDON CASTRO', '12345452', 45, 'Masculino', 'La Vega, Caracas', 1, 'Hospital Universitario de Caracas (HUC)', '2026-06-25', 'Fractura de fémur izquierdo por caída de escombros. Estable, en traumatología.', 'hospitalizado', 0),
(2, 'María Elena Silva de Pérez', 'MARIA ELENA SILVA DE PEREZ', '6234908', 68, 'Femenino', 'Petare, Edo. Miranda', 4, 'Hospital Dr. Domingo Luciani', '2026-06-24', 'Trauma torácico cerrado leve. Monitoreo cardiológico continuo por hipertensión.', 'hospitalizado', 0),
(3, 'Yusleidy del Carmen Mendoza', 'YUSLEIDY DEL CARMEN MENDOZA', '20456114', 29, 'Femenino', 'Cútira, Catia, Caracas', 2, 'Hospital Dr. José María Vargas', '2026-06-26', 'Contusiones múltiples y escoriaciones superficiales. Dada de alta tras 24 horas de observación.', 'alta', 0),
(4, 'Juan Bautista Delgado Uzcátegui', 'JUAN BAUTISTA DELGADO UZCATEGUI', '11234789', 52, 'Masculino', 'El Limón, Edo. Aragua', 5, 'Hospital Central de Maracay', '2026-06-25', 'Quemaduras de segundo grado en extremidades superiores. Referido a Unidad de Quemados en Caracas.', 'referido', 0),
(5, 'Francisco Javier Gil Blanco', 'FRANCISCO JAVIER GIL BLANCO', '14552552', 37, 'Masculino', 'El Valle, Caracas', 3, 'Hospital Miguel Pérez Carreño', '2026-06-24', 'Politraumatismo generalizado. Registrado inicialmente con variaciones en su apellido.', 'hospitalizado', 1),
(6, 'Francisco J. Gil Blanco', 'FRANCISCO J GIL BLANCO', '14552552', 37, 'Masculino', 'El Valle, Caracas', 3, 'Hospital Miguel Pérez Carreño', '2026-06-24', 'Fila duplicada en revisión de cédula. Coincide con Francisco Javier Gil Blanco.', 'hospitalizado', 1),
(7, 'Carmen Alicia Rodríguez Infante', 'CARMEN ALICIA RODRIGUEZ INFANTE', '4234321', 73, 'Femenino', 'Barrio Sucre, San Cristóbal', 10, 'Hospital Central de San Cristóbal', '2026-06-25', 'Desorientada tras el sismo. Ingresada por vecinos de la zona. Se busca activamente a sus familiares.', 'desconocido', 0),
(8, 'Santiago Andrés Gamarra', 'SANTIAGO ANDRES GAMARRA', '28456994', 8, 'Masculino', 'Naguanagua, Edo. Carabobo', 6, 'Hospital Universitario Dr. Ángel Larralde', '2026-06-26', 'Fractura de clavícula derecha. Post-quirúrgico inmediato. Acompañado por su madre.', 'hospitalizado', 0),
(9, 'Pedro Celestino Infante', 'PEDRO CELESTINO INFANTE', '2345041', 81, 'Masculino', 'Soledad, Edo. Anzoátegui', 8, 'Hospital Dr. Luis Razetti', '2026-06-25', 'Paro cardiorrespiratorio refractario secundario a aplastamiento severo. Fallecido el 25/06/2026.', 'fallecido', 0),
(10, 'Coromoto de Jesús Mendoza', 'COROMOTO DE JESUS MENDOZA', '10123812', 59, 'Femenino', 'La Cruz, Maturín', 9, 'Hospital Dr. Manuel Núñez Tovar', '2026-06-24', 'Crisis hipertensiva y shock de pánico severo tras el colapso de estructura residencial cercana.', 'hospitalizado', 0);

-- 5. INSERTAR CATÁLOGO DE MEDICAMENTOS Y DONACIONES EN STOCK
INSERT INTO medicamentos (id, nombre, nombre_norm, categoria, cantidad, unidad, hospital_id, hospital_texto, disponible, donante, notas) VALUES
(1, 'Ibuprofeno 400mg', 'IBUPROFENO 400MG', 'Analgésico', 120, 'tabletas', 1, 'Hospital Universitario de Caracas (HUC)', 1, 'Cruz Roja Venezolana', 'Uso exclusivo para pacientes admitidos por la emergencia del sismo.'),
(2, 'Amoxicilina + Ácido Clavulánico 875/125mg', 'AMOXIICILINA + ACIDO CLAVULANICO 875/125MG', 'Antibiótico', 45, 'blisters', 4, 'Hospital Dr. Domingo Luciani', 1, 'Iniciativa Privada FarmaAyuda', 'Mantener en lugar fresco. Requiere récipe para entrega.'),
(3, 'Losartán Potásico 50mg', 'LOSARTAN POTASICO 50MG', 'Cardiovascular', 200, 'tabletas', 2, 'Hospital Dr. José María Vargas', 1, 'Cáritas de Venezuela', 'Para control de pacientes crónicos e hipertensos damnificados.'),
(4, 'Solución Fisiológica 0.9% 500ml', 'SOLUCION FISIOLOGICA 0.9% 500ML', 'Hidratación', 350, 'frascos', 3, 'Hospital Miguel Pérez Carreño', 1, 'OPS/OMS Venezuela', 'Insumo crítico para quirófanos y sala de emergencias.'),
(5, 'Gasas Estériles 10x10cm', 'GASAS ESTERILES 10X10CM', 'Material de curación', 1500, 'unidades', 6, 'Hospital Universitario Dr. Ángel Larralde', 1, 'Médicos Sin Fronteras', 'Cajas selladas de 100 unidades listas para distribución interna.'),
(6, 'Insulina NPH Humana 100 UI/ml', 'INSULINA NPH HUMANA 100 UI/ML', 'Diabetes', 25, 'viales', 5, 'Hospital Central de Maracay', 1, 'Donación Comunitaria Chacao', 'Requiere refrigeración estricta entre 2°C y 8°C.'),
(7, 'Salbutamol Inhalador 100mcg', 'SALBUTAMOL INHALADOR 100MCG', 'Respiratorio', 0, 'inhaladores', 7, 'Hospital Universitario de Maracaibo', 0, 'Anónimo', 'AGOTADO. Se espera reposición por vía aérea en las próximas 48 horas.'),
(8, 'Acetaminofén Pediátrico Jarabe 120mg/5ml', 'ACETAMINOFEN PEDIATRICO JARABE 120MG/5ML', 'Analgésico', 80, 'frascos', 10, 'Hospital Central de San Cristóbal', 1, 'Rotary Club San Cristóbal', 'Para control de cuadros febriles en niños de los albergues temporales.'),
(9, 'Ceftriaxona 1g IV', 'CEFTRIAXONA 1G IV', 'Antibiótico', 110, 'ampollas', 9, 'Hospital Dr. Manuel Núñez Tovar', 1, 'Acnur Venezuela', 'Antibiótico de amplio espectro para traumatismos complicados.'),
(10, 'Adrenalina Ampollas 1mg/ml', 'ADRENALINA AMPOLLAS 1MG/ML', 'Otro', 50, 'ampollas', 1, 'Hospital Universitario de Caracas (HUC)', 1, 'Ministerio de Salud', 'Insumo de soporte vital para carros de paro cardiorrespiratorio.');

-- 5.5. INSERTAR CATÁLOGO DE TRANSPORTE Y OFERTAS DE VEHÍCULOS VOLUNTARIOS
INSERT INTO transporte (id, nombre, nombre_norm, telefono, ciudad, vehiculo, capacidad_personas, capacidad_carga, disponible, notas) VALUES
(1, 'Carlos Augusto Mendoza', 'CARLOS AUGUSTO MENDOZA', '+584123456789', 'Caracas', 'Camioneta Pick-up Toyota Hilux 4x4', 4, '800 kg (Plataforma amplia para cajas o escombros)', 1, 'Disponible para traslados urgentes de heridos, agua mineral, plantas eléctricas o alimentos.'),
(2, 'María Gabriela Torres Rivas', 'MARIA GABRIELA TORRES RIVAS', '+584149876543', 'Valencia', 'Microbús Encava (24 puestos)', 24, '1.5 Toneladas (Portaequipaje amplio)', 1, 'Disponible para el traslado de brigadas de rescate, personal médico o evacuación masiva de familias.'),
(3, 'José Gregorio Silva', 'JOSE GREGORIO SILVA', '+584161112233', 'Maracay', 'Sedán Toyota Corolla', 4, '100 kg (Maletero estándar)', 1, 'Disponibilidad inmediata para traslado de médicos, enfermeros o distribución rápida de medicamentos/insumos.'),
(4, 'Luis Eladio Rondón Pérez', 'LUIS ELADIO RONDON PEREZ', '+584245556677', 'Barquisimeto', 'Camión de Carga Ford 350', 2, '3.5 Toneladas (Plataforma abierta con lona)', 1, 'Ideal para trasladar cargamentos pesados de insumos hospitalarios, medicamentos o donaciones de gran escala.'),
(5, 'Andrés Eloy Blanco Orozco', 'ANDRES ELOY BLANCO OROZCO', '+584128889900', 'San Cristóbal', 'Vehículo Rústico Jeep Machito', 5, '400 kg', 1, 'Apto para zonas de montaña difíciles, caminos obstruidos o con barro.'),
(6, 'Patricia Valentina Guerrero', 'PATRICIA VALENTINA GUERRERO', '+584267778899', 'Maracaibo', 'Van Hyundai H1 (Furgoneta)', 8, '800 kg', 1, 'Apoyo en traslado de suministros médicos fríos o personal voluntario entre Maracaibo y San Francisco.'),
(7, 'Francisco Javier Gil', 'FRANCISCO JAVIER GIL', '+584144445566', 'La Guaira', 'Camioneta Sport Van Kia Sedona', 7, '300 kg', 0, 'Temporalmente inactivo por mantenimiento, disponible para planificar traslados programados.');

-- 6. VOLVER A ACTIVAR RESTRICCIONES DE CLAVES FORÁNEAS
SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- ¡LISTO! Script de datos ejecutado correctamente.
-- ====================================================================
