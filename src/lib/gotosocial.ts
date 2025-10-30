/**
 * GoToSocial API Client
 *
 * This module provides a wrapper around the masto.js library for interacting
 * with GoToSocial (which implements the Mastodon API).
 */
import { createOAuthAPIClient, createRestAPIClient } from "masto";
import type { mastodon } from "masto";
import { config } from "@/config";

// Storage keys for persisting auth state
const STORAGE_KEYS = {
  ACCESS_TOKEN: "gts_access_token",
  CLIENT_ID: "gts_client_id",
  CLIENT_SECRET: "gts_client_secret",
  CURRENT_ACCOUNT: "gts_current_account",
} as const;

/**
 * OAuth application credentials
 */
interface OAuthApp {
  clientId: string;
  clientSecret: string;
  vapidKey?: string;
}

/**
 * Stored authentication state
 */
interface AuthState {
  accessToken: string;
  account: mastodon.v1.AccountCredentials;
}

/**
 * GoToSocial API Client
 */
class GoToSocialClient {
  private client: mastodon.rest.Client | null = null;
  private authState: AuthState | null = null;

  constructor() {
    // Try to restore auth state from localStorage
    this.restoreAuthState();
  }

  /**
   * Get the masto.js client instance
   */
  getClient(): mastodon.rest.Client {
    if (!this.client) {
      throw new Error("Not authenticated. Please login first.");
    }
    return this.client;
  }

  /**
   * Get an unauthenticated REST client (read-only operations)
   */
  getPublicClient(): mastodon.rest.Client {
    return createRestAPIClient({
      url: config.instanceUrl,
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.client !== null && this.authState !== null;
  }

  /**
   * Get current account information
   */
  getCurrentAccount(): mastodon.v1.AccountCredentials | null {
    return this.authState?.account || null;
  }

  /**
   * Register OAuth application with GoToSocial
   */
  async registerApp(): Promise<OAuthApp> {
    // Check if we already have registered credentials
    const savedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    const savedClientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET);

    if (savedClientId && savedClientSecret) {
      return {
        clientId: savedClientId,
        clientSecret: savedClientSecret,
      };
    }

    // Use config credentials if provided
    if (config.clientId && config.clientSecret) {
      // Save to localStorage for future use
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, config.clientId);
      localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, config.clientSecret);

      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
    }

    // Register new application
    const client = createRestAPIClient({
      url: config.instanceUrl,
    });

    const app = await client.v1.apps.create({
      clientName: config.appName,
      redirectUris: config.redirectUri,
      scopes: config.scopes.join(" "),
      website: config.appWebsite,
    });

    if (!app.clientId || !app.clientSecret) {
      throw new Error("Failed to register OAuth application – missing client credentials from GoToSocial instance");
    }

    // Save credentials
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, app.clientId);
    localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, app.clientSecret);

    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      vapidKey: app.vapidKey ?? undefined,
    };
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthorizationUrl(): Promise<string> {
    const app = await this.registerApp();

    const params = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
    });

    return `${config.instanceUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    const app = await this.registerApp();

    // Create OAuth client for token exchange
    const oauthClient = createOAuthAPIClient({
      url: config.instanceUrl,
    });

    // Exchange code for token
    const tokenResponse = await oauthClient.token.create({
      grantType: "authorization_code",
      code,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: config.redirectUri,
      scope: config.scopes.join(" "),
    });

    // Create authenticated client
    await this.initializeWithToken(tokenResponse.accessToken);
  }

  /**
   * Initialize client with access token
   */
  async initializeWithToken(accessToken: string): Promise<void> {
    // Create authenticated client
    this.client = createRestAPIClient({
      url: config.instanceUrl,
      accessToken,
    });

    // Verify credentials and get current account
    const account = await this.client.v1.accounts.verifyCredentials();

    // Save auth state
    this.authState = {
      accessToken,
      account,
    };

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ACCOUNT, JSON.stringify(account));
  }

  /**
   * Restore authentication state from localStorage
   */
  private restoreAuthState(): void {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const accountJson = localStorage.getItem(STORAGE_KEYS.CURRENT_ACCOUNT);

    if (accessToken && accountJson) {
      try {
        const account = JSON.parse(accountJson) as mastodon.v1.AccountCredentials;

        // Create authenticated client
        this.client = createRestAPIClient({
          url: config.instanceUrl,
          accessToken,
        });

        this.authState = {
          accessToken,
          account,
        };
      } catch (error) {
        console.error("Failed to restore auth state:", error);
        this.clearAuthState();
      }
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ACCOUNT);
    this.client = null;
    this.authState = null;
  }

  /**
   * Logout and clear all stored credentials
   */
  async logout(): Promise<void> {
    if (this.client && this.authState) {
      try {
        const clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
        const clientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET);

        if (clientId && clientSecret) {
          const oauthClient = createOAuthAPIClient({
            url: config.instanceUrl,
          });

          // Revoke token on server
          await oauthClient.revoke({
            clientId,
            clientSecret,
            token: this.authState.accessToken,
          });
        }
      } catch (error) {
        console.error("Failed to revoke token:", error);
      }
    }

    // Clear local state
    this.clearAuthState();
  }

  /**
   * Clear all stored data including app credentials
   * (useful for switching instances)
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
    localStorage.removeItem(STORAGE_KEYS.CLIENT_SECRET);
    this.client = null;
    this.authState = null;
  }
}

// Export singleton instance
export const gtsClient = new GoToSocialClient();

// Export types
export type { OAuthApp, AuthState };
export type { mastodon };
