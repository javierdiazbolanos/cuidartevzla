<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Transporte Voluntario (transporte.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Autocorrección de esquema: agregar columna cedula si no existe
try {
    $db->query("SELECT cedula FROM transporte LIMIT 1");
} catch (PDOException $e) {
    try {
        $db->query("ALTER TABLE transporte ADD COLUMN cedula VARCHAR(20) NULL");
    } catch (PDOException $e2) {
        // Silenciar si hay error
    }
}

if ($method === 'GET') {
    // --- CONSULTA DE TRANSPORTE VOLUNTARIO ---
    
    $q = $_GET['q'] ?? '';
    $ciudad = $_GET['ciudad'] ?? '';
    $solo_disponibles = isset($_GET['solo_disponibles']) && ($_GET['solo_disponibles'] === '1' || $_GET['solo_disponibles'] === 'true');
    
    $conditions = [];
    $params = [];
    
    if (mb_strlen(trim($q)) >= 2) {
        $q_norm = norm_nombre($q);
        $conditions[] = "(nombre_norm LIKE ? OR vehiculo LIKE ? OR notas LIKE ?)";
        $params[] = '%' . $q_norm . '%';
        $params[] = '%' . $q . '%';
        $params[] = '%' . $q . '%';
    }
    
    if (!empty($ciudad)) {
        $conditions[] = "ciudad = ?";
        $params[] = trim($ciudad);
    }
    
    if ($solo_disponibles) {
        $conditions[] = "disponible = 1";
    }
    
    $where_clause = '';
    if (!empty($conditions)) {
        $where_clause = "WHERE " . implode(" AND ", $conditions);
    }
    
    $sql = "
        SELECT * FROM transporte
        $where_clause
        ORDER BY disponible DESC, nombre_norm ASC
        LIMIT 100
    ";
    
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        
        $resultados = [];
        foreach ($rows as $row) {
            $resultados[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'telefono' => $row['telefono'],
                'ciudad' => $row['ciudad'],
                'vehiculo' => $row['vehiculo'],
                'capacidad_personas' => (int)$row['capacidad_personas'],
                'capacidad_carga' => $row['capacidad_carga'],
                'disponible' => (bool)$row['disponible'],
                'notas' => $row['notas'] ?? ''
                // NOTA: No devolvemos la cédula en la consulta pública por seguridad y privacidad de contraseña
            ];
        }
        
        json_ok($resultados);
    } catch (PDOException $e) {
        json_error('Error al realizar la consulta de transporte: ' . $e->getMessage());
    }

} elseif ($method === 'POST') {
    // --- REGISTRAR NUEVO VEHÍCULO / CONDUCTOR VOLUNTARIO ---
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    $nombre = trim($input['nombre'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $ciudad = trim($input['ciudad'] ?? '');
    $vehiculo = trim($input['vehiculo'] ?? '');
    $capacidad_personas = isset($input['capacidad_personas']) ? (int)$input['capacidad_personas'] : 0;
    $capacidad_carga = trim($input['capacidad_carga'] ?? '0 kg');
    $cedula = clean_cedula($input['cedula'] ?? '');
    $notas = trim($input['notas'] ?? '');
    $disponible = isset($input['disponible']) ? (int)(bool)$input['disponible'] : 1;
    
    if (empty($nombre)) {
        json_error('El nombre del voluntario es obligatorio.');
    }
    if (empty($telefono)) {
        json_error('El teléfono de contacto es obligatorio.');
    }
    if (empty($ciudad)) {
        json_error('La ciudad de operación es obligatoria.');
    }
    if (empty($vehiculo)) {
        json_error('La descripción del vehículo es obligatoria.');
    }
    if (empty($cedula)) {
        json_error('La cédula de identidad es obligatoria y servirá como contraseña.');
    }
    
    $nombre_norm = norm_nombre($nombre);
    
    // Verificar si ya existe un registro con esa misma cédula
    try {
        $stmtCheck = $db->prepare("SELECT id FROM transporte WHERE cedula = ?");
        $stmtCheck->execute([$cedula]);
        if ($stmtCheck->fetch()) {
            json_error('Ya existe un vehículo registrado con esta cédula de identidad. Si deseas modificarlo, usa la opción de edición.');
        }
    } catch (PDOException $e) {
        // Continuar si la columna o búsqueda falla
    }
    
    try {
        $sql = "
            INSERT INTO transporte (
                nombre, nombre_norm, telefono, ciudad, vehiculo, 
                capacidad_personas, capacidad_carga, disponible, notas, cedula
            ) VALUES (
                ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?
            )
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $nombre,
            $nombre_norm,
            $telefono,
            $ciudad,
            $vehiculo,
            $capacidad_personas,
            $capacidad_carga,
            $disponible,
            $notas,
            $cedula
        ]);
        
        $new_id = (int)$db->lastInsertId();
        json_ok([
            'id' => $new_id,
            'nombre' => $nombre,
            'ciudad' => $ciudad,
            'disponible' => (bool)$disponible
        ]);
    } catch (PDOException $e) {
        json_error('Error al insertar el registro voluntario: ' . $e->getMessage());
    }

} elseif ($method === 'PUT') {
    // --- ACTUALIZAR REGISTRO DE TRANSPORTE (AUTENTICANDO CON CÉDULA) ---
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : null;
    $cedula = clean_cedula($input['cedula'] ?? '');
    
    if (!$id) {
        json_error('ID de registro requerido para actualizar.');
    }
    if (empty($cedula)) {
        json_error('La cédula de identidad es obligatoria para verificar tu identidad.');
    }
    
    // Verificar existencia y contraseña (cédula)
    try {
        $stmtCheck = $db->prepare("SELECT id, cedula FROM transporte WHERE id = ?");
        $stmtCheck->execute([$id]);
        $row = $stmtCheck->fetch();
        
        if (!$row) {
            json_error('Registro voluntario no encontrado.', 404);
        }
        
        // Autenticar por cédula
        $stored_cedula = clean_cedula($row['cedula'] ?? '');
        
        // Si el registro original no tiene cédula (semillas), permitimos asociarla o requerimos coincidencia si ya existe
        if (!empty($stored_cedula) && !hash_equals($stored_cedula, $cedula)) {
            json_error('La cédula de identidad ingresada no coincide con el registro original de este voluntario. Acceso denegado.', 403);
        }
    } catch (PDOException $e) {
        json_error('Error al comprobar la identidad: ' . $e->getMessage());
    }
    
    // Preparar campos para actualizar
    $fields = [];
    $params = [];
    
    if (isset($input['nombre'])) {
        $nombre = trim($input['nombre']);
        if (!empty($nombre)) {
            $fields[] = "nombre = ?";
            $params[] = $nombre;
            $fields[] = "nombre_norm = ?";
            $params[] = norm_nombre($nombre);
        }
    }
    
    if (isset($input['telefono'])) {
        $telefono = trim($input['telefono']);
        if (!empty($telefono)) {
            $fields[] = "telefono = ?";
            $params[] = $telefono;
        }
    }
    
    if (isset($input['ciudad'])) {
        $ciudad = trim($input['ciudad']);
        if (!empty($ciudad)) {
            $fields[] = "ciudad = ?";
            $params[] = $ciudad;
        }
    }
    
    if (isset($input['vehiculo'])) {
        $vehiculo = trim($input['vehiculo']);
        if (!empty($vehiculo)) {
            $fields[] = "vehiculo = ?";
            $params[] = $vehiculo;
        }
    }
    
    if (isset($input['capacidad_personas'])) {
        $fields[] = "capacidad_personas = ?";
        $params[] = (int)$input['capacidad_personas'];
    }
    
    if (isset($input['capacidad_carga'])) {
        $fields[] = "capacidad_carga = trim(?)";
        $params[] = trim($input['capacidad_carga']);
    }
    
    if (isset($input['disponible'])) {
        $fields[] = "disponible = ?";
        $params[] = (int)(bool)$input['disponible'];
    }
    
    if (isset($input['notas'])) {
        $fields[] = "notas = ?";
        $params[] = trim($input['notas']);
    }
    
    // Si la cédula en la DB era nula, la guardamos ahora para proteger el registro
    if (empty($stored_cedula)) {
        $fields[] = "cedula = ?";
        $params[] = $cedula;
    }
    
    if (empty($fields)) {
        json_error('No se especificaron cambios para el registro voluntario.');
    }
    
    try {
        $sql = "UPDATE transporte SET " . implode(", ", $fields) . " WHERE id = ?";
        $params[] = $id;
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        json_ok(['updated' => true, 'id' => $id]);
    } catch (PDOException $e) {
        json_error('Error al actualizar el registro en la base de datos: ' . $e->getMessage());
    }

} elseif ($method === 'DELETE') {
    // --- BORRAR REGISTRO VOLUNTARIO PERMANENTEMENTE (AUTENTICANDO CON CÉDULA) ---
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Si viene por QUERY en lugar de BODY (algunos clientes de red antiguos o restringidos)
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);
    $cedula = isset($input['cedula']) ? clean_cedula($input['cedula']) : (isset($_GET['cedula']) ? clean_cedula($_GET['cedula']) : '');
    
    if (!$id) {
        json_error('ID de registro requerido para eliminar.');
    }
    if (empty($cedula)) {
        json_error('La cédula de identidad es obligatoria para validar el borrado permanente.');
    }
    
    // Verificar existencia y autenticar
    try {
        $stmtCheck = $db->prepare("SELECT id, cedula FROM transporte WHERE id = ?");
        $stmtCheck->execute([$id]);
        $row = $stmtCheck->fetch();
        
        if (!$row) {
            json_error('Registro voluntario no encontrado.', 404);
        }
        
        $stored_cedula = clean_cedula($row['cedula'] ?? '');
        
        // Si el registro original no tiene cédula (semilla de ejemplo nacional), de igual forma validamos o bloqueamos
        if (!empty($stored_cedula) && !hash_equals($stored_cedula, $cedula)) {
            json_error('La cédula de identidad no coincide. No tienes permisos para borrar este registro.', 403);
        }
    } catch (PDOException $e) {
        json_error('Error al verificar la identidad antes del borrado: ' . $e->getMessage());
    }
    
    try {
        $stmtDel = $db->prepare("DELETE FROM transporte WHERE id = ?");
        $stmtDel->execute([$id]);
        json_ok(['deleted' => true, 'id' => $id]);
    } catch (PDOException $e) {
        json_error('Error al eliminar el registro voluntario de la base de datos: ' . $e->getMessage());
    }

} else {
    json_error('Método HTTP no soportado.', 405);
}
