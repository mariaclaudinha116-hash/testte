<?php
/**
 * gerar-pix.php – Backend PIX via Pixup
 * Substitui a Netlify Function para hospedagem na Hostinger
 */

// ── CORS ──────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}

// ── Credenciais (seguras no servidor) ─────────────────
define('CLIENT_ID',  'Ruanmelo777_6481199570914110');
define('SECRET_KEY', '3cd962fe70f357dc33ae6d03bdf7f37f9a461a8a6146fca1a78a0b68c8cecfb1');
define('BASE_URL',   'https://api.pixupbr.com/v2');

// ── Ler e validar body ────────────────────────────────
$body   = json_decode(file_get_contents('php://input'), true);
$amount = isset($body['amount']) ? floatval($body['amount']) : 0;

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Envie um campo "amount" numérico e positivo.']);
    exit;
}

// ── Função auxiliar: requisição cURL ─────────────────
function curl_request(string $url, string $method, array $headers, $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response   = curl_exec($ch);
    $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError  = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new RuntimeException('Erro de conexão: ' . $curlError);
    }

    return ['code' => $httpCode, 'body' => $response];
}

// ── PASSO 1: Obter Token OAuth ────────────────────────
try {
    $credentials = base64_encode(CLIENT_ID . ':' . SECRET_KEY);

    $tokenResult = curl_request(
        BASE_URL . '/oauth/token',
        'POST',
        [
            'Authorization: Basic ' . $credentials,
            'Content-Type: application/x-www-form-urlencoded',
        ],
        'grant_type=client_credentials'
    );

    if ($tokenResult['code'] !== 200) {
        throw new RuntimeException('Falha na autenticação Pixup (HTTP ' . $tokenResult['code'] . '): ' . $tokenResult['body']);
    }

    $tokenData   = json_decode($tokenResult['body'], true);
    $accessToken = $tokenData['access_token'] ?? null;

    if (!$accessToken) {
        throw new RuntimeException('Token não retornado pela Pixup.');
    }

} catch (RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

// ── PASSO 2: Criar Cobrança PIX QR Code ──────────────
try {
    $pixPayload = json_encode([
        'amount'      => number_format($amount, 2, '.', ''),
        'expiration'  => 1800,
        'description' => 'Livro Interativo Touch & Sound – SETTLE DOWN',
    ]);

    $pixResult = curl_request(
        BASE_URL . '/pix/qrcode',
        'POST',
        [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ],
        $pixPayload
    );

    if ($pixResult['code'] < 200 || $pixResult['code'] >= 300) {
        throw new RuntimeException('Erro Pixup ao criar cobrança (HTTP ' . $pixResult['code'] . '): ' . $pixResult['body']);
    }

    $pixData = json_decode($pixResult['body'], true);

    // Cobrir variações de nome do campo (documentação Pixup)
    $qrcode = $pixData['qrcode']
        ?? $pixData['pix_copy_paste']
        ?? $pixData['pixCopiaECola']
        ?? $pixData['emv']
        ?? null;

    $transactionId = $pixData['transactionId']
        ?? $pixData['transaction_id']
        ?? $pixData['txid']
        ?? $pixData['id']
        ?? null;

    if (!$qrcode) {
        throw new RuntimeException('A Pixup não retornou o código QR. Resposta: ' . $pixResult['body']);
    }

    // ── Sucesso ──────────────────────────────────────
    echo json_encode([
        'qrcode'        => $qrcode,
        'transactionId' => $transactionId,
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
