<?php
header('Content-Type: application/json');
$ch = curl_init('http://httpbin.org/ip');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
if ($response === false) {
    echo json_encode(['ok'=>false, 'error'=>curl_error($ch)]);
} else {
    echo json_encode(['ok'=>true, 'ip'=>$response]);
}
?>