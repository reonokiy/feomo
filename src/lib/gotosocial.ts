import { getAppConfig } from "@/config";
import { GoToSocialClient, type mastodon } from "@/core/api/gotosocial";
import { getPlatformEnvironment } from "@/core/platform/environment";

let _gtsClient: GoToSocialClient | null = null;

function getGtsClient(): GoToSocialClient {
  if (!_gtsClient) {
    const environment = getPlatformEnvironment();
    _gtsClient = new GoToSocialClient({
      storage: environment.storage,
      configProvider: getAppConfig,
    });
  }
  return _gtsClient;
}

// Export a proxy that lazily initializes the client on first access
export const gtsClient = new Proxy({} as GoToSocialClient, {
  get(_target, prop) {
    const client = getGtsClient();
    const value = client[prop as keyof GoToSocialClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type { mastodon };
