<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Proxy Seguro LLM OCR (procesar_con_llm.php)
 * Terremotos de Venezuela - Junio de 2026
 *
 * Proxy backend que recibe una imagen base64, la envía a Gemini Flash vía OpenRouter,
 * y devuelve datos estructurados de pacientes extraídos por IA.
 *
 * SEGURIDAD: La API key de OpenRouter NUNCA se expone al frontend.
 *            Solo se aceptan solicitudes POST con código de voluntario válido.
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido. Use POST.']);
    exit;
}

require_volunteer_code();

// ============================================================================
// CONFIGURACIÓN — API KEY SERVER-SIDE (NUNCA EXPUESTA AL CLIENTE)
// ============================================================================
// En InfinityFree, setear esto como variable de entorno o hardcodear aquí.
// Para producción: usar getenv('OPENROUTER_API_KEY') después de configurarla
// en el panel de InfinityFree (Variables de entorno PHP).
$OPENROUTER_API_KEY = getenv('OPENROUTER_API_KEY') ?: '';

if (empty($OPENROUTER_API_KEY)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'API key de OpenRouter no configurada en el servidor. Contacte al administrador.'
    ]);
    exit;
}

// ============================================================================
// 1. PARSEO DE ENTRADA
// ============================================================================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Cuerpo JSON inválido. Se requiere {"image": "base64...", "page_num": 1}'
    ]);
    exit;
}

$base64Image = $input['image'];
$pageNum = (int)($input['page_num'] ?? 1);

// Validar que es base64 válido (puede venir con o sin data URI prefix)
if (str_contains($base64Image, ',')) {
    // Tiene data URI prefix: "data:image/png;base64,xxxx"
    $parts = explode(',', $base64Image, 2);
    $base64Image = $parts[1] ?? '';
}

$base64Image = trim($base64Image);
if (empty($base64Image) || base64_decode($base64Image, true) === false) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Imagen base64 inválida o corrupta.']);
    exit;
}

// ============================================================================
// 2. PROMPT PARA GEMINI FLASH
// ============================================================================
$prompt = <<<'EOT'
Eres un sistema de OCR médico de emergencia. Extrae TODOS los pacientes de esta imagen escaneada de una lista hospitalaria venezolana.

La imagen puede estar borrosa o tener baja calidad. Haz tu mejor esfuerzo para leer cada fila.

Reglas:
- Extrae: nombre completo, cédula (solo dígitos), edad, sexo (Masculino/Femenino), procedencia
- Si un campo no se puede leer, déjalo vacío ""
- NO inventes datos. Si no puedes leer algo, déjalo en blanco.
- Ignora filas de encabezado (como "Nombre", "Cédula", "Edad")
- Devuelve ÚNICAMENTE un array JSON válido, sin markdown, sin explicaciones.

Formato de salida:
[
  {
    "nombre": "PEREZ GONZALEZ JUAN CARLOS",
    "cedula": "12345678",
    "edad": 34,
    "sexo": "Masculino",
    "procedencia": "La Guaira"
  }
]
EOT;

// ============================================================================
// 3. LLAMADA A OPENROUTER
// ============================================================================
$payload = json_encode([
    'model' => 'google/gemini-2.5-flash-lite',
    'messages' => [
        [
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => $prompt],
                [
                    'type' => 'image_url',
                    'image_url' => [
                        'url' => 'data:image/png;base64,' . $base64Image
                    ]
                ]
            ]
        ]
    ],
    'max_tokens' => 16384,
    'temperature' => 0.1
]);

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENROUTER_API_KEY,
        'HTTP-Referer: https://cuidartevzla.freedev.app',
        'X-Title: CuidarteVzla OCR Backend'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,          // 60s timeout — Gemini Flash suele responder en <10s
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// ============================================================================
// 4. MANEJO DE ERRORES DE RED
// ============================================================================
if ($response === false || $curlError) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'Error de conexión con OpenRouter: ' . ($curlError ?: 'timeout'),
        'pacientes' => []
    ]);
    exit;
}

if ($httpCode !== 200) {
    // Intentar extraer mensaje de error
    $errorMsg = 'OpenRouter error HTTP ' . $httpCode;
    $errorData = json_decode($response, true);
    if ($errorData && isset($errorData['error']['message'])) {
        $errorMsg = $errorData['error']['message'];
    }
    
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => $errorMsg,
        'pacientes' => []
    ]);
    exit;
}

// ============================================================================
// 5. PARSEO DE RESPUESTA JSON DE OPENROUTER
// ============================================================================
$data = json_decode($response, true);

if (!$data || !isset($data['choices'][0]['message']['content'])) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'OpenRouter devolvió una respuesta vacía o malformada.',
        'pacientes' => []
    ]);
    exit;
}

$content = $data['choices'][0]['message']['content'];

// Extraer JSON de la respuesta (puede venir con markdown ```json ... ```)
$jsonStr = '';
if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $content, $matches)) {
    $jsonStr = trim($matches[1]);
} elseif (preg_match('/(\[[\s\S]*\])/', $content, $matches)) {
    $jsonStr = trim($matches[1]);
} else {
    $jsonStr = trim($content);
}

// Parsear JSON
$rawPatients = json_decode($jsonStr, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    // Segundo intento: buscar un objeto con clave "pacientes"
    $obj = json_decode($jsonStr, true);
    if ($obj && isset($obj['pacientes'])) {
        $rawPatients = $obj['pacientes'];
    }
}

if (!is_array($rawPatients)) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'No se pudo parsear la respuesta del LLM como array JSON.',
        'raw_preview' => mb_substr($content, 0, 200),
        'pacientes' => []
    ]);
    exit;
}

// ============================================================================
// 6. NORMALIZACIÓN Y LIMPIEZA DE DATOS
// ============================================================================
$pacientes = [];

foreach ($rawPatients as $p) {
    $nombre = trim(strval($p['nombre'] ?? $p['nombre_completo'] ?? $p['name'] ?? ''));
    if (empty($nombre) || mb_strlen($nombre) < 3) {
        continue; // Saltar registros sin nombre válido
    }

    // Mapear sexo
    $sexoRaw = mb_strtolower(trim(strval($p['sexo'] ?? $p['sex'] ?? $p['genero'] ?? $p['gender'] ?? '')));
    $mappedSexo = 'Desconocido';
    if (preg_match('/^m(asc)?(ulino)?|h(ombre)?|varon|varón/', $sexoRaw)) {
        $mappedSexo = 'Masculino';
    } elseif (preg_match('/^f(em)?(enino)?|m(ujer)?|hembra/', $sexoRaw)) {
        $mappedSexo = 'Femenino';
    }

    // Limpiar cédula (solo dígitos)
    $cedula = preg_replace('/\D/', '', strval($p['cedula'] ?? $p['ci'] ?? $p['id'] ?? $p['documento'] ?? ''));

    // Edad
    $edadRaw = intval($p['edad'] ?? $p['age'] ?? 0);
    $edad = ($edadRaw > 0 && $edadRaw <= 120) ? $edadRaw : null;

    $procedencia = trim(strval($p['procedencia'] ?? $p['origen'] ?? $p['procedence'] ?? $p['origin'] ?? ''));

    $pacientes[] = [
        'nombre'       => mb_strtoupper($nombre), // Normalizado para matching
        'cedula'       => $cedula ?: null,
        'edad'         => $edad,
        'sexo'         => $mappedSexo,
        'procedencia'  => $procedencia ?: null,
        'confianza_ocr'=> 85 // Gemini Flash tiene buena precisión
    ];
}

// ============================================================================
// 7. RESPUESTA EXITOSA
// ============================================================================
echo json_encode([
    'ok'        => true,
    'pacientes' => $pacientes,
    'página'    => $pageNum,
    'total'     => count($pacientes)
], JSON_UNESCAPED_UNICODE);
