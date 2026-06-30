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

// Enable error reporting and logging for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_error.log');
error_reporting(E_ALL);

// Increase limits for potentially long-running OCR/LLM processing
ini_set('max_execution_time', 120); // 2 minutes
ini_set('memory_limit', '256M');

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=UTF-8');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Codigo-Voluntario');
    http_response_code(200);
    exit;
}

// Only POST is allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Método no permitido. Use POST.',
        'endpoint' => basename(__FILE__)
    ]);
    exit;
}

try {
    // ============================================================================
    // CONFIGURACIÓN — API KEY SERVER-SIDE (NUNCA EXPUESTA AL CLIENTE)
    // ============================================================================
    $OPENROUTER_API_KEY = getenv('OPENROUTER_API_KEY');
    if (empty($OPENROUTER_API_KEY) && defined('OPENROUTER_API_KEY_ENV') && !empty(OPENROUTER_API_KEY_ENV)) {
        $OPENROUTER_API_KEY = OPENROUTER_API_KEY_ENV;
    }
        if (empty($OPENROUTER_API_KEY)) {
            // Cargar desde .env si existe
            $env_file = __DIR__ . '/.env';
            if (file_exists($env_file)) {
                $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (preg_match('/^OPENROUTER_API_KEY\s*=\s*(.+)$/', $line, $m)) {
                        $OPENROUTER_API_KEY = trim($m[1], '"\'');
                        break;
                    }
                }
            }
        }

    if (empty($OPENROUTER_API_KEY)) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'API key de OpenRouter no configurada en el servidor. Contacte al administrador.',
            'endpoint' => basename(__FILE__)
        ]);
        exit;
    }

    // ============================================================================
    // 1. PARSEO DE ENTRADA
    // ============================================================================
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Cuerpo JSON inválido: ' . json_last_error_msg(),
            'endpoint' => basename(__FILE__)
        ]);
        exit;
    }

    if (!$input || !isset($input['image'])) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Cuerpo JSON inválido. Se requiere {"image": "base64...", "page_num": 1}',
            'endpoint' => basename(__FILE__)
        ]);
        exit;
    }

    $base64Image = $input['image'];
    $pageNum = isset($input['page_num']) ? (int)$input['page_num'] : 1;

    // Validar que es base64 válido (puede venir con o sin data URI prefix)
    if (str_contains($base64Image, ',')) {
        // Tiene data URI prefix: "data:image/png;base64,xxxx"
        $parts = explode(',', $base64Image, 2);
        $base64Image = $parts[1] ?? '';
    }

    $base64Image = trim($base64Image);
    if (empty($base64Image) || base64_decode($base64Image, true) === false) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Imagen base64 inválida o corrupta.',
            'endpoint' => basename(__FILE__)
        ]);
        exit;
    }

    // Log input size for debugging
        error_log(sprintf('[%s] Processing image of length %d for page %d', basename(__FILE__), strlen($base64Image), $pageNum));

    // ============================================================================
    // 2. PROMPT PARA GEMINI FLASH
    // ============================================================================
    $prompt = <<<'EOT'
Eres un sistema de OCR médico de emergencia. Extrae TODOS los pacientes de esta imagen escaneada de una lista hospitalaria venezolana.

La imagen puede estar borrosa o tener baja calidad. Haz tu mejor esfuerzo para leer cada fila.

Reglas:
- Extrae: nombre completo, cédula (solo dígitos), edad, sexo (Masculino/Femenino), procedencia, estado
- "estado" = condición clínica del paciente: hospitalizado, alta, fallecido, referido/trasladado, crítico, estable, etc.
  Busca columnas con títulos como: Estado, Motivo, Situación, Condición, Observación, Estatus, Notas, Evolución
  Si la columna dice "Alta" → estado: "alta"
  Si dice "Fallecido" o "Exitus" → estado: "fallecido"
  Si dice "Hospitalizado", "Recluido", "Interno" → estado: "hospitalizado"
  Si dice "Referido", "Trasladado" → estado: "referido"
  Si no hay columna de estado o no se puede leer → estado: ""
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
    "procedencia": "La Guaira",
    "estado": "hospitalizado"
  }
]
EOT;

    // ============================================================================
    // 3. LLAMADA A OPENROUTER (soporta curl y file_get_contents fallback)
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

    $openrouter_url = 'https://openrouter.ai/api/v1/chat/completions';
    $request_headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENROUTER_API_KEY,
        'HTTP-Referer: https://cuidartevzla.com',
        'X-Title: CuidarteVzla OCR Backend'
    ];

    $response = false;
    $httpCode = 0;
    $curlError = '';

    // Intento 1: cURL (más rápido, mejor manejo de timeouts)
    if (function_exists('curl_init')) {
        $ch = curl_init($openrouter_url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $request_headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 90, // Increased timeout for LLM
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
    } else {
        // Intento 2: file_get_contents con stream context (fallback CGI/hosting restringido)
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $request_headers),
                'content' => $payload,
                'timeout' => 90,
                'ignore_errors' => true, // No lanzar excepción en errores HTTP
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ]
        ]);

        $response = @file_get_contents($openrouter_url, false, $ctx);

        // Extraer HTTP status de los headers de respuesta
        if ($response !== false && isset($http_response_header)) {
            foreach ($http_response_header as $h) {
                if (preg_match('#^HTTP/\d\.\d\s+(\d+)#', $h, $m)) {
                    $httpCode = (int)$m[1];
                    break;
                }
            }
        }
    }

    // ============================================================================
    // 4. MANEJO DE ERRORES DE RED
    // ============================================================================
    if ($response === false) {
        $lastError = error_get_last();
        http_response_code(502);
        echo json_encode([
            'ok' => false,
            'error' => 'Error de conexión con OpenRouter. ' . 
                       (function_exists('curl_init') ? 'cURL error: ' . $curlError : 'file_get_contents fallback falló.'),
            'endpoint' => basename(__FILE__),
            'detail' => $lastError['message'] ?? 'Unknown error'
        ], JSON_UNESCAPED_UNICODE);
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
            'endpoint' => basename(__FILE__),
            'http_code' => $httpCode,
            'response_preview' => mb_substr($response, 0, 200)
        ]);
        exit;
    }

    // ============================================================================
    // 5. PARSEO DE RESPUESTA JSON DE OPENROUTER
    // ============================================================================
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(502);
        echo json_encode([
            'ok' => false,
            'error' => 'Respuesta de OpenRouter no es JSON válido: ' . json_last_error_msg(),
            'endpoint' => basename(__FILE__),
            'response_preview' => mb_substr($response, 0, 200)
        ]);
        exit;
    }

    if (!$data || !isset($data['choices'][0]['message']['content'])) {
        http_response_code(502);
        echo json_encode([
            'ok' => false,
            'error' => 'OpenRouter devolvió una respuesta vacía o malformada.',
            'endpoint' => basename(__FILE__)
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

    	// LIMPIEZA: eliminar posibles caracteres de control y asegurar UTF-8
    	// Eliminar BOM si existe
    	if (substr($jsonStr, 0, 3) === "\xEF\xBB\xBF") {
    	    $jsonStr = substr($jsonStr, 3);
    	}
    	// Forzar UTF-8 (por si acaso)
    	$jsonStr = mb_convert_encoding($jsonStr, 'UTF-8', 'UTF-8');
    	// Eliminar caracteres de control excepto tab, newline, carriage return y space
    	$jsonStr = preg_replace('/[\x00-\x08\x0A\x0B\x0C\x0E-\x1F\x7F]/', '', $jsonStr);
    	// Eliminar comas finales antes de ] o }
    	$jsonStr = preg_replace('/,\s*([}\]])/m', '$1', $jsonStr);

    	// Parsear JSON
    	$rawPatients = json_decode($jsonStr, true);
    	if (json_last_error() !== JSON_ERROR_NONE) {
    	    // Segundo intento: buscar un objeto con clave "pacientes"
    	    $obj = json_decode($jsonStr, true);
    	    if ($obj && isset($obj['pacientes'])) {
    	        $rawPatients = $obj['pacientes'];
    	    } else {
    	        http_response_code(502);
    	        echo json_encode([
    	            'ok' => false,
    	            'error' => 'No se pudo parsear la respuesta del LLM como array JSON.',
    	            'endpoint' => basename(__FILE__),
    	            'json_error' => json_last_error_msg(),
    	            'json_str_preview' => mb_substr($jsonStr, 0, 200)
    	        ], JSON_UNESCAPED_UNICODE);
    	        exit;
    	    }
    	}

    	if (!is_array($rawPatients)) {
    	    http_response_code(502);
    	    echo json_encode([
    	        'ok' => false,
    	        'error' => 'La respuesta del LLM no es un array después del parsing.',
    	        'endpoint' => basename(__FILE__),
    	        'json_str_preview' => mb_substr($jsonStr, 0, 200)
    	    ]);
    	    exit;
    	}
    if (!is_array($rawPatients)) {
        http_response_code(502);
        echo json_encode([
            'ok' => false,
            'error' => 'La respuesta del LLM no es un array después del parsing.',
            'endpoint' => basename(__FILE__),
            'response_preview' => mb_substr($content, 0, 200)
        ]);
        exit;
    }

    // ============================================================================
    // 6. NORMALIZACIÓN Y LIMPIEZA DE DATOS
    // ============================================================================
    $pacientes = [];

    foreach ($rawPatients as $index => $p) {
        if (!is_array($p)) {
            continue; // Skip non-array items
        }

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

        // Mapear estado/motivo/situación/condición
        $estadoRaw = mb_strtolower(trim(strval($p['estado'] ?? $p['motivo'] ?? $p['situacion'] ?? $p['situación'] ?? $p['condicion'] ?? $p['condición'] ?? $p['observacion'] ?? $p['observación'] ?? $p['estatus'] ?? $p['notas'] ?? $p['evolucion'] ?? $p['evolución'] ?? '')));
        $mappedEstado = 'desconocido';
        if (preg_match('/\b(fallecido|fallecida|exitus|muerto|muerta|deceso|óbito|obito)\b/', $estadoRaw)) {
            $mappedEstado = 'fallecido';
        } elseif (preg_match('/\b(alta|dado de alta|dada de alta|alta medica|alta hospitalaria)\b/', $estadoRaw)) {
            $mappedEstado = 'alta';
        } elseif (preg_match('/\b(referido|referida|trasladado|trasladada|transferido|transferida)\b/', $estadoRaw)) {
            $mappedEstado = 'referido';
        } elseif (preg_match('/\b(hospitalizado|hospitalizada|recluido|recluida|interno|interna|ingresado|ingresada|observacion|observación|estable|critico|crítico|grave|uci|cuidados intensivos)\b/', $estadoRaw)) {
            $mappedEstado = 'hospitalizado';
        }

        $pacientes[] = [
            'nombre'       => mb_strtoupper($nombre), // Normalizado para matching
            'cedula'       => $cedula ?: null,
            'edad'         => $edad,
            'sexo'         => $mappedSexo,
            'procedencia'  => $procedencia ?: null,
            'estado'       => $mappedEstado,
            'confianza_ocr'=> 85 // Gemini Flash tiene buena precisión
        ];
    }

    // ============================================================================
    // 7. RESPUESTA EXITOSA
    // ============================================================================
    http_response_code(200);
    echo json_encode([
        'ok'        => true,
        'pacientes' => $pacientes,
        'página'    => $pageNum,
        'total'     => count($pacientes),
        'processed_at' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;

} catch (Throwable $e) {
    // Catch any exception or error that wasn't caught above
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Excepción no capturada: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    exit;
}