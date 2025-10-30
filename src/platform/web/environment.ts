import {
  registerPlatformEnvironment,
  type NavigationAdapter,
  type PlatformEnvironment,
  type StorageAdapter,
} from "@/core/platform/environment";

class BrowserStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("BrowserStorageAdapter.getItem failed:", error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("BrowserStorageAdapter.setItem failed:", error);
    }
  }

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("BrowserStorageAdapter.removeItem failed:", error);
    }
  }
}

class BrowserNavigationAdapter implements NavigationAdapter {
  getSearchParams(): URLSearchParams | null {
    try {
      return new URLSearchParams(window.location.search);
    } catch (error) {
      console.warn("BrowserNavigationAdapter.getSearchParams failed:", error);
      return null;
    }
  }
}

function createBrowserEnvironment(): PlatformEnvironment {
  return {
    storage: new BrowserStorageAdapter(),
    origin: window.location.origin,
    navigation: new BrowserNavigationAdapter(),
  };
}

registerPlatformEnvironment(createBrowserEnvironment());
