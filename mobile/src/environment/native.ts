import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPlatformEnvironment, type StorageAdapter } from "@/core/platform/environment";

const cache = new Map<string, string>();

const storageAdapter: StorageAdapter = {
  getItem(key) {
    return cache.has(key) ? cache.get(key)! : null;
  },
  setItem(key, value) {
    cache.set(key, value);
    void AsyncStorage.setItem(key, value).catch((error) => {
      console.warn("Failed to persist value to AsyncStorage:", error);
    });
  },
  removeItem(key) {
    cache.delete(key);
    void AsyncStorage.removeItem(key).catch((error) => {
      console.warn("Failed to remove value from AsyncStorage:", error);
    });
  },
};

async function hydrateStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length === 0) {
      return;
    }

    const entries = await AsyncStorage.multiGet(keys);
    for (const [key, value] of entries) {
      if (key && typeof value === "string") {
        cache.set(key, value);
      }
    }
  } catch (error) {
    console.warn("Failed to load persisted values from AsyncStorage:", error);
  }
}

export async function initializeNativeEnvironment(): Promise<void> {
  await hydrateStorage();

  registerPlatformEnvironment({
    origin: process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "https://localhost",
    storage: storageAdapter,
  });
}

