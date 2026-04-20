import { UserProfile, UserSession, TwoFASetupResponse, LicensingInfo } from "../types";

const API_BASE = "/api";

/**
 * Account Service
 * Handles all API calls related to user account, security, sessions, and licensing.
 */
export const accountService = {
  // --- Profile Management ---
  
  async getProfile(): Promise<UserProfile> {
    const response = await fetch(`${API_BASE}/users/me`);
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  async updateProfile(data: Partial<UserProfile>): Promise<{ message: string; data: any }> {
    const response = await fetch(`${API_BASE}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update profile");
    return response.json();
  },

  // --- Security & Password ---

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/users/me/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (!response.ok) throw new Error("Failed to change password");
    return response.json();
  },

  // --- Two-Factor Authentication (2FA) ---

  async get2FAStatus(): Promise<{ enabled: boolean; method: string; backup_codes_remaining: number }> {
    const response = await fetch(`${API_BASE}/users/me/security/2fa`);
    if (!response.ok) throw new Error("Failed to fetch 2FA status");
    return response.json();
  },

  async update2FAStatus(enabled: boolean): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/users/me/security/2fa`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error("Failed to update 2FA status");
    return response.json();
  },

  async setup2FA(): Promise<TwoFASetupResponse> {
    const response = await fetch(`${API_BASE}/users/me/security/2fa/setup`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to setup 2FA");
    return response.json();
  },

  async verify2FA(code: string): Promise<{ verified: boolean }> {
    const response = await fetch(`${API_BASE}/users/me/security/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error("Failed to verify 2FA code");
    return response.json();
  },

  // --- Session Management ---

  async getSessions(): Promise<UserSession[]> {
    const response = await fetch(`${API_BASE}/users/me/sessions`);
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/users/me/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to revoke session");
    return response.json();
  },

  async revokeAllOtherSessions(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/users/me/sessions`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to revoke other sessions");
    return response.json();
  },

  // --- Security Audit Logs ---

  async getAuditLogs(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/users/me/security/logs`);
    if (!response.ok) throw new Error("Failed to fetch audit logs");
    return response.json();
  },

  // --- Licensing ---

  async getLicensingInfo(): Promise<LicensingInfo> {
    const response = await fetch(`${API_BASE}/users/me/licensing`);
    if (!response.ok) throw new Error("Failed to fetch licensing info");
    return response.json();
  },

  async activateLicense(licenseKey: string): Promise<{ message: string; status: string }> {
    const response = await fetch(`${API_BASE}/users/me/licensing/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });
    if (!response.ok) throw new Error("Failed to activate license");
    return response.json();
  },
};
