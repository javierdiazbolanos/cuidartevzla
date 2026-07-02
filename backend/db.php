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
