// Environment configuration for GoToSocial integration

export interface AppConfig {
  // GoToSocial instance URL
  instanceUrl: string;

  // OAuth credentials (optional - will auto-register if not provided)
  clientId?: string;
  clientSecret?: string;

  // App metadata
  appName: string;
  appWebsite: string;

  // OAuth scopes
  scopes: string[];

  // Redirect URI for OAuth callback
  redirectUri: string;
}

// Validate and normalize instance URL
function normalizeInstanceUrl(url: string): string {
  if (!url) {
    throw new Error("VITE_GOTOSOCIAL_INSTANCE_URL is required. Please configure it in .env.local");
  }

  // Remove trailing slash
  url = url.replace(/\/$/, "");

  // Ensure https:// prefix
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url;
}

// Get configuration from environment variables
export const config: AppConfig = {
  instanceUrl: normalizeInstanceUrl(import.meta.env.VITE_GOTOSOCIAL_INSTANCE_URL || ""),
  clientId: import.meta.env.VITE_GOTOSOCIAL_CLIENT_ID,
  clientSecret: import.meta.env.VITE_GOTOSOCIAL_CLIENT_SECRET,
  appName: import.meta.env.VITE_APP_NAME || "Memos for GoToSocial",
  appWebsite: import.meta.env.VITE_APP_WEBSITE || window.location.origin,
  scopes: ["read", "write", "follow"],
  redirectUri: `${window.location.origin}/auth/callback`,
};

// Export individual values for convenience
export const { instanceUrl, clientId, clientSecret, appName, appWebsite, scopes, redirectUri } = config;
