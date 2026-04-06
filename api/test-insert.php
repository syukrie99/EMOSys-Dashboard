<?php
require_once __DIR__ . '/db.php';

$pdo = getDB();
$stmt = $pdo->prepare('
    INSERT INTO readings (sensor_id, temperature, humidity, aqi, co2, voc)
    VALUES (?, ?, ?, ?, ?, ?)
');

$stmt->execute([
    1,
    round(22 + (rand(-30, 30) / 10), 1),
    round(55 + (rand(-100, 100) / 10), 1),
    rand(20, 80),
    rand(800, 1200),
    rand(100, 250)
]);
echo 'Reading inserted. <a href="../Dashboard.html">Go to dashboard</a>';
