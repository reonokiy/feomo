import { buildAppConfig, type AppConfig } from "@/core/config/app-config";
import { getPlatformEnvironment } from "@/core/platform/environment";

type NullableEnvValue = string | undefined | null;

const CONFIG_OVERRIDE_STORAGE_KEY = "app-config-overrides";
type ConfigOverrideMap = Record<string, string>;

export const APP_CONFIG_OVERRIDE_KEYS = {
  INSTANCE_URL: "VITE_GOTOSOCIAL_INSTANCE_URL",
  CLIENT_ID: "VITE_GOTOSOCIAL_CLIENT_ID",
  CLIENT_SECRET: "VITE_GOTOSOCIAL_CLIENT_SECRET",
  APP_NAME: "VITE_APP_NAME",
  APP_WEBSITE: "VITE_APP_WEBSITE",
  SCOPES: "VITE_GOTOSOCIAL_SCOPES",
  REDIRECT_URI: "VITE_GOTOSOCIAL_REDIRECT_URI",
} as const;

export type AppConfigOverrideKey = (typeof APP_CONFIG_OVERRIDE_KEYS)[keyof typeof APP_CONFIG_OVERRIDE_KEYS];

const DEFAULT_ENV: Record<string, NullableEnvValue> = {
  [APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL]: "https://your-instance.social",
  [APP_CONFIG_OVERRIDE_KEYS.CLIENT_ID]: "",
  [APP_CONFIG_OVERRIDE_KEYS.CLIENT_SECRET]: "",
  [APP_CONFIG_OVERRIDE_KEYS.APP_NAME]: "feomo",
  [APP_CONFIG_OVERRIDE_KEYS.APP_WEBSITE]: "https://github.com/reonokiy/feomo",
  [APP_CONFIG_OVERRIDE_KEYS.SCOPES]: "read write follow",
  [APP_CONFIG_OVERRIDE_KEYS.REDIRECT_URI]: "https://your-instance.social/auth/callback",
};

let overrideCache: ConfigOverrideMap | null = null;

function getStoredOverrides(): ConfigOverrideMap {
  if (overrideCache) {
    return overrideCache;
  }

  try {
    const environment = getPlatformEnvironment();
    // Check if environment is properly initialized
    if (!environment || !environment.storage) {
      console.warn("[Config] Environment not fully initialized, using empty overrides");
      overrideCache = {};
      return overrideCache;
    }

    const rawValue = environment.storage.getItem(CONFIG_OVERRIDE_STORAGE_KEY);
    if (!rawValue) {
      overrideCache = {};
      return overrideCache;
    }

    const parsed = JSON.parse(rawValue) as ConfigOverrideMap;
    if (parsed && typeof parsed === "object") {
      overrideCache = parsed;
      return overrideCache;
    }
  } catch (error) {
    console.warn("Failed to read app config overrides from storage:", error);
  }

  overrideCache = {};
  return overrideCache;
}

function writeOverrides(overrides: ConfigOverrideMap): void {
  overrideCache = overrides;
  try {
    const storage = getPlatformEnvironment().storage;
    storage.setItem(CONFIG_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.warn("Failed to persist app config overrides:", error);
  }
}

function getImportMetaEnv(): Record<string, NullableEnvValue> | undefined {
  if (typeof globalThis !== "undefined" && "__APP_META_ENV__" in globalThis) {
    return (globalThis as { __APP_META_ENV__?: Record<string, NullableEnvValue> }).__APP_META_ENV__;
  }
  return undefined;
}

const getEnvFallbackKeys = (key: string): string[] => {
  if (!key.startsWith("VITE_")) {
    return [key];
  }

  const suffix = key.slice("VITE_".length);
  const expoKey = `EXPO_PUBLIC_${suffix}`;
  return [key, expoKey];
};

function readEnvValue(key: string): NullableEnvValue {
  const keys = getEnvFallbackKeys(key);

  const overrides = getStoredOverrides();
  for (const candidate of keys) {
    if (candidate in overrides) {
      return overrides[candidate];
    }
  }

  const importMetaEnv = getImportMetaEnv();
  if (importMetaEnv) {
    for (const candidate of keys) {
      if (candidate in importMetaEnv) {
        return importMetaEnv[candidate];
      }
    }
  }

  if (typeof process !== "undefined" && process.env) {
    for (const candidate of keys) {
      if (candidate in process.env) {
        return process.env[candidate];
      }
    }
  }

  for (const candidate of keys) {
    if (candidate in DEFAULT_ENV) {
      return DEFAULT_ENV[candidate];
    }
  }

  return undefined;
}

export function getAppConfigOverrides(): ConfigOverrideMap {
  return { ...getStoredOverrides() };
}

export function setAppConfigOverrides(overrides: Record<string, NullableEnvValue>): void {
  const current = { ...getStoredOverrides() };
  let hasChanges = false;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === "") {
      if (key in current) {
        delete current[key];
        hasChanges = true;
      }
      continue;
    }

    const stringValue = String(value);
    if (current[key] !== stringValue) {
      current[key] = stringValue;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return;
  }

  writeOverrides(current);
  resetAppConfig();
}

export function clearAppConfigOverrides(keys?: string[]): void {
  const current = { ...getStoredOverrides() };
  let hasChanges = false;

  if (Array.isArray(keys) && keys.length > 0) {
    for (const key of keys) {
      if (key in current) {
        delete current[key];
        hasChanges = true;
      }
    }
  } else if (Object.keys(current).length > 0) {
    hasChanges = true;
    for (const key of Object.keys(current)) {
      delete current[key];
    }
  }

  if (!hasChanges) {
    return;
  }

  writeOverrides(current);
  resetAppConfig();
}

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    const environment = getPlatformEnvironment();

    // Check if environment is properly initialized
    if (!environment || !environment.origin) {
      console.warn("[Config] Environment not initialized, using fallback origin");
    }

    cachedConfig = buildAppConfig({
      instanceUrl: readEnvValue("VITE_GOTOSOCIAL_INSTANCE_URL"),
      clientId: readEnvValue("VITE_GOTOSOCIAL_CLIENT_ID"),
      clientSecret: readEnvValue("VITE_GOTOSOCIAL_CLIENT_SECRET"),
      appName: readEnvValue("VITE_APP_NAME"),
      appWebsite: readEnvValue("VITE_APP_WEBSITE"),
      scopes: readEnvValue("VITE_GOTOSOCIAL_SCOPES"),
      redirectUri: readEnvValue("VITE_GOTOSOCIAL_REDIRECT_URI"),
      defaultRedirectPath: "/auth/callback",
      origin: environment?.origin || "app://feomo",
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
