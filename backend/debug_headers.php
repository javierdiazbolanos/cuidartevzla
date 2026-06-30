<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
cors_and_json();

$out = [];

// 1. Raw headers
$out['getallheaders_exists'] = function_exists('getallheaders');
$out['apache_request_headers_exists'] = function_exists('apache_request_headers');

if (function_exists('getallheaders')) {
    $out['all_headers'] = getallheaders();
}

// 2. $_SERVER relevant keys
$out['SERVER_HTTP_X_CODIGO_VOLUNTARIO'] = $_SERVER['HTTP_X_CODIGO_VOLUNTARIO'] ?? 'NOT_SET';
$out['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'] ?? 'NOT_SET';

// 3. get_volunteer_code_from_request result
$code = get_volunteer_code_from_request();
$out['extracted_code'] = $code;
$out['extracted_code_len'] = strlen($code);
$out['extracted_code_hex'] = bin2hex($code);

// 4. SUPER_USER_CODES
$out['SUPER_USER_CODES'] = SUPER_USER_CODES;
$out['isSuperUser_result'] = isSuperUser($code);

// 5. CODIGOS_VOLUNTARIOS_PERMITIDOS
$out['CODIGOS_VOLUNTARIOS_PERMITIDOS'] = CODIGOS_VOLUNTARIOS_PERMITIDOS;
$permitidos = array_map('trim', explode(',', CODIGOS_VOLUNTARIOS_PERMITIDOS));
$out['code_in_permitidos'] = in_array($code, $permitidos, true);

echo json_encode(['ok' => true, 'diagnostico' => $out], JSON_UNESCAPED_UNICODE);
