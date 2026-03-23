import Database from "better-sqlite3";
import path from "path";

/** Path to the SQLite database file at the project root */
const dbPath = path.join(process.cwd(), "expenses.db");

/** Singleton database instance — opened once, reused across requests */
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

/** Create the expenses table if it doesn't already exist */
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL CHECK(amount > 0),
    category    TEXT    NOT NULL,
    description TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_date
    ON expenses(date);

  CREATE INDEX IF NOT EXISTS idx_expenses_category
    ON expenses(category);
`);

export default db;
