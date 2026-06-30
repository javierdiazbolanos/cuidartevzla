<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

header('Content-Type: text/plain; charset=UTF-8');

echo "=== TEST dedup_funcs.php ===\n\n";

// Test 1: include db.php solo
echo "[1] require_once db.php... ";
require_once __DIR__ . '/db.php';
echo "OK\n";

// Test 2: include dedup_funcs.php
echo "[2] require_once dedup_funcs.php... ";
require_once __DIR__ . '/dedup_funcs.php';
echo "OK\n";

// Test 3: verificar funciones clave
echo "[3] Funciones disponibles:\n";
$funcs = ['capitalize_name', 'fuzzy_match_paciente', 'merge_paciente', 'paciente_identico', 
           'get_volunteer_code_from_request', 'require_volunteer_code', 'norm_nombre',
           'clean_cedula', 'resolve_hospital', 'json_error', 'json_ok'];
foreach ($funcs as $f) {
    echo "    $f: " . (function_exists($f) ? "✓" : "✗ NO EXISTE") . "\n";
}

// Test 4: probar paciente_identico
echo "[4] Test paciente_identico... ";
$e = ['cedula' => '123', 'edad' => 30, 'sexo' => 'M', 
      'procedencia' => 'Ccs', 'estado' => 'estable', 'ingreso_fecha' => '2026-06-15'];
$n = ['cedula' => '123', 'edad' => 30, 'sexo' => 'M',
      'procedencia' => 'Ccs', 'estado' => 'estable', 'ingreso_fecha' => '2026-06-15'];
$result = paciente_identico($e, $n);
echo $result ? "✓ idéntico detectado\n" : "✗ ERROR: deberían ser idénticos\n";

// Test 5: probar conexion DB
echo "[5] Conexión DB... ";
try {
    $db = get_db_connection();
    echo "OK (MySQL " . $db->getAttribute(PDO::ATTR_SERVER_VERSION) . ")\n";
} catch (Exception $ex) {
    echo "FALLO: " . $ex->getMessage() . "\n";
}

// Test 6: verificar tabla carga_log
echo "[6] Tabla carga_log... ";
try {
    $db = get_db_connection();
    $r = $db->query("SHOW TABLES LIKE 'carga_log'");
    echo ($r->rowCount() > 0 ? "EXISTE" : "NO EXISTE") . "\n";
} catch (Exception $ex) {
    echo "ERROR: " . $ex->getMessage() . "\n";
}

// Test 7: php version + extensions
echo "[7] PHP " . PHP_VERSION . " | inet_pton: " . (function_exists('inet_pton') ? "✓" : "✗") . "\n";

echo "\n=== FIN DIAGNÓSTICO ===";