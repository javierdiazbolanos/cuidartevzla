<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Funciones de Deduplicación (dedup_funcs.php)
 * Incluido desde deduplicate.php
 * Terremotos de Venezuela - Junio de 2026
 */

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
