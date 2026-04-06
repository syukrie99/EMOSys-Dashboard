<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('
        SELECT
            s.id,
            s.name,
            s.ip,
            s.firmware,
            r.temperature,
            r.humidity,
            r.aqi,
            r.co2,
            r.voc,
            r.recorded_at
        FROM sensors s
        LEFT JOIN readings r ON r.id = (
            SELECT id from readings
            WHERE sensors_id = s.id
            ORDER BY recorded_at DESC
            LIMIT 1
            )
            ORDER BY s.id ASC
    ');

    $sensors = $stmt->fetchAll();

    $stmt2 = $pdo->prepare('
        SELECT temperature, humidity, aqi, co2, voc, recorded_at
        FROM readings
        WHERE sensor_id = 1
        AND recorded_at >= NOW() - INTERVAL 24 HOUR
        ORDER BY recorded_at ASC
    ');
    $stmt2->execute();
    $history = $stmt2->fetchAll();

    echo json_encode([
        'sensors' => $sensors,
        'history' => $history
    ]);
    exit;
}

if ($SERVER['REQUEST_METHOD'] === 'POST') {

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['sensor_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'sensor_id is required.']);
        exit;
    }

    $stmt = $pdo->prepare('
        INSERT INTO readings (sensor_id, temperature, humidity, aqi, co2, voc)
        VALUES (?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $input['sensor_id'],
        $input['temperature'] ?? null,
        $input['humidity'] ?? null,
        $input['aqi'] ?? null,
        $input['co2'] ?? null,
        $input['voc'] ?? null
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => ;'Method not allowed.']);