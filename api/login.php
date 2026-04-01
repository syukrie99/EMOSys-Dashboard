<?php

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); //405 = method not allowed
    echo json_encode(['error' => 'Method not allowed.' ]);
    exit;
}

$body = file_get_contents('php://input');
$input = json_decode($body, true);

if (!$input || empty($input['email']) || empty($input['password'])) {
    http_response_code(400); //400 = bad request
    echo json_encode(['error' => 'Email and password are required.']);
    exit;
}

$email = trim($input['email']);
$password = $input['password'];

//mock database
$users = [
    [
        'email'    => 'admin@company.com',
        'password' => 'admin123',         
        'name'     => 'Admin',
        'role'     => 'Administrator'
    ],
    [
        'email'    => 'viewer@company.com',
        'password' => 'viewer123',
        'name'     => 'Viewer',
        'role'     => 'Read Only'
    ]
];

$matched = null;
foreach ($users as $u) {
    if ($u['email'] === $email && $u['password'] === $password) {
        $matched = $u;
        break;
    }
}

if (!$matched) {
    http_response_code(401); //401 = Unauthorized
    echo json_encode(['error' => 'Invalid email or password.']);
    exit;
}

$token = bin2hex(random_bytes(32));

echo json_encode([
    'token' => $token,
    'user'  => [
        'name' => $matched['name'],
        'role' => $matched['role']
    ]
]);