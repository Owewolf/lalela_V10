<?php
declare(strict_types=1);

ob_start();
set_error_handler(function (int $errno, string $errstr) {
    ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => "Server error: {$errstr}"]);
    exit;
});

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$configPath = '/home/hbktethg/private/mail/mail_config.php';
if (!file_exists($configPath)) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Mail config not found. Check server setup.']);
    exit;
}

$config = require $configPath;

if (!file_exists($config['vendor_autoload'] ?? '')) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => 'PHPMailer autoload not found. Check server setup.']);
    exit;
}

require $config['vendor_autoload'];

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);

$to = isset($payload['to']) ? trim((string) $payload['to']) : '';
$inviteUrl = isset($payload['inviteUrl']) ? trim((string) $payload['inviteUrl']) : '';
$communityName = isset($payload['communityName']) ? trim((string) $payload['communityName']) : 'your community';
$senderName = isset($payload['senderName']) ? trim((string) $payload['senderName']) : 'A Lalela community admin';

if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid recipient email is required.']);
    exit;
}

if ($inviteUrl === '' || !filter_var($inviteUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invite URL is required.']);
    exit;
}

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['smtp_host'];
    $mail->Port = (int) $config['smtp_port'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['smtp_user'];
    $mail->Password = $config['smtp_password'];

    if (!empty($config['smtp_secure'])) {
        $mail->SMTPSecure = $config['smtp_secure'];
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['smtp_from'], 'Lalela');
    $mail->addReplyTo($config['smtp_from'], 'Lalela');
    $mail->addAddress($to);

    $safeCommunityName = htmlspecialchars($communityName, ENT_QUOTES, 'UTF-8');
    $safeSenderName = htmlspecialchars($senderName, ENT_QUOTES, 'UTF-8');
    $safeInviteUrl = htmlspecialchars($inviteUrl, ENT_QUOTES, 'UTF-8');

    $mail->isHTML(true);
    $mail->Subject = "Join {$communityName} on Lalela";
    $mail->Body = "
        <div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #1a1c1a;\">
          <h2 style=\"color: #0d3d47; margin-bottom: 12px;\">You're invited to join {$safeCommunityName}</h2>
          <p>{$safeSenderName} invited you to join <strong>{$safeCommunityName}</strong> on Lalela.</p>
          <p style=\"margin: 24px 0;\">
            <a href=\"{$safeInviteUrl}\" style=\"background: #0d3d47; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; display: inline-block; font-weight: 700;\">Open Invite Link</a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href=\"{$safeInviteUrl}\">{$safeInviteUrl}</a></p>
          <p style=\"color: #737971; font-size: 12px; margin-top: 24px;\">This invite link may expire, so use it soon.</p>
        </div>
    ";
    $mail->AltBody =
        "{$senderName} invited you to join {$communityName} on Lalela.\n\n" .
        "Use this link to join:\n{$inviteUrl}\n\n" .
        'This invite link may expire, so use it soon.';

    $mail->send();

    ob_end_clean();
    echo json_encode(['message' => "Invite email sent to {$to}."]);
} catch (Exception $error) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email: ' . $error->getMessage()]);
}