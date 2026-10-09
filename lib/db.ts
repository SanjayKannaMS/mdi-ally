import { createClient, type InValue, type ResultSet } from '@libsql/client';

// Turso (hosted libSQL) in production; falls back to the local data.db file for development.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    default_target_rise INTEGER NOT NULL DEFAULT 40,
    preferred_intensity INTEGER NOT NULL DEFAULT 2,
    preferred_duration_minutes INTEGER NOT NULL DEFAULT 15,
    preferred_setting TEXT NOT NULL DEFAULT 'either',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    file_name TEXT NOT NULL DEFAULT '',
    analysis TEXT NOT NULL,
    worksheet TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS routine_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    log_date TEXT NOT NULL,
    stress_level INTEGER NOT NULL,
    sleep_quality INTEGER NOT NULL,
    exercise_minutes INTEGER NOT NULL DEFAULT 0,
    illness INTEGER NOT NULL DEFAULT 0,
    meal_timing_consistency INTEGER NOT NULL,
    avg_glucose REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
  );

  CREATE TABLE IF NOT EXISTS meal_images (
    key TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

const newUserColumns: Record<string, string> = {
  preferred_intensity: 'INTEGER NOT NULL DEFAULT 2',
  preferred_duration_minutes: 'INTEGER NOT NULL DEFAULT 15',
  preferred_setting: "TEXT NOT NULL DEFAULT 'either'",
  meal_target_carbs: 'INTEGER',
  meal_target_fiber: 'INTEGER',
  meal_target_protein: 'INTEGER',
  meal_weight_lbs: 'REAL',
  meal_height_ft: 'INTEGER',
  meal_height_in: 'INTEGER',
  meal_gender: 'TEXT',
  meal_cuisines: 'TEXT',
  meal_diet_subtypes: 'TEXT',
};

async function migrate() {
  await client.executeMultiple(SCHEMA);
  const info = await client.execute('PRAGMA table_info(users)');
  const existingUserColumns = new Set(info.rows.map((r) => String(r.name)));
  for (const [column, definition] of Object.entries(newUserColumns)) {
    if (!existingUserColumns.has(column)) {
      try {
        await client.execute(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
      } catch (err) {
        if (!(err instanceof Error) || !/duplicate column name/i.test(err.message)) throw err;
      }
    }
  }
}

// Runs once per server instance; reset on failure so the next request retries.
let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (!ready) ready = migrate().catch((err) => { ready = null; throw err; });
  return ready;
}

function toObjects(rs: ResultSet): Record<string, unknown>[] {
  return rs.rows.map((row) =>
    Object.fromEntries(rs.columns.map((col, i) => [col, row[i] instanceof ArrayBuffer ? Buffer.from(row[i] as ArrayBuffer) : row[i]]))
  );
}

async function execute(sql: string, args: InValue[]): Promise<ResultSet> {
  await ensureReady();
  return client.execute({ sql, args });
}

/** Async stand-in for better-sqlite3's prepare().get/all/run, so call sites only need an `await`. */
export const db = {
  prepare(sql: string) {
    return {
      async get(...args: InValue[]): Promise<unknown> {
        return toObjects(await execute(sql, args))[0];
      },
      async all(...args: InValue[]): Promise<unknown[]> {
        return toObjects(await execute(sql, args));
      },
      async run(...args: InValue[]): Promise<{ changes: number; lastInsertRowid: number | undefined }> {
        const rs = await execute(sql, args);
        return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined };
      },
    };
  },
};

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  default_target_rise: number;
  preferred_intensity: number;
  preferred_duration_minutes: number;
  preferred_setting: string;
  meal_target_carbs: number | null;
  meal_target_fiber: number | null;
  meal_target_protein: number | null;
  meal_weight_lbs: number | null;
  meal_height_ft: number | null;
  meal_height_in: number | null;
  meal_gender: string | null;
  meal_cuisines: string | null;
  meal_diet_subtypes: string | null;
  created_at: string;
}

export interface ReportRow {
  id: number;
  user_id: number;
  file_name: string;
  analysis: string;
  worksheet: string | null;
  created_at: string;
}

export interface RoutineLogRow {
  id: number;
  user_id: number;
  log_date: string;
  stress_level: number;
  sleep_quality: number;
  exercise_minutes: number;
  illness: number;
  meal_timing_consistency: number;
  avg_glucose: number;
  created_at: string;
}
