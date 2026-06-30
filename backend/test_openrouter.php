<?php
declare(strict_types=1);

/**
 * DIAGNÓSTICO: Test mínimo de conectividad con OpenRouter
 * Carga solo en entorno de prueba. BORRAR después de diagnosticar.
 * 
 * Uso: GET /api/test_openrouter.php
 */

require_once __DIR__ . '/db.php';

cors_and_json();

// ============================================================================
// TEST 1: ¿Existe require_volunteer_code?
// ============================================================================
echo "<h3>Test 1: require_volunteer_code</h3>";
echo "<pre>";
echo "function_exists('require_volunteer_code'): " . (function_exists('require_volunteer_code') ? 'SI' : 'NO') . "\n";
echo "function_exists('getallheaders'): " . (function_exists('getallheaders') ? 'SI' : 'NO') . "\n";
echo "function_exists('curl_init'): " . (function_exists('curl_init') ? 'SI' : 'NO') . "\n";
echo "function_exists('json_encode'): " . (function_exists('json_encode') ? 'SI' : 'NO') . "\n";
echo "ini_get('allow_url_fopen'): " . (ini_get('allow_url_fopen') ? 'SI' : 'NO') . "\n";
echo "PHP version: " . PHP_VERSION . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "</pre>";

// ============================================================================
// TEST 2: ¿Está definida OPENROUTER_API_KEY?
// ============================================================================
$openrouter_key = getenv('OPENROUTER_API_KEY') ?: '';
echo "<h3>Test 2: OPENROUTER_API_KEY</h3>";
echo "<pre>";
echo "Definida: " . (!empty($openrouter_key) ? 'SI (' . strlen($openrouter_key) . ' chars)' : 'NO') . "\n";
echo "getenv() funciona: " . (getenv('PATH') ? 'SI' : 'NO') . "\n";
echo "</pre>";

// ============================================================================
// TEST 3: Conexión HTTP a OpenRouter (payload mínimo)
// ============================================================================
echo "<h3>Test 3: Conexión a OpenRouter (payload mínimo, 10 tokens)</h3>";
echo "<pre>";

$testPayload = json_encode([
    'model' => 'google/gemini-2.5-flash-lite',
    'messages' => [
        ['role' => 'user', 'content' => 'Responde solo: OK']
    ],
    'max_tokens' => 10,
    'temperature' => 0
]);

$url = 'https://openrouter.ai/api/v1/chat/completions';
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openrouter_key,
    'HTTP-Referer: https://cuidartevzla.freedev.app',
    'X-Title: CuidarteVzla Test'
];

flush();

if (function_exists('curl_init')) {
    echo "Usando cURL...\n";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $testPayload,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
} else {
    echo "Usando file_get_contents...\n";
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $testPayload,
            'timeout' => 15,
            'ignore_errors' => true,
        ]
    ]);
    $response = @file_get_contents($url, false, $ctx);
    $httpCode = 0;
    if ($response !== false && isset($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (preg_match('#^HTTP/\d\.\d\s+(\d+)#', $h, $m)) {
                $httpCode = (int)$m[1];
                break;
            }
        }
    }
    $error = ($response === false) ? error_get_last()['message'] ?? 'timeout' : '';
}

echo "HTTP code: " . $httpCode . "\n";
echo "Response length: " . ($response ? strlen($response) : 0) . " bytes\n";
if ($error) echo "Error: " . $error . "\n";
if ($response && $httpCode === 200) {
    $data = json_decode($response, true);
    $content = $data['choices'][0]['message']['content'] ?? 'NO CONTENT';
    echo "OpenRouter response: " . $content . "\n";
    echo "TEST PASADO ✅\n";
} else {
    echo "TEST FALLADO ❌\n";
    if ($response && strlen($response) < 500) {
        echo "Response body: " . $response . "\n";
    }
}
echo "</pre>";

// ============================================================================
// TEST 4: ¿Puede el script recibir POST con imagen pequeña?
// ============================================================================
echo "<h3>Test 4: POST handler (usar con curl -X POST -d '{\"test\":true}')</h3>";
echo "<pre>";
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    echo "POST recibido: " . strlen($input) . " bytes\n";
    echo "Raw: " . substr($input, 0, 100) . "\n";
} else {
    echo "GET request — usa POST para probar\n";
}
echo "</pre>";