<?php
declare(strict_types=1);

/**
 * Test proxy to verify PHP is working
 */
header('Content-Type: application/json');
echo json_encode(['ok' => true, 'msg' => 'test']);
?>