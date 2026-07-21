<?php
header('Content-Type: application/json');
$out = ['status' => 'ok', 'app' => 'php-health-skeleton', 'php' => PHP_VERSION];

// DB check only if creds are injected (Task 4 wires them from Secrets Manager).
if (getenv('DB_HOST')) {
    $mysqli = @mysqli_connect(
        getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASS'),
        getenv('DB_NAME'), (int) (getenv('DB_PORT') ?: 3306)
    );
    $out['db'] = $mysqli ? 'reachable' : 'unreachable';
    if ($mysqli) { mysqli_close($mysqli); }
}
echo json_encode($out);
