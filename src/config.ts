import { buildAppConfig, type AppConfig } from "@/core/config/app-config";
import { getPlatformEnvironment } from "@/core/platform/environment";

type NullableEnvValue = string | undefined | null;

function getImportMetaEnv(): Record<string, NullableEnvValue> | undefined {
  try {
    return (import.meta as unknown as { env?: Record<string, NullableEnvValue> })?.env;
  } catch {
    return undefined;
  }
}

function readEnvValue(key: string): NullableEnvValue {
  const importMetaEnv = getImportMetaEnv();
  if (importMetaEnv && key in importMetaEnv) {
    return importMetaEnv[key];
  }

  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key];
  }

  return undefined;
}

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    const environment = getPlatformEnvironment();
    cachedConfig = buildAppConfig({
      instanceUrl: readEnvValue("VITE_GOTOSOCIAL_INSTANCE_URL"),
      clientId: readEnvValue("VITE_GOTOSOCIAL_CLIENT_ID"),
      clientSecret: readEnvValue("VITE_GOTOSOCIAL_CLIENT_SECRET"),
      appName: readEnvValue("VITE_APP_NAME"),
      appWebsite: readEnvValue("VITE_APP_WEBSITE"),
      scopes: readEnvValue("VITE_GOTOSOCIAL_SCOPES"),
      redirectUri: readEnvValue("VITE_GOTOSOCIAL_REDIRECT_URI"),
      defaultRedirectPath: "/auth/callback",
      origin: environment.origin,
    });
  }

  return cachedConfig;
}

export function resetAppConfig(): void {
  cachedConfig = null;
}

export const config = new Proxy({} as AppConfig, {
  get(_target, prop: keyof AppConfig) {
    return getAppConfig()[prop];
  },
  ownKeys() {
    return Reflect.ownKeys(getAppConfig());
  },
  getOwnPropertyDescriptor(_target, prop: keyof AppConfig) {
    return {
      configurable: true,
      enumerable: true,
      value: getAppConfig()[prop],
      writable: false,
    };
  },
}) as AppConfig;
