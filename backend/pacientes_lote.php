<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Carga por Lote de Pacientes (pacientes_lote.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST') {
    json_error('Método HTTP no soportado. Carga de lotes requiere POST.', 405);
}

// 1. Autorización por código de voluntario
require_volunteer_code();

// 2. Leer e interpretar el cuerpo JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    json_error('Cuerpo de solicitud JSON inválido.');
}

$pacientes_data = $input['pacientes'] ?? null;
if (!is_array($pacientes_data)) {
    json_error('Se requiere un arreglo de pacientes en la clave "pacientes".');
}

$total_filas = count($pacientes_data);
if ($total_filas === 0) {
    json_error('El lote de pacientes está vacío.');
}
if ($total_filas > 500) {
    json_error('El límite de carga por lote es de 500 registros por solicitud.');
}

// 3. Resolver variables compartidas al nivel de la raíz (opcional)
$shared_hospital_id = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
$shared_hospital_nuevo = $input['hospital_nuevo'] ?? null;
$shared_ingreso_fecha = validate_date($input['ingreso_fecha'] ?? null);

$resolved_shared_hosp_id = resolve_hospital($db, $shared_hospital_id, $shared_hospital_nuevo);
$shared_hospital_texto = !empty($shared_hospital_nuevo) ? trim($shared_hospital_nuevo) : ($input['hospital_texto'] ?? null);

// 4. Preparar declaraciones (statements) antes de iniciar la transacción para optimizar rendimiento
try {
    // Declaración 1: Búsqueda de duplicados por Cédula exacta
    $stmtCheckCedula = $db->prepare("SELECT id FROM pacientes WHERE cedula = ? LIMIT 1");
    
    // Declaración 2: Búsqueda de duplicados por Nombre Normalizado + Edad + Sexo
    $stmtCheckNombre = $db->prepare("
        SELECT id FROM pacientes 
        WHERE nombre_norm = ? 
          AND (edad = ? OR (? IS NULL AND edad IS NULL))
          AND sexo = ? 
        LIMIT 1
    ");
    
    // Declaración 3: Inserción de registro
    $stmtInsert = $db->prepare("
        INSERT INTO pacientes (
            nombre, nombre_norm, cedula, edad, sexo, procedencia, 
            hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, 
            estado, posible_duplicado
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?
        )
    ");
    
    // Declaración 4: Búsqueda de hospitales para resolver por registro (fila)
    $stmtCheckHospName = $db->prepare("SELECT id FROM hospitales WHERE nombre = ?");
    $stmtInsertHosp = $db->prepare("INSERT INTO hospitales (id, nombre, municipio) VALUES (?, ?, 'No especificado')");
} catch (PDOException $e) {
    json_error('Error preparando consultas de lote: ' . $e->getMessage(), 500);
}

// 5. Iniciar la transacción de base de datos
$db->beginTransaction();
$resultados = [];

try {
    foreach ($pacientes_data as $index => $row_data) {
        $fila_num = $index + 1;
        
        $nombre = $row_data['nombre'] ?? '';
        if (empty(trim($nombre))) {
            $resultados[] = [
                'fila' => $fila_num,
                'status' => 'error',
                'motivo' => 'Nombre de paciente vacío.'
            ];
            continue;
        }
        
        // Normalizaciones de datos
        $nombre_norm = norm_nombre($nombre);
        $cedula = clean_cedula($row_data['cedula'] ?? null);
        $edad = isset($row_data['edad']) && $row_data['edad'] !== '' ? (int)$row_data['edad'] : null;
        $sexo = norm_sexo($row_data['sexo'] ?? null);
        $procedencia = !empty($row_data['procedencia']) ? trim($row_data['procedencia']) : null;
        $ingreso_detalle = !empty($row_data['ingreso_detalle']) ? trim($row_data['ingreso_detalle']) : null;
        $estado = valid_estado($row_data['estado'] ?? 'desconocido');
        
        // Resolver fecha de ingreso: usar específica o heredar compartida
        $ingreso_fecha = validate_date($row_data['ingreso_fecha'] ?? null);
        if ($ingreso_fecha === null) {
            $ingreso_fecha = $shared_ingreso_fecha;
        }
        
        // Resolver Hospital por registro: usar específico o heredar compartido
        $hosp_id = isset($row_data['hospital_id']) && $row_data['hospital_id'] !== '' ? (int)$row_data['hospital_id'] : null;
        $hosp_nuevo = $row_data['hospital_nuevo'] ?? null;
        
        $row_hospital_id = null;
        $row_hospital_texto = null;
        
        if ($hosp_id !== null || !empty($hosp_nuevo)) {
            // Resolver hospital para este registro específico
            if ($hosp_id !== null && $hosp_id > 0) {
                $row_hospital_id = $hosp_id;
            } elseif (!empty($hosp_nuevo)) {
                $nombre_hosp = trim($hosp_nuevo);
                $stmtCheckHospName->execute([$nombre_hosp]);
                $hosp_row = $stmtCheckHospName->fetch();
                if ($hosp_row) {
                    $row_hospital_id = (int)$hosp_row['id'];
                } else {
                    // Obtener siguiente ID máximo disponible para hospitales de forma segura
                    $stmtMax = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM hospitales");
                    $next_id = (int)$stmtMax->fetchColumn();
                    
                    $stmtInsertHosp->execute([$next_id, $nombre_hosp]);
                    $row_hospital_id = $next_id;
                }
                $row_hospital_texto = $nombre_hosp;
            }
        } else {
            // Heredar hospital del lote
            $row_hospital_id = $resolved_shared_hosp_id;
            $row_hospital_texto = $shared_hospital_texto;
        }
        
        // Verificar duplicados automáticos (1 = duplicado, 0 = no duplicado)
        $posible_duplicado = 0;
        
        if (!empty($cedula)) {
            $stmtCheckCedula->execute([$cedula]);
            if ($stmtCheckCedula->fetch()) {
                $posible_duplicado = 1;
            }
        }
        
        if ($posible_duplicado === 0) {
            $stmtCheckNombre->execute([$nombre_norm, $edad, $edad, $sexo]);
            if ($stmtCheckNombre->fetch()) {
                $posible_duplicado = 1;
            }
        }
        
        // Insertar el paciente
        $stmtInsert->execute([
            trim($nombre),
            $nombre_norm,
            $cedula,
            $edad,
            $sexo,
            $procedencia,
            $row_hospital_id,
            $row_hospital_texto,
            $ingreso_fecha,
            $ingreso_detalle,
            $estado,
            $posible_duplicado
        ]);
        
        $inserted_id = (int)$db->lastInsertId();
        
        $resultados[] = [
            'fila' => $fila_num,
            'status' => 'success',
            'id' => $inserted_id,
            'duplicado' => (bool)$posible_duplicado
        ];
    }
    
    // Todo bien, confirmar transacciones
    $db->commit();
    json_ok(['resultados' => $resultados]);

} catch (Exception $e) {
    // Si algo falló catastróficamente, revertir la base de datos
    $db->rollBack();
    json_error('Error procesando lote en la base de datos: ' . $e->getMessage(), 500);
}
