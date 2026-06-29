<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Conexión y Funciones Auxiliares (db.php)
 * Terremotos de Venezuela - Junio de 2026
 */

// --- CONFIGURACIÓN DE BASE DE DATOS Y SEGURIDAD (EDITAR EN PRODUCCIÓN) ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'cuidarte_db');
define('DB_USER', 'cuidarte_user');
define('DB_PASS', 'cuidarte_password_secure_2026');
define('CODIGO_VOLUNTARIO', 'VENEZUELA_2026_DISASTER_RELIEF'); // Mínimo 10 caracteres

/**
 * Obtiene la conexión PDO singleton
 */
function get_db_connection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // No mostrar credenciales en producción
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'ok' => false,
                'error' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ]);
            exit;
        }
    }
    return $pdo;
}

/**
 * Configura las cabeceras CORS y Content-Type para respuestas JSON
 */
function cors_and_json(): void {
    // Permitir solicitudes de cualquier origen en un entorno de emergencia
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Codigo-Voluntario");
    header("Access-Control-Max-Age: 86400");

    // Si es una solicitud OPTIONS, salir de inmediato
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    header('Content-Type: application/json; charset=UTF-8');
}

/**
 * Retorna una respuesta JSON exitosa y termina la ejecución
 */
function json_ok(mixed $data): void {
    echo json_encode([
        'ok' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Retorna una respuesta JSON de error, código HTTP y termina la ejecución
 */
function json_error(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode([
        'ok' => false,
        'error' => $message
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Requiere que se envíe un código de voluntario válido en la cabecera HTTP_X_CODIGO_VOLUNTARIO
 */
function require_volunteer_code(): void {
    $headers = array_change_key_case(getallheaders(), CASE_LOWER);
    $received_code = '';

    if (isset($headers['x-codigo-voluntario'])) {
        $received_code = $headers['x-codigo-voluntario'];
    } elseif (isset($_SERVER['HTTP_X_CODIGO_VOLUNTARIO'])) {
        $received_code = $_SERVER['HTTP_X_CODIGO_VOLUNTARIO'];
    }

    if (empty($received_code) || !hash_equals(CODIGO_VOLUNTARIO, $received_code)) {
        json_error('Acceso denegado. Código de voluntario inválido o ausente.', 401);
    }
}

/**
 * Normaliza nombres eliminando acentos, convirtiendo a mayúsculas y colapsando espacios
 */
function norm_nombre(string $str): string {
    // 1. Reemplazo manual de caracteres con acentos en español como fallback
    $unwanted_array = [
        'á'=>'A', 'é'=>'E', 'í'=>'I', 'ó'=>'O', 'ú'=>'U', 'ü'=>'U', 'ñ'=>'N',
        'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ü'=>'U', 'Ñ'=>'N',
        'à'=>'a', 'è'=>'e', 'ì'=>'i', 'ò'=>'o', 'ù'=>'u', 'À'=>'A', 'È'=>'E', 'Ì'=>'I', 'Ò'=>'O', 'Ù'=>'U'
    ];
    $str = strtr($str, $unwanted_array);

    // 2. Normalizer si está disponible
    if (class_exists('Normalizer')) {
        $normalized = Normalizer::normalize($str, Normalizer::FORM_D);
        if ($normalized !== false) {
            $str = preg_replace('/\p{Mn}/u', '', $normalized) ?? $str;
        }
    }

    // 3. Convertir a mayúsculas de manera segura en UTF-8
    $str = mb_strtoupper($str, 'UTF-8');

    // 4. Limpieza de caracteres no deseados (mantener letras, números y espacios)
    $str = preg_replace('/[^A-Z0-9 ]/u', '', $str) ?? $str;

    // 5. Colapsar múltiples espacios y recortar
    $str = preg_replace('/\s+/', ' ', $str) ?? $str;
    return trim($str);
}

/**
 * Limpia la cédula para dejar solo números
 */
function clean_cedula(?string $str): ?string {
    if ($str === null) {
        return null;
    }
    // Eliminar todo lo que no sea dígito numérico (ej. "V-12.345.678" -> "12345678")
    $cleaned = preg_replace('/\D/', '', $str) ?? '';
    return $cleaned !== '' ? $cleaned : null;
}

/**
 * Enmascara la cédula de identidad para proteger la privacidad en vistas públicas
 */
function mask_cedula(?string $str): string {
    if (empty($str)) {
        return 'No registrada';
    }
    // Limpiarla antes de enmascarar
    $digits = preg_replace('/\D/', '', $str) ?? '';
    $len = strlen($digits);
    if ($len === 0) {
        return 'No registrada';
    }
    if ($len <= 3) {
        return '***' . $digits;
    }
    return '***' . substr($digits, -3);
}

/**
 * Normaliza y valida el sexo
 */
function norm_sexo(?string $str): string {
    if (empty($str)) {
        return 'Desconocido';
    }
    $str = trim(mb_strtolower($str, 'UTF-8'));
    if (str_starts_with($str, 'm') || str_contains($str, 'masc') || str_contains($str, 'hom')) {
        return 'Masculino';
    }
    if (str_starts_with($str, 'f') || str_contains($str, 'fem') || str_contains($str, 'muj')) {
        return 'Femenino';
    }
    return 'Desconocido';
}

/**
 * Valida que el estado del paciente esté entre los permitidos
 */
function valid_estado(?string $str): string {
    if (empty($str)) {
        return 'desconocido';
    }
    $allowed = ['hospitalizado', 'alta', 'referido', 'fallecido', 'desconocido'];
    $str = trim(strtolower($str));
    return in_array($str, $allowed, true) ? $str : 'desconocido';
}

/**
 * Valida fecha en formato YYYY-MM-DD
 */
function validate_date(?string $str): ?string {
    if (empty($str)) {
        return null;
    }
    $str = trim($str);
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $str)) {
        return $str;
    }
    // Intentar parsear si viene en otro formato
    $time = strtotime($str);
    if ($time !== false) {
        return date('Y-m-d', $time);
    }
    return null;
}

/**
 * Resuelve el ID del hospital, creando uno nuevo si es necesario
 */
function resolve_hospital(PDO $db, ?int $hospital_id, ?string $hospital_nuevo): ?int {
    if ($hospital_id !== null && $hospital_id > 0) {
        // Verificar que exista
        $stmt = $db->prepare("SELECT id FROM hospitales WHERE id = ?");
        $stmt->execute([$hospital_id]);
        if ($stmt->fetch()) {
            return $hospital_id;
        }
    }

    if (!empty($hospital_nuevo)) {
        $nombre_hosp = trim($hospital_nuevo);
        // Buscar por nombre exacto
        $stmt = $db->prepare("SELECT id FROM hospitales WHERE nombre = ?");
        $stmt->execute([$nombre_hosp]);
        $row = $stmt->fetch();
        if ($row) {
            return (int)$row['id'];
        }

        // Si no existe, insertar con MAX(id) + 1
        $db->beginTransaction();
        try {
            $stmtMax = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM hospitales");
            $nextId = (int)$stmtMax->fetchColumn();

            $stmtIns = $db->prepare("INSERT INTO hospitales (id, nombre, municipio) VALUES (?, ?, 'No especificado')");
            $stmtIns->execute([$nextId, $nombre_hosp]);
            $db->commit();
            return $nextId;
        } catch (Exception $e) {
            $db->rollBack();
            // Fallback: retornar null si falla
            return null;
        }
    }

    return null;
}

/**
 * Construye el objeto paciente a partir de una fila de base de datos
 */
function row_to_paciente(array $row, bool $include_details = false): array {
    $hospital = 'No registrado';
    if (!empty($row['hospital_nombre'])) {
        $hospital = $row['hospital_nombre'];
    } elseif (!empty($row['hospital_texto'])) {
        $hospital = $row['hospital_texto'];
    }

    $paciente = [
        'id' => (int)$row['id'],
        'nombre' => $row['nombre'],
        'edad' => $row['edad'] !== null ? (int)$row['edad'] : null,
        'sexo' => $row['sexo'],
        'hospital' => $hospital,
        'hospital_id' => $row['hospital_id'] !== null ? (int)$row['hospital_id'] : null,
        'ingreso_fecha' => $row['ingreso_fecha'],
        'estado' => $row['estado'],
        'posible_duplicado' => (bool)$row['posible_duplicado'],
        'cedula_masked' => mask_cedula($row['cedula'])
    ];

    if ($include_details) {
        $paciente['procedencia'] = $row['procedencia'] ?? 'No registrada';
        $paciente['ingreso_detalle'] = $row['ingreso_detalle'] ?? 'Sin detalles de ingreso';
        $paciente['cedula_enmascarada'] = mask_cedula($row['cedula']); // Duplicado de seguridad en español
    }

    return $paciente;
}

/**
 * Convierte un nombre a Proper Case (primera letra de cada palabra en mayúscula)
 * con manejo correcto de caracteres UTF-8 y partículas españolas.
 * 
 * "maría gonzález de la cruz" → "María González de la Cruz"
 * "JOSÉ  GARCÍA"              → "José García"
 */
function capitalize_name(string $str): string {
    // 1. Trim y colapsar espacios múltiples
    $str = trim(preg_replace('/\s+/', ' ', $str) ?? $str);
    if (empty($str)) {
        return $str;
    }
    
    // 2. Convertir todo a minúsculas primero (para limpiar MAYÚSCULAS mezcladas)
    $str = mb_strtolower($str, 'UTF-8');
    
    // 3. Capitalizar cada palabra
    $str = mb_convert_case($str, MB_CASE_TITLE, 'UTF-8');
    
    // 4. Corregir partículas españolas que deben ir en minúscula
    //    (excepto cuando son la primera palabra)
    $particulas = ['De', 'Del', 'La', 'Las', 'Los', 'El', 'Y', 'E', 'En', 'Con', 'Por', 'Para', 'Sin', 'Sobre', 'Tras'];
    $palabras = explode(' ', $str);
    $count = count($palabras);
    
    for ($i = 1; $i < $count; $i++) {
        if (in_array($palabras[$i], $particulas, true)) {
            $palabras[$i] = mb_strtolower($palabras[$i], 'UTF-8');
        }
    }
    
    return implode(' ', $palabras);
}

/**
 * Búsqueda fuzzy de paciente existente por nombre + hospital + edad
 * usando distancia Levenshtein. Retorna el mejor match si supera el umbral,
 * o null si no hay coincidencia.
 * 
 * Optimización: solo busca candidatos del mismo hospital (reduce O(n) drásticamente).
 * 
 * @param PDO $db Conexión a base de datos
 * @param string $nombre_norm Nombre normalizado (MAYÚSCULAS sin acentos)
 * @param int|null $hospital_id ID del hospital para acotar búsqueda
 * @param int|null $edad Edad del paciente
 * @param float $umbral Umbral de similitud (0.0 a 1.0). Default: 0.85
 * @return array|null Fila del paciente más similar, o null
 */
function fuzzy_match_paciente(PDO $db, string $nombre_norm, ?int $hospital_id, ?int $edad, float $umbral = 0.85): ?array {
    // Construir query para candidatos del mismo hospital
    if ($hospital_id !== null && $hospital_id > 0) {
        $stmt = $db->prepare("
            SELECT id, nombre_norm, nombre, cedula, edad, sexo, estado, 
                   hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, procedencia
            FROM pacientes 
            WHERE hospital_id = ?
            ORDER BY nombre_norm
        ");
        $stmt->execute([$hospital_id]);
    } else {
        // Sin hospital, buscar en todos (más caro pero necesario)
        $stmt = $db->query("
            SELECT id, nombre_norm, nombre, cedula, edad, sexo, estado,
                   hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, procedencia
            FROM pacientes 
            ORDER BY nombre_norm
        ");
    }
    
    $candidatos = $stmt->fetchAll();
    $best_match = null;
    $best_score = 0.0;
    $target_len = mb_strlen($nombre_norm);
    
    foreach ($candidatos as $candidato) {
        $cand_norm = $candidato['nombre_norm'];
        $max_len = max($target_len, mb_strlen($cand_norm));
        
        if ($max_len === 0) continue;
        
        // Calcular similitud Levenshtein normalizada
        $dist = levenshtein($nombre_norm, $cand_norm);
        $score = 1.0 - ($dist / $max_len);
        
        // Bonus por coincidencia de edad (±3 años)
        if ($edad !== null && $candidato['edad'] !== null) {
            $edad_diff = abs($edad - (int)$candidato['edad']);
            if ($edad_diff <= 3) {
                $score += 0.05 * (1.0 - $edad_diff / 4.0); // hasta +5% por edad exacta
            }
        }
        
        if ($score > $best_score) {
            $best_score = $score;
            $best_match = $candidato;
        }
    }
    
    return ($best_score >= $umbral) ? $best_match : null;
}

/**
 * Fusiona datos nuevos en un paciente existente (merge, no sobrescribir ciegamente).
 * 
 * Reglas:
 * - Campos NULL/vacíos en el registro original se llenan con los nuevos
 * - Campos existentes NO se pisan (el primer registro es más confiable)
 * - EXCEPCIÓN: 'estado' se actualiza si el nuevo es más grave o más reciente
 * - Se registra la operación en historial_merge para auditoría
 * 
 * @return array Campos que fueron agregados
 */
function merge_paciente(PDO $db, int $existing_id, array $nuevo, string $fuente = 'desconocida'): array {
    // 1. Obtener el registro existente
    $stmt = $db->prepare("SELECT * FROM pacientes WHERE id = ?");
    $stmt->execute([$existing_id]);
    $existente = $stmt->fetch();
    
    if (!$existente) {
        return [];
    }
    
    $campos_agregados = [];
    $updates = [];
    $params = [];
    
    // 2. Comparar campo por campo y llenar vacíos
    $mergeable_fields = [
        'cedula'           => 'string',
        'edad'             => 'int',
        'sexo'             => 'string',
        'procedencia'      => 'string',
        'ingreso_fecha'    => 'string',
        'ingreso_detalle'  => 'string',
        'hospital_id'      => 'int',
        'hospital_texto'   => 'string',
    ];
    
    foreach ($mergeable_fields as $field => $type) {
        $valor_existente = $existente[$field] ?? null;
        $valor_nuevo = $nuevo[$field] ?? null;
        
        // ¿El campo existente está vacío y el nuevo tiene valor?
        $existente_vacio = ($valor_existente === null || $valor_existente === '' || $valor_existente === 0);
        $nuevo_tiene_valor = ($valor_nuevo !== null && $valor_nuevo !== '' && $valor_nuevo !== 0);
        
        if ($existente_vacio && $nuevo_tiene_valor) {
            $updates[] = "$field = ?";
            $params[] = $valor_nuevo;
            $campos_agregados[] = $field;
        }
    }
    
    // 3. Actualizar 'nombre' si el existente es menos completo (ej: solo primer nombre)
    if (isset($nuevo['nombre']) && !empty($nuevo['nombre'])) {
        $nombre_existente_len = mb_strlen($existente['nombre']);
        $nombre_nuevo_len = mb_strlen($nuevo['nombre']);
        
        // Si el nuevo nombre es significativamente más completo (>30% más largo)
        if ($nombre_nuevo_len > $nombre_existente_len * 1.3) {
            $updates[] = "nombre = ?";
            $params[] = $nuevo['nombre'];
            
            // También actualizar nombre_norm
            if (isset($nuevo['nombre_norm'])) {
                $updates[] = "nombre_norm = ?";
                $params[] = $nuevo['nombre_norm'];
            }
            
            $campos_agregados[] = 'nombre';
        }
    }
    
    // 4. Actualizar estado si cambió (info clínica puede evolucionar)
    if (isset($nuevo['estado']) && $nuevo['estado'] !== $existente['estado']) {
        $updates[] = "estado = ?";
        $params[] = $nuevo['estado'];
        $campos_agregados[] = 'estado';
    }
    
    // 5. Ejecutar UPDATE si hay cambios
    if (!empty($updates)) {
        $sql = "UPDATE pacientes SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $existing_id;
        $stmtUpdate = $db->prepare($sql);
        $stmtUpdate->execute($params);
    }
    
    // 6. Registrar en historial de merge
    try {
        $stmtHist = $db->prepare("
            INSERT INTO historial_merge (paciente_id, fuente, campos_agregados, datos_nuevos)
            VALUES (?, ?, ?, ?)
        ");
        $stmtHist->execute([
            $existing_id,
            $fuente,
            implode(', ', $campos_agregados),
            json_encode($nuevo, JSON_UNESCAPED_UNICODE)
        ]);
    } catch (PDOException $e) {
        // La tabla puede no existir aún; no bloquear la operación
        error_log("merge_paciente: No se pudo escribir historial_merge: " . $e->getMessage());
    }
    
    return $campos_agregados;
}

/**
 * Determina si dos arrays de datos de paciente son idénticos
 * (para detectar registros sin cambios)
 */
function paciente_identico(array $existente, array $nuevo): bool {
    $campos_comparables = ['cedula', 'edad', 'sexo', 'procedencia', 'estado', 'ingreso_fecha'];
    
    foreach ($campos_comparables as $campo) {
        $val_existente = $existente[$campo] ?? null;
        $val_nuevo = $nuevo[$campo] ?? null;
        
        // Normalizar valores vacíos
        if ($val_existente === '' || $val_existente === 0) $val_existente = null;
        if ($val_nuevo === '' || $val_nuevo === 0) $val_nuevo = null;
        
        if ($val_existente !== $val_nuevo) {
            return false;
        }
    }
    
    return true;
}
