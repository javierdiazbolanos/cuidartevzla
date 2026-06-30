<?php
/**
 * Cuídarte Venezuela - Runner de Migración de Edificios
 * Subir, ejecutar UNA vez, y ELIMINAR inmediatamente.
 */

$host = 'sql303.infinityfree.com';
$db   = 'if0_42285358_if0_42285358_cuidartevzla';
$user = 'if0_42285358';
$pass = 'P2CJJAJY8EhJcOm';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Conectado a la BD\n\n";
    
    $sql = file_get_contents(__DIR__ . '/edificios.sql');
    if (!$sql) {
        throw new Exception('No se pudo leer edificios.sql');
    }
    
    $statements = [];
    $current = '';
    $lines = explode("\n", $sql);
    
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '--')) continue;
        $current .= $line . "\n";
        if (str_ends_with($trimmed, ';')) {
            $statements[] = $current;
            $current = '';
        }
    }
    
    $total = count($statements);
    $ok = 0;
    $errors = [];
    
    foreach ($statements as $i => $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') continue;
        try {
            $pdo->exec($stmt);
            $ok++;
        } catch (PDOException $e) {
            $errors[] = "Error #" . ($i+1) . ": " . $e->getMessage();
        }
    }
    
    echo "📊 Resultado: $ok/$total statements ejecutados\n\n";
    
    if (!empty($errors)) {
        echo "⚠️ Errores:\n";
        foreach ($errors as $err) echo "  - $err\n";
    }
    
    // Verificar
    $totalCount = $pdo->query("SELECT COUNT(*) as c FROM edificios")->fetch()['c'];
    $totalCount2 = $pdo->query("SELECT COUNT(*) as c FROM edificios WHERE tipo_dano='total'")->fetch()['c'];
    $severoCount = $pdo->query("SELECT COUNT(*) as c FROM edificios WHERE tipo_dano='severo'")->fetch()['c'];
    
    echo "\n🏚️ Total edificios: $totalCount (🔴 Total: $totalCount2 | 🟠 Severo: $severoCount)\n";
    
    $sample = $pdo->query("SELECT nombre, tipo_dano FROM edificios ORDER BY id LIMIT 5");
    echo "\nPrimeros 5:\n";
    foreach ($sample as $row) {
        echo "  [{$row['tipo_dano']}] {$row['nombre']}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}