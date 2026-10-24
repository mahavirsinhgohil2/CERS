// ==========================================================
// database.js
// Connects to the database (Turso in the cloud, or a local file)
// and creates the tables + seed data when init() runs.
// Every function here is async: use "await" when calling it.
// ==========================================================

const { createClient } = require('@libsql/client');
const path = require('path');

// ----------------------------------------------------------
// Which database?
//  - TURSO_DATABASE_URL set  -> cloud database (permanent, used on Render)
//  - otherwise               -> local file (used on your laptop)
// ----------------------------------------------------------
function localFileUrl() {
  const filePath = process.env.DB_PATH || path.join(__dirname, 'database.db');
  // libSQL wants a forward-slash path (relative paths work on Windows too)
  const relative = path.relative(process.cwd(), filePath).split(path.sep).join('/');
  return 'file:' + relative;
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || localFileUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN
});

// ----------------------------------------------------------
// Small helpers so the routes stay simple
//   get(sql, [values])  -> first row (or undefined)
//   all(sql, [values])  -> array of rows
//   run(sql, [values])  -> { changes, lastInsertRowid }
// ----------------------------------------------------------
async function get(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows[0];
}

async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    changes: result.rowsAffected,
    lastInsertRowid: Number(result.lastInsertRowid ?? 0)   // it is a BigInt, we want a normal number
  };
}

// Runs several statements together: all succeed or none (returns the results)
async function batch(statements) {
  return client.batch(
    statements.map(function (s) { return { sql: s[0], args: s[1] || [] }; }),
    'write'
  );
}

// Runs a function inside a transaction.
// Inside it use tx.get / tx.all / tx.run. If it throws, everything is undone.
async function transaction(work) {
  const tx = await client.transaction('write');
  const helpers = {
    get: async function (sql, args = []) { return (await tx.execute({ sql, args })).rows[0]; },
    all: async function (sql, args = []) { return (await tx.execute({ sql, args })).rows; },
    run: async function (sql, args = []) {
      const r = await tx.execute({ sql, args });
      return { changes: r.rowsAffected, lastInsertRowid: Number(r.lastInsertRowid ?? 0) };
    }
  };
  try {
    const result = await work(helpers);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

// Date N days from today as YYYY-MM-DD (so seed events are never in the past)
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------
// init(): create tables, indexes and seed data (safe to run every start)
// ----------------------------------------------------------
async function init() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS events (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT NOT NULL,
      date               TEXT NOT NULL,
      location           TEXT NOT NULL,
      description        TEXT,
      participation_type TEXT NOT NULL DEFAULT 'solo',
      min_team_size      INTEGER NOT NULL DEFAULT 1,
      max_team_size      INTEGER NOT NULL DEFAULT 1,
      college            TEXT NOT NULL DEFAULT 'All Colleges',
      is_recommended     INTEGER NOT NULL DEFAULT 0,
      fee                INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name   TEXT NOT NULL,
      enrollment_no  TEXT NOT NULL,
      email          TEXT NOT NULL,
      college        TEXT NOT NULL,
      department     TEXT NOT NULL,
      branch         TEXT NOT NULL,
      division       TEXT NOT NULL,
      phone          TEXT NOT NULL,
      event_id       INTEGER,
      participation  TEXT NOT NULL DEFAULT 'solo',
      team_name      TEXT,
      ticket_code    TEXT NOT NULL UNIQUE,
      payment_status TEXT NOT NULL DEFAULT 'free',
      payment_ref    TEXT,
      attended       INTEGER NOT NULL DEFAULT 0,
      attended_at    TEXT,
      registered_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      member_name     TEXT NOT NULL,
      enrollment_no   TEXT NOT NULL,
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_event_enroll ON registrations(event_id, enrollment_no);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_payment_ref ON registrations(payment_ref) WHERE payment_ref IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_team_enroll ON team_members(enrollment_no);
  `);

  // Seed events only when the table is empty
  const row = await get('SELECT COUNT(*) AS count FROM events');
  if (Number(row.count) === 0) {
    const sql = `INSERT INTO events
      (name, date, location, description, participation_type, min_team_size, max_team_size, college, is_recommended, fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await run(sql, ['Tech Fest', daysFromNow(14), 'Main Auditorium', 'Annual technology showcase', 'solo', 1, 1, 'All Colleges', 1, 0]);
    await run(sql, ['Cultural Night', daysFromNow(21), 'Open Ground', 'Music, dance and drama', 'group', 3, 8, 'All Colleges', 0, 100]);
    await run(sql, ['Sports Day', daysFromNow(30), 'Sports Complex', 'Inter-department sports', 'both', 2, 6, 'All Colleges', 0, 0]);
    console.log('Seed data inserted (3 events)');
  }
}

module.exports = { init, get, all, run, batch, transaction };