import type { mastodon } from "@feomo/lib/gotosocial";
import { getDatabase, initializeDatabase } from "./database";

const TIMELINE_LIMIT = 50;

function ensureInitialized() {
  try {
    initializeDatabase();
  } catch (error) {
    console.warn("[TimelineCache] Failed to initialize database:", error);
  }
}

export interface TimelineCacheResult {
  statuses: mastodon.v1.Status[];
  nextToken: string | null;
}

export function loadTimelineCache(name: string): TimelineCacheResult {
  ensureInitialized();
  const db = getDatabase();

  try {
    const rows = db.getAllSync<{ status_id: string }>(
      "SELECT status_id FROM timeline_cache WHERE name = ? ORDER BY position ASC",
      name,
    );

    const statuses: mastodon.v1.Status[] = [];
    for (const row of rows) {
      const payloadRow = db.getFirstSync<{ payload: string }>(
        "SELECT payload FROM status_cache WHERE id = ?",
        row.status_id,
      );
      if (payloadRow?.payload) {
        try {
          statuses.push(JSON.parse(payloadRow.payload) as mastodon.v1.Status);
        } catch (error) {
          console.warn("[TimelineCache] Failed to parse cached status:", error);
        }
      }
    }

    const meta = db.getFirstSync<{ next_token: string | null }>(
      "SELECT next_token FROM timeline_meta WHERE name = ?",
      name,
    );

    return {
      statuses,
      nextToken: meta?.next_token ?? null,
    };
  } catch (error) {
    console.warn("[TimelineCache] Failed to load cache:", error);
    return { statuses: [], nextToken: null };
  }
}

export function saveTimelineCache(
  name: string,
  statuses: mastodon.v1.Status[],
  nextToken: string | null,
): void {
  ensureInitialized();
  const db = getDatabase();

  try {
    db.execSync("BEGIN TRANSACTION;");

    db.runSync("DELETE FROM timeline_cache WHERE name = ?", name);

    statuses.slice(0, TIMELINE_LIMIT).forEach((status, index) => {
      const payload = JSON.stringify(status);
      db.runSync(
        `INSERT INTO status_cache (id, payload, updated_at)
         VALUES (?, ?, strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
        status.id,
        payload,
      );

      db.runSync(
        "INSERT INTO timeline_cache (name, position, status_id) VALUES (?, ?, ?)",
        name,
        index,
        status.id,
      );
    });

    db.runSync(
      `INSERT INTO timeline_meta (name, next_token, updated_at)
       VALUES (?, ?, strftime('%s','now'))
       ON CONFLICT(name) DO UPDATE SET next_token = excluded.next_token, updated_at = excluded.updated_at`,
      name,
      nextToken,
    );

    db.execSync("COMMIT;");
  } catch (error) {
    db.execSync("ROLLBACK;");
    console.warn("[TimelineCache] Failed to persist cache:", error);
  }
}
