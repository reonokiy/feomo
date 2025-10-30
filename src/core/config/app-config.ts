export interface AppConfig {
  instanceUrl: string;
  clientId?: string;
  clientSecret?: string;
  appName: string;
  appWebsite: string;
  scopes: string[];
  redirectUri: string;
}

export interface AppConfigInput {
  instanceUrl?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  appName?: string | null;
  appWebsite?: string | null;
  scopes?: string | string[] | null;
  /**
   * Absolute redirect URI. If omitted, a defaultRedirectPath combined with origin should be provided.
   */
  redirectUri?: string | null;
  /**
   * Application origin (e.g. https://example.com).
   */
  origin: string;
  /**
   * Default redirect path (e.g. /auth/callback) used when redirectUri is not provided.
   */
  defaultRedirectPath?: string;
}

const DEFAULT_SCOPES = ["read", "write", "follow"];

function normalizeInstanceUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") {
    // For mobile apps, return a placeholder URL that will be configured by user
    // This allows the app to start without crashing
    return "https://placeholder.invalid";
  }

  let normalized = url.trim();

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");

  // Ensure protocol prefix
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

function normalizeScopes(scopes: string | string[] | null | undefined): string[] {
  if (!scopes) {
    return DEFAULT_SCOPES;
  }

  if (Array.isArray(scopes)) {
    return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
  }

  const parts = scopes
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : DEFAULT_SCOPES;
}

function resolveRedirectUri(input: AppConfigInput): string {
  if (input.redirectUri && input.redirectUri.trim() !== "") {
    return input.redirectUri.trim();
  }

  if (!input.defaultRedirectPath) {
    throw new Error("Redirect URI is missing and no default redirect path provided.");
  }

  if (!input.origin) {
    throw new Error("Application origin is required to compute redirect URI.");
  }

  const base = input.origin.endsWith("/") ? input.origin.slice(0, -1) : input.origin;
  const path = input.defaultRedirectPath.startsWith("/") ? input.defaultRedirectPath : `/${input.defaultRedirectPath}`;
  return `${base}${path}`;
}

export function buildAppConfig(input: AppConfigInput): AppConfig {
  const instanceUrl = normalizeInstanceUrl(input.instanceUrl);
  const scopes = normalizeScopes(input.scopes);
  const redirectUri = resolveRedirectUri(input);

  return {
    instanceUrl,
    clientId: input.clientId ?? undefined,
    clientSecret: input.clientSecret ?? undefined,
    appName: input.appName?.trim() || "Memos for GoToSocial",
    appWebsite: (input.appWebsite && input.appWebsite.trim()) || input.origin || instanceUrl,
    scopes,
    redirectUri,
  };
}
