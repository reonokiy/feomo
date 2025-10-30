/**
 * GoToSocial API Client
 *
 * Platform-agnostic wrapper around masto.js. Relies on injected storage and a
 * configuration provider so it can be reused across web and React Native
 * environments.
 */
import { createOAuthAPIClient, createRestAPIClient } from "masto";
import type { mastodon } from "masto";
import type { AppConfig } from "@/core/config/app-config";
import type { StorageAdapter } from "@/core/platform/environment";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "gts_access_token",
  CLIENT_ID: "gts_client_id",
  CLIENT_SECRET: "gts_client_secret",
  CURRENT_ACCOUNT: "gts_current_account",
} as const;

export interface GoToSocialClientOptions {
  storage: StorageAdapter;
  /**
   * Lazily provides configuration to allow hot swapping (e.g. tenant switch).
   */
  configProvider: () => AppConfig;
}

interface OAuthApp {
  clientId: string;
  clientSecret: string;
  vapidKey?: string;
}

interface AuthState {
  accessToken: string;
  account: mastodon.v1.AccountCredentials;
}

export class GoToSocialClient {
  private client: mastodon.rest.Client | null = null;
  private authState: AuthState | null = null;

  constructor(private readonly options: GoToSocialClientOptions) {
    this.restoreAuthState();
  }

  private get storage(): StorageAdapter {
    return this.options.storage;
  }

  private get config(): AppConfig {
    return this.options.configProvider();
  }

  getClient(): mastodon.rest.Client {
    if (!this.client) {
      throw new Error("Not authenticated. Please login first.");
    }
    return this.client;
  }

  getPublicClient(): mastodon.rest.Client {
    return createRestAPIClient({
      url: this.config.instanceUrl,
    });
  }

  isAuthenticated(): boolean {
    return this.client !== null && this.authState !== null;
  }

  getCurrentAccount(): mastodon.v1.AccountCredentials | null {
    return this.authState?.account || null;
  }

  async registerApp(): Promise<OAuthApp> {
    const savedClientId = this.safeGetItem(STORAGE_KEYS.CLIENT_ID);
    const savedClientSecret = this.safeGetItem(STORAGE_KEYS.CLIENT_SECRET);

    if (savedClientId && savedClientSecret) {
      return {
        clientId: savedClientId,
        clientSecret: savedClientSecret,
      };
    }

    const config = this.config;

    if (config.clientId && config.clientSecret) {
      this.safeSetItem(STORAGE_KEYS.CLIENT_ID, config.clientId);
      this.safeSetItem(STORAGE_KEYS.CLIENT_SECRET, config.clientSecret);

      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
    }

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
      throw new Error("Failed to register OAuth application – missing client credentials from GoToSocial instance.");
    }

    this.safeSetItem(STORAGE_KEYS.CLIENT_ID, app.clientId);
    this.safeSetItem(STORAGE_KEYS.CLIENT_SECRET, app.clientSecret);

    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      vapidKey: app.vapidKey ?? undefined,
    };
  }

  async getAuthorizationUrl(): Promise<string> {
    const config = this.config;
    const app = await this.registerApp();

    const params = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
    });

    return `${config.instanceUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<void> {
    const config = this.config;
    const app = await this.registerApp();

    const oauthClient = createOAuthAPIClient({
      url: config.instanceUrl,
    });

    const tokenResponse = await oauthClient.token.create({
      grantType: "authorization_code",
      code,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: config.redirectUri,
      scope: config.scopes.join(" "),
    });

    await this.initializeWithToken(tokenResponse.accessToken);
  }

  async initializeWithToken(accessToken: string): Promise<void> {
    const config = this.config;

    this.client = createRestAPIClient({
      url: config.instanceUrl,
      accessToken,
    });

    const account = await this.client.v1.accounts.verifyCredentials();

    this.authState = {
      accessToken,
      account,
    };

    this.safeSetItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    this.safeSetItem(STORAGE_KEYS.CURRENT_ACCOUNT, JSON.stringify(account));
  }

  async logout(): Promise<void> {
    if (this.client && this.authState) {
      try {
        const config = this.config;
        const clientId = this.safeGetItem(STORAGE_KEYS.CLIENT_ID);
        const clientSecret = this.safeGetItem(STORAGE_KEYS.CLIENT_SECRET);

        if (clientId && clientSecret) {
          const oauthClient = createOAuthAPIClient({
            url: config.instanceUrl,
          });

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

    this.clearAuthState();
  }

  clearAll(): void {
    this.safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.safeRemoveItem(STORAGE_KEYS.CURRENT_ACCOUNT);
    this.safeRemoveItem(STORAGE_KEYS.CLIENT_ID);
    this.safeRemoveItem(STORAGE_KEYS.CLIENT_SECRET);
    this.client = null;
    this.authState = null;
  }

  private restoreAuthState(): void {
    const accessToken = this.safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);
    const accountJson = this.safeGetItem(STORAGE_KEYS.CURRENT_ACCOUNT);

    if (accessToken && accountJson) {
      try {
        const config = this.config;
        const account = JSON.parse(accountJson) as mastodon.v1.AccountCredentials;

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

  private clearAuthState(): void {
    this.safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.safeRemoveItem(STORAGE_KEYS.CURRENT_ACCOUNT);
    this.client = null;
    this.authState = null;
  }

  private safeGetItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read "${key}" from storage:`, error);
      return null;
    }
  }

  private safeSetItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to persist "${key}" to storage:`, error);
    }
  }

  private safeRemoveItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove "${key}" from storage:`, error);
    }
  }
}
export type { mastodon };
