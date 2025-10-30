/**
 * Platform environment adapters
 *
 * Provides a minimal abstraction over platform specific capabilities so that
 * shared/core logic can run in both web and React Native environments.
 *
 * The environment can be registered by each platform. When not registered, a
 * safe in-memory fallback is used (useful for tests).
 */

/**
 * Storage adapter compatible with Web Storage API.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Navigation adapter for reading URL state.
 */
export interface NavigationAdapter {
  /**
   * Returns the current URL search parameters if available, otherwise `null`.
   */
  getSearchParams(): URLSearchParams | null;
}

/**
 * Platform environment descriptor.
 */
export interface PlatformEnvironment {
  /**
   * Persistent storage for small key/value pairs (e.g. localStorage, AsyncStorage).
   */
  storage: StorageAdapter;

  /**
   * Public origin of the application (e.g. https://example.com).
   */
  origin: string;

  /**
   * Optional navigation helpers.
   */
  navigation?: NavigationAdapter;
}

class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const memoryStorage = new MemoryStorageAdapter();

let currentEnvironment: PlatformEnvironment = {
  origin: "",
  storage: memoryStorage,
};

/**
 * Register the active platform environment. Can be called multiple times to
 * update the environment (e.g. when switching tenants).
 */
export function registerPlatformEnvironment(environment: PlatformEnvironment): void {
  currentEnvironment = environment;
}

/**
 * Retrieve the currently registered platform environment. Falls back to a
 * memory-based environment when not registered to keep tests predictable.
 */
export function getPlatformEnvironment(): PlatformEnvironment {
  return currentEnvironment;
}
/**
 * Convenience helper to access the storage adapter.
 */
export function getStorageAdapter(): StorageAdapter {
  return currentEnvironment.storage;
}
