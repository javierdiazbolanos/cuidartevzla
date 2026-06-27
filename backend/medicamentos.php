<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Medicamentos (medicamentos.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // --- CONSULTA / DETALLE DE MEDICAMENTOS ---
    
    // Caso 1: Detalle por ID único
    if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("
            SELECT m.*, h.nombre AS hospital_nombre 
            FROM medicamentos m
            LEFT JOIN hospitales h ON m.hospital_id = h.id
            WHERE m.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        
        if (!$row) {
            json_error('Medicamento no encontrado.', 404);
        }
        
        $hospital = 'No registrado';
        if (!empty($row['hospital_nombre'])) {
            $hospital = $row['hospital_nombre'];
        } elseif (!empty($row['hospital_texto'])) {
            $hospital = $row['hospital_texto'];
        }
        
        $medicamento = [
            'id' => (int)$row['id'],
            'nombre' => $row['nombre'],
            'categoria' => $row['categoria'],
            'cantidad' => (int)$row['cantidad'],
            'unidad' => $row['unidad'],
            'hospital' => $hospital,
            'hospital_id' => $row['hospital_id'] !== null ? (int)$row['hospital_id'] : null,
            'disponible' => (bool)$row['disponible'],
            'donante' => $row['donante'] ?? 'Anónimo',
            'notas' => $row['notas'] ?? 'Sin notas adicionales'
        ];
        
        json_ok($medicamento);
    }
    
    // Caso 2: Búsqueda general por texto con filtros
    $q = $_GET['q'] ?? '';
    $categoria = $_GET['categoria'] ?? '';
    $hospital_id = isset($_GET['hospital_id']) && $_GET['hospital_id'] !== '' ? (int)$_GET['hospital_id'] : null;
    $solo_disponibles = isset($_GET['solo_disponibles']) && ($_GET['solo_disponibles'] === '1' || $_GET['solo_disponibles'] === 'true');
    
    $conditions = [];
    $params = [];
    
    if (mb_strlen(trim($q)) >= 2) {
        $q_norm = norm_nombre($q);
        $conditions[] = "m.nombre_norm LIKE ?";
        $params[] = '%' . $q_norm . '%';
    }
    
    if (!empty($categoria)) {
        $conditions[] = "m.categoria = ?";
        $params[] = trim($categoria);
    }
    
    if ($hospital_id !== null && $hospital_id > 0) {
        $conditions[] = "m.hospital_id = ?";
        $params[] = $hospital_id;
    }
    
    if ($solo_disponibles) {
        $conditions[] = "m.disponible = 1";
    }
    
    $where_clause = '';
    if (!empty($conditions)) {
        $where_clause = "WHERE " . implode(" AND ", $conditions);
    }
    
    $sql = "
        SELECT m.*, h.nombre AS hospital_nombre 
        FROM medicamentos m
        LEFT JOIN hospitales h ON m.hospital_id = h.id
        $where_clause
        ORDER BY m.disponible DESC, m.nombre_norm ASC
        LIMIT 100
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    $resultados = [];
    foreach ($rows as $row) {
        $hospital = 'No registrado';
        if (!empty($row['hospital_nombre'])) {
            $hospital = $row['hospital_nombre'];
        } elseif (!empty($row['hospital_texto'])) {
            $hospital = $row['hospital_texto'];
        }
        
        $resultados[] = [
            'id' => (int)$row['id'],
            'nombre' => $row['nombre'],
            'categoria' => $row['categoria'],
            'cantidad' => (int)$row['cantidad'],
            'unidad' => $row['unidad'],
            'hospital' => $hospital,
            'hospital_id' => $row['hospital_id'] !== null ? (int)$row['hospital_id'] : null,
            'disponible' => (bool)$row['disponible'],
            'donante' => $row['donante'] ?? 'Anónimo',
            'notas' => $row['notas'] ?? 'Sin notas adicionales'
        ];
    }
    
    json_ok($resultados);

} elseif ($method === 'POST') {
    // --- REGISTRAR NUEVO MEDICAMENTO (SOLO VOLUNTARIOS) ---
    require_volunteer_code();
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    $nombre = $input['nombre'] ?? '';
    $cantidad = isset($input['cantidad']) && $input['cantidad'] !== '' ? (int)$input['cantidad'] : null;
    
    if (empty(trim($nombre))) {
        json_error('El nombre del medicamento es obligatorio.');
    }
    if ($cantidad === null || $cantidad < 0) {
        json_error('La cantidad del medicamento es obligatoria y debe ser mayor o igual a cero.');
    }
    
    $nombre_norm = norm_nombre($nombre);
    $categoria = !empty($input['categoria']) ? trim($input['categoria']) : 'otro';
    $unidad = !empty($input['unidad']) ? trim($input['unidad']) : 'unidades';
    $disponible = isset($input['disponible']) ? (int)(bool)$input['disponible'] : 1;
    $donante = !empty($input['donante']) ? trim($input['donante']) : null;
    $notas = !empty($input['notas']) ? trim($input['notas']) : null;
    
    // Resolver hospital
    $hospital_id = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
    $hospital_nuevo = $input['hospital_nuevo'] ?? null;
    $resolved_hospital_id = resolve_hospital($db, $hospital_id, $hospital_nuevo);
    $hospital_texto = !empty($hospital_nuevo) ? trim($hospital_nuevo) : ($input['hospital_texto'] ?? null);
    
    $sql = "
        INSERT INTO medicamentos (
            nombre, nombre_norm, categoria, cantidad, unidad, 
            hospital_id, hospital_texto, disponible, donante, notas
        ) VALUES (
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?
        )
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        trim($nombre),
        $nombre_norm,
        $categoria,
        $cantidad,
        $unidad,
        $resolved_hospital_id,
        $hospital_texto,
        $disponible,
        trim((string)$donante),
        trim((string)$notas)
    ]);
    
    $new_id = (int)$db->lastInsertId();
    json_ok(['id' => $new_id]);

} elseif ($method === 'PUT') {
    // --- ACTUALIZAR MEDICAMENTO EXISTENTE (SOLO VOLUNTARIOS) ---
    require_volunteer_code();
    
    if (!isset($_GET['id'])) {
        json_error('ID de medicamento requerido.');
    }
    $id = (int)$_GET['id'];
    
    // Verificar existencia
    $stmtCheck = $db->prepare("SELECT id FROM medicamentos WHERE id = ?");
    $stmtCheck->execute([$id]);
    if (!$stmtCheck->fetch()) {
        json_error('Medicamento no encontrado.', 404);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    $fields = [];
    $params = [];
    
    if (isset($input['nombre'])) {
        $nombre = trim($input['nombre']);
        if (empty($nombre)) {
            json_error('El nombre del medicamento no puede estar vacío.');
        }
        $fields[] = "nombre = ?";
        $params[] = $nombre;
        
        $fields[] = "nombre_norm = ?";
        $params[] = norm_nombre($nombre);
    }
    
    if (isset($input['categoria'])) {
        $fields[] = "categoria = ?";
        $params[] = trim($input['categoria']);
    }
    
    if (isset($input['cantidad'])) {
        $fields[] = "cantidad = ?";
        $params[] = (int)$input['cantidad'];
    }
    
    if (isset($input['unidad'])) {
        $fields[] = "unidad = ?";
        $params[] = trim($input['unidad']);
    }
    
    if (isset($input['disponible'])) {
        $fields[] = "disponible = ?";
        $params[] = (int)(bool)$input['disponible'];
    }
    
    if (array_key_exists('donante', $input)) {
        $fields[] = "donante = ?";
        $params[] = !empty($input['donante']) ? trim($input['donante']) : null;
    }
    
    if (array_key_exists('notas', $input)) {
        $fields[] = "notas = ?";
        $params[] = !empty($input['notas']) ? trim($input['notas']) : null;
    }
    
    // Hospitales
    if (array_key_exists('hospital_id', $input) || isset($input['hospital_nuevo'])) {
        $hospital_id = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
        $hospital_nuevo = $input['hospital_nuevo'] ?? null;
        $resolved_hospital_id = resolve_hospital($db, $hospital_id, $hospital_nuevo);
        $hospital_texto = !empty($hospital_nuevo) ? trim($hospital_nuevo) : ($input['hospital_texto'] ?? null);
        
        $fields[] = "hospital_id = ?";
        $params[] = $resolved_hospital_id;
        
        $fields[] = "hospital_texto = ?";
        $params[] = $hospital_texto;
    }
    
    if (empty($fields)) {
        json_error('No se enviaron campos válidos para actualizar.');
    }
    
    $sql = "UPDATE medicamentos SET " . implode(", ", $fields) . " WHERE id = ?";
    $params[] = $id;
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    json_ok(['updated' => true]);
} else {
    json_error('Método HTTP no soportado.', 405);
}
