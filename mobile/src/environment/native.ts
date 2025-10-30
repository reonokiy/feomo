/**
 * Native environment initialization for React Native
 *
 * This module sets up the platform environment for the mobile app, including:
 * - AsyncStorage adapter with in-memory cache for synchronous access
 * - Storage hydration from persisted values on app startup
 * - OAuth redirect URI configuration
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPlatformEnvironment, type StorageAdapter } from "@/core/platform/environment";

// In-memory cache for synchronous access to AsyncStorage values
const cache = new Map<string, string>();

/**
 * Storage adapter that provides synchronous access to AsyncStorage
 * by maintaining an in-memory cache. All writes are persisted asynchronously.
 */
const storageAdapter: StorageAdapter = {
  getItem(key: string): string | null {
    return cache.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    cache.set(key, value);
    // Persist asynchronously without blocking
    AsyncStorage.setItem(key, value).catch((error) => {
      console.warn(`[Storage] Failed to persist "${key}":`, error);
    });
  },

  removeItem(key: string): void {
    cache.delete(key);
    // Persist deletion asynchronously
    AsyncStorage.removeItem(key).catch((error) => {
      console.warn(`[Storage] Failed to remove "${key}":`, error);
    });
  },
};

/**
 * Hydrates the in-memory cache from AsyncStorage on app startup
 * This allows synchronous access to storage values after initialization
 */
async function hydrateStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();

    if (keys.length === 0) {
      console.log("[Storage] No persisted values found");
      return;
    }

    const entries = await AsyncStorage.multiGet(keys);
    let loadedCount = 0;

    for (const [key, value] of entries) {
      if (key && typeof value === "string") {
        cache.set(key, value);
        loadedCount++;
      }
    }

    console.log(`[Storage] Loaded ${loadedCount} value(s) from AsyncStorage`);
  } catch (error) {
    console.warn("[Storage] Failed to load persisted values:", error);
  }
}

/**
 * Initializes the native platform environment
 *
 * Must be called before any other app code that accesses the platform environment.
 * This function:
 * 1. Loads persisted storage values into memory
 * 2. Registers the platform environment with storage and origin
 */
export async function initializeNativeEnvironment(): Promise<void> {
  console.log("[Environment] Initializing...");

  await hydrateStorage();

  // For mobile apps, origin is used for OAuth redirect URIs
  // Default to app:// scheme, can be overridden via EXPO_PUBLIC_WEB_ORIGIN
  const origin = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "app://feomo";
  console.log(`[Environment] Origin: ${origin}`);

  registerPlatformEnvironment({
    origin,
    storage: storageAdapter,
  });

  console.log("[Environment] Initialized successfully");
}
