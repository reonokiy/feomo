import * as SQLite from "expo-sqlite";

let database: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    database = SQLite.openDatabaseSync("feomo.db");
    try {
      database.execSync("PRAGMA journal_mode = WAL;");
    } catch (error) {
      console.warn("[Database] Failed to set journal mode:", error);
    }
  }
  return database;
}

export function initializeDatabase(): void {
  const db = getDatabase();

  db.execSync(
    `CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT
    );`,
  );

  db.execSync(
    `CREATE TABLE IF NOT EXISTS status_cache (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );`,
  );

  db.execSync(
    `CREATE TABLE IF NOT EXISTS timeline_cache (
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      status_id TEXT NOT NULL,
      PRIMARY KEY (name, position)
    );`,
  );

  db.execSync(
    `CREATE TABLE IF NOT EXISTS timeline_meta (
      name TEXT PRIMARY KEY,
      next_token TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );`,
  );
}
