import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import {
  registerPlatformEnvironment,
  type PlatformEnvironment,
  type StorageAdapter,
} from "@feomo/core/platform/environment";

class AsyncStorageSyncAdapter implements StorageAdapter {
  private cache = new Map<string, string>();
  private isReady = false;

  async initialize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        const entries = await AsyncStorage.multiGet(keys);
        for (const [key, value] of entries) {
          if (value !== null && value !== undefined) {
            this.cache.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn("[Environment] Failed to hydrate storage cache:", error);
      this.cache.clear();
    } finally {
      this.isReady = true;
    }
  }

  getItem(key: string): string | null {
    if (!this.isReady) {
      console.warn("[Environment] Storage accessed before initialization completed.");
    }
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    void AsyncStorage.setItem(key, value).catch((error) => {
      console.warn("[Environment] Failed to persist storage value:", error);
    });
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    void AsyncStorage.removeItem(key).catch((error) => {
      console.warn("[Environment] Failed to remove storage value:", error);
    });
  }
}

function resolveOrigin(): string {
  try {
    const rawUrl = Linking.createURL("/");
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    console.warn("[Environment] Failed to resolve origin, using fallback.", error);
    return "app://feomo";
  }
}

let environmentReady = false;
let initializationPromise: Promise<void> | null = null;

export function isPlatformEnvironmentReady(): boolean {
  return environmentReady;
}

export async function ensurePlatformEnvironment(): Promise<void> {
  if (environmentReady) {
    return;
  }

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    const storage = new AsyncStorageSyncAdapter();
    await storage.initialize();

    const environment: PlatformEnvironment = {
      storage,
      origin: resolveOrigin(),
    };

    registerPlatformEnvironment(environment);
    environmentReady = true;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}
