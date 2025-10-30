import {
  APP_CONFIG_OVERRIDE_KEYS,
  config,
  getAppConfig,
  getAppConfigOverrides,
  setAppConfigOverrides,
  clearAppConfigOverrides,
} from "@/config";
import { buildAppConfig } from "@/core/config/app-config";
import { getPlatformEnvironment } from "@/core/platform/environment";

const INSTANCE_KEY = APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL;

export function getActiveInstanceUrl(): string {
  return config.instanceUrl;
}

export function getOverriddenInstanceUrl(): string | null {
  const overrides = getAppConfigOverrides();
  return overrides[INSTANCE_KEY] ?? null;
}

export function setInstanceUrl(instanceUrl: string): void {
  const trimmed = instanceUrl.trim();
  if (!trimmed) {
    throw new Error("Instance URL cannot be empty.");
  }

  const current = getAppConfig();
  const environment = getPlatformEnvironment();

  // Validate and normalize using shared config builder
  const normalized = buildAppConfig({
    instanceUrl: trimmed,
    clientId: current.clientId ?? null,
    clientSecret: current.clientSecret ?? null,
    appName: current.appName,
    appWebsite: current.appWebsite,
    scopes: current.scopes,
    redirectUri: current.redirectUri,
    origin: environment.origin,
  });

  setAppConfigOverrides({
    [INSTANCE_KEY]: normalized.instanceUrl,
  });
}

export function clearInstanceOverride(): void {
  clearAppConfigOverrides([INSTANCE_KEY]);
}
