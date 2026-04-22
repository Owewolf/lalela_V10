import { Router } from "express";
import nodemailer from "nodemailer";
import {
  getPublicCommunities,
} from "./db.js";

const router = Router();

const inviteEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createGoogleSmtpTransport = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || `${port === 465}`).toLowerCase() === 'true';
  const user = process.env.SMTP_USER || process.env.GOOGLE_SMTP_USER || process.env.GMAIL_SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.GOOGLE_SMTP_APP_PASSWORD || process.env.GMAIL_SMTP_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

// --- Health Check ---
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- User & Account Routes ---
router.get("/users/me", (req, res) => {
  res.json({ 
    id: "me", 
    name: "Current User", 
    email: "user@example.com",
    phone: "+1234567890",
    profile_image: "https://picsum.photos/seed/me/200/200",
    license_status: "LICENSED",
    two_factor_enabled: true,
    two_factor_method: "App",
    login_alerts_enabled: true,
    security_score: "High"
  });
});

router.put("/users/me", (req, res) => {
  res.json({ message: "Profile updated", data: req.body });
});

// --- Security & Authentication ---
router.post("/users/me/password", (req, res) => {
  // Logic for password change (verify old, set new)
  res.json({ message: "Password changed successfully" });
});

router.get("/users/me/security/2fa", (req, res) => {
  res.json({ 
    enabled: true, 
    method: "App",
    backup_codes_remaining: 8
  });
});

router.put("/users/me/security/2fa", (req, res) => {
  res.json({ message: "2FA settings updated", enabled: req.body.enabled });
});

router.post("/users/me/security/2fa/setup", (req, res) => {
  // Generate QR code / Secret for 2FA setup
  res.json({ 
    secret: "LALELA-2FA-SECRET-2026", 
    qr_code: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Lalela:user@example.com?secret=LALELA2FASECRET2026&issuer=Lalela" 
  });
});

router.post("/users/me/security/2fa/verify", (req, res) => {
  // Verify 2FA code during setup or login
  res.json({ verified: true });
});

// --- Session Management ---
router.get("/users/me/sessions", (req, res) => {
  res.json([
    { 
      id: "sess_1", 
      device: "Chrome on MacOS", 
      ip: "192.168.1.1", 
      location: "San Francisco, CA",
      last_active: new Date().toISOString(),
      is_current: true 
    },
    { 
      id: "sess_2", 
      device: "Safari on iPhone", 
      ip: "172.16.0.5", 
      location: "Oakland, CA",
      last_active: "2026-04-03T10:00:00Z",
      is_current: false 
    }
  ]);
});

router.delete("/users/me/sessions/:id", (req, res) => {
  res.json({ message: `Session ${req.params.id} revoked` });
});

router.delete("/users/me/sessions", (req, res) => {
  res.json({ message: "All other sessions revoked" });
});

// --- Security Audit Logs ---
router.get("/users/me/security/logs", (req, res) => {
  res.json([
    { 
      id: "log_1", 
      type: "login", 
      message: "Successful login from Chrome on MacOS", 
      timestamp: new Date().toISOString(),
      ip: "192.168.1.1",
      status: "success"
    },
    { 
      id: "log_2", 
      type: "2fa_toggle", 
      message: "Two-factor authentication enabled", 
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ip: "192.168.1.1",
      status: "success"
    },
    { 
      id: "log_3", 
      type: "password_change", 
      message: "Password changed successfully", 
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      ip: "192.168.1.1",
      status: "success"
    }
  ]);
});

// --- Mock Stripe Integration Webhooks ---
  router.post("/stripe/webhook-mock", (req, res) => {
    const { type, targetId } = req.body;
    // In a real Stripe webhook, this endpoint would:
    // 1. Verify Stripe signature
    // 2. Parse checkout.session.completed
    // 3. Extract type and targetId from session metadata
    // 4. Update the user/community documents in Firestore securely
    
    console.log(`[Stripe Mock] Webhook received for ${type} ${targetId ? `(target: ${targetId})` : ''}`);
    
    res.json({ 
      message: "Webhook processed successfully", 
      status: "LICENSED" 
    });
});

// --- Community Routes ---
router.get("/communities", (req, res) => {
  res.json([]);
});

router.get("/communities/:id", (req, res) => {
  res.json({ id: req.params.id, name: "Community Name" });
});

router.post("/communities", (req, res) => {
  res.status(201).json({ id: "new-id", ...req.body });
});

router.post("/invitations/email", async (req, res) => {
  const { to, inviteUrl, communityName, senderName } = req.body as {
    to?: string;
    inviteUrl?: string;
    communityName?: string;
    senderName?: string;
  };

  if (!to || !inviteEmailRegex.test(to)) {
    return res.status(400).json({ error: "A valid recipient email is required." });
  }

  if (!inviteUrl || typeof inviteUrl !== 'string') {
    return res.status(400).json({ error: "Invite URL is required." });
  }

  const transporter = createGoogleSmtpTransport();
  if (!transporter) {
    return res.status(503).json({
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, and SMTP_PASSWORD on the server.",
    });
  }

  const safeCommunityName = communityName || 'your community';
  const safeSenderName = senderName || 'A Lalela community admin';
  const from = process.env.SMTP_FROM || process.env.GOOGLE_SMTP_FROM || process.env.SMTP_USER || process.env.GOOGLE_SMTP_USER || process.env.GMAIL_SMTP_USER;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Join ${safeCommunityName} on Lalela`,
      replyTo: from,
      text: `${safeSenderName} invited you to join ${safeCommunityName} on Lalela.\n\nUse this link to join:\n${inviteUrl}\n\nThis invite link may expire, so use it soon.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1c1a;">
          <h2 style="color: #0d3d47; margin-bottom: 12px;">You're invited to join ${safeCommunityName}</h2>
          <p>${safeSenderName} invited you to join <strong>${safeCommunityName}</strong> on Lalela.</p>
          <p style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background: #0d3d47; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; display: inline-block; font-weight: 700;">Open Invite Link</a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p style="color: #737971; font-size: 12px; margin-top: 24px;">This invite link may expire, so use it soon.</p>
        </div>
      `,
    });

    return res.json({ message: `Invite email sent to ${to}.` });
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return res.status(500).json({ error: "Failed to send invite email." });
  }
});

// --- Post Routes ---
router.get("/communities/:communityId/posts", (req, res) => {
  res.json([]);
});

router.post("/communities/:communityId/posts", (req, res) => {
  res.status(201).json({ id: "new-post-id", ...req.body });
});

router.put("/communities/:communityId/posts/:postId", (req, res) => {
  res.json({ message: "Post updated" });
});

router.delete("/communities/:communityId/posts/:postId", (req, res) => {
  res.json({ message: "Post deleted" });
});

// --- Charity Routes ---
router.get("/communities/:communityId/charities", (req, res) => {
  res.json([]);
});

// --- Business Routes ---
router.get("/businesses", (req, res) => {
  res.json([]);
});

// --- OG Image Extraction ---
router.get("/og-image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ imageUrl: null, error: "Missing url parameter" });
  }

  // Validate URL: only allow http/https schemes
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ imageUrl: null, error: "Invalid URL" });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ imageUrl: null, error: "Only http/https URLs are allowed" });
  }

  // Block private/internal IPs to prevent SSRF
  const hostname = parsedUrl.hostname;
  if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|localhost|::1|\[::1\])/.test(hostname)) {
    return res.status(400).json({ imageUrl: null, error: "Internal URLs are not allowed" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Lalela-Bot/1.0 (OG Image Fetcher)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({ imageUrl: null });
    }

    const html = await response.text();

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch?.[1]) {
      const imageUrl = new URL(ogMatch[1], url).href;
      return res.json({ imageUrl });
    }

    // Fallback: apple-touch-icon
    const touchMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (touchMatch?.[1]) {
      const imageUrl = new URL(touchMatch[1], url).href;
      return res.json({ imageUrl });
    }

    // Fallback: favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch?.[1]) {
      const imageUrl = new URL(faviconMatch[1], url).href;
      return res.json({ imageUrl });
    }

    res.json({ imageUrl: null });
  } catch {
    res.json({ imageUrl: null });
  }
});

// --- Moderation & Reports ---
router.post("/reports", (req, res) => {
  res.status(201).json({ message: "Report submitted" });
});

router.get("/admin/reports", (req, res) => {
  res.json([]);
});

// --- Public API (no auth required) ---

router.get("/public/communities", async (_req, res) => {
  try {
    const communities = await getPublicCommunities();
    res.json(communities);
  } catch (error) {
    console.error("Error fetching public communities:", error);
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

export default router;
