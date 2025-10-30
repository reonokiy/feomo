import { getAppConfig } from "@/config";
import { GoToSocialClient, type mastodon } from "@/core/api/gotosocial";
import { getPlatformEnvironment } from "@/core/platform/environment";

const environment = getPlatformEnvironment();

export const gtsClient = new GoToSocialClient({
  storage: environment.storage,
  configProvider: getAppConfig,
});
export type { mastodon };
