<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Motor de Deduplicación de Pacientes (deduplicate.php)
 * Terremotos de Venezuela - Junio de 2026
 * 
 * Endpoint centralizado que recibe registros de pacientes desde múltiples fuentes,
 * aplica matching en dos niveles (cédula exacta + fuzzy), y enriquece/enlaza
 * registros existentes en lugar de crear duplicados.
 * 
 * Entradas soportadas:
 *   - JSON estructurado: {"pacientes": [{...}, ...]}
 *   - CSV en texto:       {"csv": "nombre,cedula,edad\n..."}
 *   - Texto libre:        {"texto_libre": "María González 34 años V-12345678..."}
 *   - Paciente único:     {"paciente": {...}}
 * 
 * Salida: Reporte JSON con conteos y detalle por registro.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/dedup_funcs.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ============================================================================
// SOLO POST — este endpoint solo recibe datos
// ============================================================================
if ($method !== 'POST') {
    json_error('Método HTTP no soportado. Deduplicación requiere POST.', 405);
}

// Autorización por código de voluntario
require_volunteer_code();

// ============================================================================
// 1. PARSEO DE ENTRADA MULTIFORMATO
// ============================================================================
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    json_error('Cuerpo de solicitud JSON inválido.');
}

$fuente = $input['fuente'] ?? 'api_directa';
$pacientes_data = [];

// 1a. JSON estructurado (batch)
if (isset($input['pacientes']) && is_array($input['pacientes'])) {
    $pacientes_data = $input['pacientes'];
}
// 1b. Paciente único
elseif (isset($input['paciente']) && is_array($input['paciente'])) {
    $pacientes_data = [$input['paciente']];
}
// 1c. CSV en texto
elseif (isset($input['csv']) && is_string($input['csv'])) {
    $pacientes_data = parse_csv_text($input['csv']);
}
// 1d. Texto libre
elseif (isset($input['texto_libre']) && is_string($input['texto_libre'])) {
    $extracted = extract_from_free_text($input['texto_libre']);
    $pacientes_data = $extracted ? [$extracted] : [];
}
else {
    json_error('Formato de entrada no reconocido. Use "pacientes", "paciente", "csv" o "texto_libre".');
}

$total_recibidos = count($pacientes_data);

if ($total_recibidos === 0) {
    json_error('No se encontraron registros de pacientes para procesar.');
}

if ($total_recibidos > 500) {
    json_error('El límite máximo es de 500 registros por solicitud.');
}

// ============================================================================
// 2. PREPARAR STATEMENTS (fuera de la transacción = más rápido)
// ============================================================================
try {
    // Búsqueda por cédula exacta
    $stmtCedula = $db->prepare("
        SELECT id, nombre_norm, nombre, cedula, edad, sexo, estado, 
               hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, procedencia
        FROM pacientes 
        WHERE cedula = ? 
        LIMIT 1
    ");
    
    // Búsqueda fuzzy: candidatos del mismo hospital
    $stmtCandidatos = $db->prepare("
        SELECT id, nombre_norm, nombre, cedula, edad, sexo, estado,
               hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, procedencia
        FROM pacientes 
        WHERE hospital_id = ?
        ORDER BY nombre_norm
    ");
    
    // Búsqueda fuzzy sin hospital (fallback global)
    $stmtCandidatosGlobal = $db->prepare("
        SELECT id, nombre_norm, nombre, cedula, edad, sexo, estado,
               hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, procedencia
        FROM pacientes 
        ORDER BY nombre_norm
    ");
    
    // INSERT de nuevo paciente
    $stmtInsert = $db->prepare("
        INSERT INTO pacientes (
            nombre, nombre_norm, cedula, edad, sexo, procedencia,
            hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle,
            estado, posible_duplicado
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, 0
        )
    ");
    
    // Auditoría de merge
    $stmtAudit = null;
    try {
        $stmtAudit = $db->prepare("
            INSERT INTO historial_merge (paciente_id, fuente, campos_agregados, datos_nuevos)
            VALUES (?, ?, ?, ?)
        ");
    } catch (PDOException $e) {
        // Tabla puede no existir aún — no es bloqueante
    }
    
    // Resolución de hospital
    $stmtCheckHosp = $db->prepare("SELECT id FROM hospitales WHERE nombre = ?");
    $stmtInsertHosp = $db->prepare("INSERT INTO hospitales (id, nombre, municipio) VALUES (?, ?, 'No especificado')");
    
    // SELECT del registro existente para merge
    $stmtGetExistente = $db->prepare("SELECT * FROM pacientes WHERE id = ?");
    
} catch (PDOException $e) {
    json_error('Error preparando consultas: ' . $e->getMessage(), 500);
}

// ============================================================================
// 3. TRANSACCIÓN PRINCIPAL
// ============================================================================
$db->beginTransaction();

$nuevos = 0;
$mergeados = 0;
$sin_cambios = 0;
$errores = 0;
$detalle = [];

try {
    foreach ($pacientes_data as $index => $row) {
        $fila_num = $index + 1;
        
        // --- 3a. Validación y normalización del registro ---
        $nombre_raw = trim($row['nombre'] ?? '');
        
        if (empty($nombre_raw)) {
            $detalle[] = [
                'fila' => $fila_num,
                'nombre' => '(vacío)',
                'accion' => 'error',
                'motivo' => 'Nombre del paciente es obligatorio'
            ];
            $errores++;
            continue;
        }
        
        // Normalizaciones
        $nombre_norm = norm_nombre($nombre_raw);
        $nombre_display = capitalize_name($nombre_raw);   // Proper Case para mostrar
        $cedula = clean_cedula($row['cedula'] ?? null);
        $edad = isset($row['edad']) && $row['edad'] !== '' && $row['edad'] !== null 
                ? (int)$row['edad'] : null;
        $sexo = norm_sexo($row['sexo'] ?? null);
        $procedencia = !empty($row['procedencia']) ? trim($row['procedencia']) : null;
        $estado = valid_estado($row['estado'] ?? 'desconocido');
        $ingreso_fecha = validate_date($row['ingreso_fecha'] ?? null);
        $ingreso_detalle = !empty($row['ingreso_detalle']) ? trim($row['ingreso_detalle']) : null;
        
        // Resolver hospital
        $hospital_id = isset($row['hospital_id']) && $row['hospital_id'] !== '' 
                       ? (int)$row['hospital_id'] : null;
        $hospital_nuevo = $row['hospital_nuevo'] ?? null;
        $resolved_hosp_id = resolve_hospital_dedup($db, $stmtCheckHosp, $stmtInsertHosp, $hospital_id, $hospital_nuevo);
        $hospital_texto = !empty($hospital_nuevo) ? trim($hospital_nuevo) 
                          : ($row['hospital_texto'] ?? null);
        
        // --- 3b. MATCHING NIVEL 1: Cédula exacta (O(1) con índice) ---
        $matched_paciente = null;
        $match_tipo = '';
        
        if (!empty($cedula)) {
            $stmtCedula->execute([$cedula]);
            $matched_paciente = $stmtCedula->fetch();
            if ($matched_paciente) {
                $match_tipo = 'cedula';
            }
        }
        
        // --- 3c. MATCHING NIVEL 2: Fuzzy (nombre + hospital + edad) ---
        if ($matched_paciente === null) {
            $matched_paciente = fuzzy_match_local(
                $db, $stmtCandidatos, $stmtCandidatosGlobal,
                $nombre_norm, $resolved_hosp_id, $edad
            );
            if ($matched_paciente) {
                $match_tipo = 'fuzzy';
            }
        }
        
        // --- 3d. DECISIÓN: INSERT nuevo vs MERGE ---
        if ($matched_paciente === null) {
            // NUEVO paciente
            $stmtInsert->execute([
                $nombre_display,    // nombre en Proper Case
                $nombre_norm,       // nombre_norm en MAYÚSCULAS
                $cedula,
                $edad,
                $sexo,
                $procedencia,
                $resolved_hosp_id,
                $hospital_texto,
                $ingreso_fecha,
                $ingreso_detalle,
                $estado
            ]);
            
            $new_id = (int)$db->lastInsertId();
            $nuevos++;
            
            $detalle[] = [
                'fila' => $fila_num,
                'nombre' => $nombre_display,
                'accion' => 'nuevo',
                'id' => $new_id
            ];
            
        } else {
            // POSIBLE MATCH — verificar si hay datos nuevos para merge
            $datos_nuevos = [
                'nombre'       => $nombre_display,
                'nombre_norm'  => $nombre_norm,
                'cedula'       => $cedula,
                'edad'         => $edad,
                'sexo'         => $sexo,
                'procedencia'  => $procedencia,
                'estado'       => $estado,
                'ingreso_fecha' => $ingreso_fecha,
                'ingreso_detalle' => $ingreso_detalle,
                'hospital_id'  => $resolved_hosp_id,
                'hospital_texto' => $hospital_texto,
            ];
            
            $existing_id = (int)$matched_paciente['id'];
            
            // Verificar si los datos son idénticos
            if (paciente_identico($matched_paciente, $datos_nuevos)) {
                $sin_cambios++;
                $detalle[] = [
                    'fila' => $fila_num,
                    'nombre' => $nombre_display,
                    'accion' => 'sin_cambios',
                    'id' => $existing_id,
                    'motivo' => 'datos_identicos',
                    'match_tipo' => $match_tipo
                ];
            } else {
                // MERGE — enriquecer registro existente
                $campos_agregados = merge_paciente_local(
                    $db, $stmtGetExistente, $stmtAudit,
                    $existing_id, $datos_nuevos, $fuente
                );
                
                $mergeados++;
                $detalle[] = [
                    'fila' => $fila_num,
                    'nombre' => $nombre_display,
                    'accion' => 'merge',
                    'id' => $existing_id,
                    'match_tipo' => $match_tipo,
                    'campos_agregados' => $campos_agregados
                ];
            }
        }
    }
    
    // Todo bien: confirmar transacción
    $db->commit();
    
    // ============================================================================
    // 4. REPORTE FINAL
    // ============================================================================
    $reporte = [
        'ok' => true,
        'total_recibidos' => $total_recibidos,
        'nuevos' => $nuevos,
        'mergeados' => $mergeados,
        'sin_cambios' => $sin_cambios,
        'errores' => $errores,
        'detalle' => $detalle
    ];
    
    echo json_encode($reporte, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    $db->rollBack();
    json_error('Error procesando deduplicación: ' . $e->getMessage(), 500);
}


// ============================================================================
// FUNCIONES AUXILIARES INTERNAS
// ============================================================================

/**
 * Resuelve el hospital para el motor de dedup (usa statements pre-preparados)
 */
function resolve_hospital_dedup(PDO $db, PDOStatement $stmtCheck, PDOStatement $stmtInsert, 
                                 ?int $hospital_id, ?string $hospital_nuevo): ?int {
    if ($hospital_id !== null && $hospital_id > 0) {
        return $hospital_id;
    }
    
    if (!empty($hospital_nuevo)) {
        $nombre = trim($hospital_nuevo);
        $stmtCheck->execute([$nombre]);
        $row = $stmtCheck->fetch();
        if ($row) {
            return (int)$row['id'];
        }
        
        // Insertar nuevo hospital
        $stmtMax = $db->query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM hospitales");
        $nextId = (int)$stmtMax->fetchColumn();
        $stmtInsert->execute([$nextId, $nombre]);
        return $nextId;
    }
    
    return null;
}

/**
 * Búsqueda fuzzy optimizada con statements pre-preparados.
 * Primero busca en el mismo hospital, luego fallback global.
 */
function fuzzy_match_local(PDO $db, PDOStatement $stmtLocal, PDOStatement $stmtGlobal,
                            string $nombre_norm, ?int $hospital_id, ?int $edad): ?array {
    $candidatos = [];
    
    if ($hospital_id !== null && $hospital_id > 0) {
        $stmtLocal->execute([$hospital_id]);
        $candidatos = $stmtLocal->fetchAll();
    }
    
    // Si no hay candidatos en el hospital, buscar globalmente
    if (empty($candidatos)) {
        $stmtGlobal->execute();
        $candidatos = $stmtGlobal->fetchAll();
    }
    
    if (empty($candidatos)) {
        return null;
    }
    
    $best_match = null;
    $best_score = 0.0;
    $target_len = mb_strlen($nombre_norm);
    
    foreach ($candidatos as $candidato) {
        $cand_norm = $candidato['nombre_norm'];
        $max_len = max($target_len, mb_strlen($cand_norm));
        
        if ($max_len === 0) continue;
        
        // Levenshtein normalizado
        $dist = levenshtein($nombre_norm, $cand_norm);
        $score = 1.0 - ($dist / $max_len);
        
        // Bonus por coincidencia de edad (±3 años)
        if ($edad !== null && $candidato['edad'] !== null) {
            $edad_diff = abs($edad - (int)$candidato['edad']);
            if ($edad_diff <= 3) {
                $score += 0.05 * (1.0 - $edad_diff / 4.0);
            }
        }
        
        if ($score > $best_score) {
            $best_score = $score;
            $best_match = $candidato;
        }
    }
    
    // Umbral: 85% de similitud
    return ($best_score >= 0.85) ? $best_match : null;
}

/**
 * Versión local de merge_paciente que usa statements pre-preparados
 */
function merge_paciente_local(PDO $db, PDOStatement $stmtGet, ?PDOStatement $stmtAudit,
                               int $existing_id, array $nuevo, string $fuente): array {
    $stmtGet->execute([$existing_id]);
    $existente = $stmtGet->fetch();
    
    if (!$existente) {
        return [];
    }
    
    $campos_agregados = [];
    $updates = [];
    $params = [];
    
    // Campos mergeables (llenar vacíos, no sobrescribir)
    $mergeable = [
        'cedula'          => null,
        'edad'            => null,
        'sexo'            => null,
        'procedencia'     => null,
        'ingreso_fecha'   => null,
        'ingreso_detalle' => null,
        'hospital_id'     => null,
        'hospital_texto'  => null,
    ];
    
    foreach ($mergeable as $field => $_) {
        $val_exist = $existente[$field] ?? null;
        $val_nuevo = $nuevo[$field] ?? null;
        
        $exist_vacio = ($val_exist === null || $val_exist === '' || $val_exist === 0);
        $nuevo_lleno = ($val_nuevo !== null && $val_nuevo !== '' && $val_nuevo !== 0);
        
        if ($exist_vacio && $nuevo_lleno) {
            $updates[] = "$field = ?";
            $params[] = $val_nuevo;
            $campos_agregados[] = $field;
        }
    }
    
    // Nombre más completo
    if (!empty($nuevo['nombre']) && mb_strlen($nuevo['nombre']) > mb_strlen($existente['nombre']) * 1.3) {
        $updates[] = "nombre = ?";
        $params[] = $nuevo['nombre'];
        $updates[] = "nombre_norm = ?";
        $params[] = $nuevo['nombre_norm'] ?? norm_nombre($nuevo['nombre']);
        $campos_agregados[] = 'nombre';
    }
    
    // Estado (si cambió)
    if (isset($nuevo['estado']) && $nuevo['estado'] !== $existente['estado']) {
        $updates[] = "estado = ?";
        $params[] = $nuevo['estado'];
        $campos_agregados[] = 'estado';
    }
    
    // Ejecutar UPDATE
    if (!empty($updates)) {
        $params[] = $existing_id;
        $sql = "UPDATE pacientes SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmtUpd = $db->prepare($sql);
        $stmtUpd->execute($params);
    }
    
    // Auditoría
    if ($stmtAudit !== null && !empty($campos_agregados)) {
        try {
            $stmtAudit->execute([
                $existing_id,
                $fuente,
                implode(', ', $campos_agregados),
                json_encode($nuevo, JSON_UNESCAPED_UNICODE)
            ]);
        } catch (PDOException $e) {
            error_log("dedup audit: " . $e->getMessage());
        }
    }
    
    return $campos_agregados;
}

// ============================================================================
// PARSERS DE ENTRADA
// ============================================================================

/**
 * Parsea texto CSV en crudo a array de pacientes.
 * Detecta automáticamente delimitador (coma, tab, punto y coma).
 * Primera línea = cabeceras.
 */
function parse_csv_text(string $csv_text): array {
    $lines = explode("\n", trim($csv_text));
    if (count($lines) < 2) {
        return [];
    }
    
    // Detectar delimitador
    $header = $lines[0];
    $delimiter = ',';
    if (substr_count($header, "\t") > substr_count($header, ',')) {
        $delimiter = "\t";
    } elseif (substr_count($header, ';') > substr_count($header, ',')) {
        $delimiter = ';';
    }
    
    // Parsear cabeceras
    $headers = array_map('trim', str_getcsv($header, $delimiter));
    $headers = array_map('strtolower', $headers);
    
    // Mapeo de nombres de columna comunes → campos del sistema
    $column_map = [
        'nombre'           => 'nombre',
        'nombre completo'  => 'nombre',
        'paciente'         => 'nombre',
        'name'             => 'nombre',
        'cedula'           => 'cedula',
        'cédula'           => 'cedula',
        'ci'               => 'cedula',
        'documento'        => 'cedula',
        'edad'             => 'edad',
        'age'              => 'edad',
        'sexo'             => 'sexo',
        'genero'           => 'sexo',
        'género'           => 'sexo',
        'sex'              => 'sexo',
        'hospital'         => 'hospital_nuevo',
        'centro'           => 'hospital_nuevo',
        'procedencia'      => 'procedencia',
        'estado'           => 'estado',
        'fecha'            => 'ingreso_fecha',
        'fecha ingreso'    => 'ingreso_fecha',
        'ingreso'          => 'ingreso_fecha',
    ];
    
    $resultado = [];
    for ($i = 1; $i < count($lines); $i++) {
        $line = trim($lines[$i]);
        if (empty($line)) continue;
        
        $values = str_getcsv($line, $delimiter);
        $row = [];
        
        foreach ($headers as $idx => $col_name) {
            $valor = trim($values[$idx] ?? '');
            $campo = $column_map[$col_name] ?? null;
            if ($campo && $valor !== '') {
                $row[$campo] = $valor;
            }
        }
        
        if (!empty($row['nombre'])) {
            $resultado[] = $row;
        }
    }
    
    return $resultado;
}

/**
 * Extrae campos de paciente desde texto libre usando heurística.
 * Diseñado para manejar formatos como:
 *   "María González, 34 años, V-12.345.678, Hospital Central"
 *   "Paciente: José García, Edad: 45, Cédula: 8765432, Sexo: M"
 */
function extract_from_free_text(string $text): ?array {
    $text = trim($text);
    if (empty($text)) return null;
    
    $result = [];
    
    // --- Cédula (patrones venezolanos: V-12345678, E-12345678, solo dígitos 5-10) ---
    if (preg_match('/[VE][-_]?\s*(\d{1,2}[.]?\d{3}[.]?\d{3})/i', $text, $m)) {
        $result['cedula'] = $m[1];
    } elseif (preg_match('/\b(\d{7,9})\b/', $text, $m)) {
        $result['cedula'] = $m[1];
    }
    
    // --- Edad ---
    if (preg_match('/(\d{1,3})\s*años/i', $text, $m)) {
        $edad = (int)$m[1];
        if ($edad > 0 && $edad <= 120) $result['edad'] = $m[1];
    } elseif (preg_match('/edad[:\s]*(\d{1,3})/i', $text, $m)) {
        $edad = (int)$m[1];
        if ($edad > 0 && $edad <= 120) $result['edad'] = $m[1];
    }
    
    // --- Sexo ---
    if (preg_match('/\b(masculino|hombre|varon|varón|macho)\b/i', $text)) {
        $result['sexo'] = 'Masculino';
    } elseif (preg_match('/\b(femenino|mujer|hembra|femenina)\b/i', $text)) {
        $result['sexo'] = 'Femenino';
    } elseif (preg_match('/sexo[:\s]*([MF])\b/i', $text, $m)) {
        $result['sexo'] = strtoupper($m[1]) === 'M' ? 'Masculino' : 'Femenino';
    }
    
    // --- Hospital ---
    if (preg_match('/(hospital|clínica|clinica|cruz roja|ivss|cdi)\s+([^,.]+)/i', $text, $m)) {
        $result['hospital_nuevo'] = trim($m[1] . ' ' . $m[2]);
    } elseif (preg_match('/en\s+(el|la)\s+(hospital|clínica|clinica)\s+([^,.]+)/i', $text, $m)) {
        $result['hospital_nuevo'] = trim($m[2] . ' ' . $m[3]);
    }
    
    // --- Estado ---
    if (preg_match('/\b(hospitalizado|hospitalizada|ingresado|ingresada|internado|internada)\b/i', $text)) {
        $result['estado'] = 'hospitalizado';
    } elseif (preg_match('/\b(alta|dado de alta)\b/i', $text)) {
        $result['estado'] = 'alta';
    } elseif (preg_match('/\b(fallecido|fallecida|falleció|muerto|muerta)\b/i', $text)) {
        $result['estado'] = 'fallecido';
    } elseif (preg_match('/\b(referido|transferido|trasladado|trasladada)\b/i', $text)) {
        $result['estado'] = 'referido';
    }
    
    // --- Nombre: limpiar el texto de todos los patrones ya capturados ---
    $clean = $text;
    // Remover cédula (con y sin número)
    $clean = preg_replace('/[VE][-_]?\s*\d{1,2}[.]?\d{3}[.]?\d{3}/i', '', $clean);
    $clean = preg_replace('/\b\d{7,9}\b/', '', $clean);
    $clean = preg_replace('/\b(cedula|cédula|ci|documento)\b[:\s]*\d*/i', '', $clean);
    // Remover edad
    $clean = preg_replace('/\d{1,3}\s*años/i', '', $clean);
    $clean = preg_replace('/edad[:\s]*\d{1,3}/i', '', $clean);
    // Remover sexo
    $clean = preg_replace('/\b(masculino|femenino|hombre|mujer|varon|varón|hembra)\b/i', '', $clean);
    $clean = preg_replace('/sexo[:\s]*[MF]\b/i', '', $clean);
    // Remover hospital (patrón completo)
    $clean = preg_replace('/\b(hospital|clínica|clinica|cruz\s*roja|ivss|cdi)\b[:\s]*[^,.;]*/i', '', $clean);
    // Remover estado
    $clean = preg_replace('/estado[:\s]*(hospitalizado|hospitalizada|alta|fallecido|fallecida|referido|trasladado|desconocido|critico|crítico|grave|estable)\b/i', '', $clean);
    $clean = preg_replace('/\b(hospitalizado|hospitalizada|ingresado|ingresada|internado|internada|fallecido|fallecida|referido|trasladado)\b/i', '', $clean);
    // Remover etiquetas comunes
    $clean = preg_replace('/(paciente|nombre|hospital|procedencia|fecha|ingreso|notas?)[:\s]*/i', '', $clean);
    // Limpiar puntuación residual y espacios
    $clean = preg_replace('/[,;:]+/', ' ', $clean);
    $clean = preg_replace('/\s{2,}/', ' ', $clean);
    $clean = trim($clean);
    
    $nombre = $clean;
    if (!empty($nombre) && mb_strlen($nombre) >= 3) {
        $result['nombre'] = $nombre;
    }
    
    return !empty($result['nombre']) ? $result : null;
}
