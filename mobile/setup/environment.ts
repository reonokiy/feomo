import * as Linking from "expo-linking";
import {
  registerPlatformEnvironment,
  type PlatformEnvironment,
  type StorageAdapter,
} from "@feomo/core/platform/environment";
import { getDatabase, initializeDatabase } from "./database";

class SqliteStorageAdapter implements StorageAdapter {
  private cache = new Map<string, string>();
  private isReady = false;

  async initialize(): Promise<void> {
    try {
      initializeDatabase();
      const db = getDatabase();
      const rows = db.getAllSync<{ key: string; value: string }>("SELECT key, value FROM kv_store");
      for (const row of rows) {
        if (row.value !== null && row.value !== undefined) {
          this.cache.set(row.key, row.value);
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
    try {
      const db = getDatabase();
      db.runSync(
        `INSERT INTO kv_store (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value,
      );
    } catch (error) {
      console.warn("[Environment] Failed to persist storage value:", error);
    }
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    try {
      const db = getDatabase();
      db.runSync("DELETE FROM kv_store WHERE key = ?", key);
    } catch (error) {
      console.warn("[Environment] Failed to remove storage value:", error);
    }
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
    const storage = new SqliteStorageAdapter();
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
