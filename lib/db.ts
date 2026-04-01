import { createClient, type Client } from "@libsql/client";

let db: Client;

export function getDb(): Client {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not set. Please add it to .env.local"
      );
    }

    db = createClient({ url, authToken: authToken || undefined });
  }
  return db;
}

export async function initializeDb(): Promise<void> {
  const client = getDb();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      amount      REAL    NOT NULL CHECK(amount > 0),
      category    TEXT    NOT NULL,
      description TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
    )
  `);

  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)"
  );
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)"
  );
}

let initPromise: Promise<void> | null = null;

export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeDb().catch((err) => {
      // Reset so the next request retries
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}
