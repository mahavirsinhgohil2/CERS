// ==========================================================
// database.js
// Sets up the SQLite database, creates tables, adds seed data
// ==========================================================

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'database.db'));

// Turn ON foreign key checking (SQLite has it OFF by default)
db.pragma('foreign_keys = ON');

// ----------------------------------------------------------
// TABLE 1: events
// fee = entry fee in rupees per registration (0 = free)
// ----------------------------------------------------------
db.exec(`
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
  )
`);

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(function (item) { return item.name === column; })) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('events', 'participation_type', "TEXT NOT NULL DEFAULT 'solo'");
addColumnIfMissing('events', 'min_team_size', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('events', 'max_team_size', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('events', 'college', "TEXT NOT NULL DEFAULT 'All Colleges'");
addColumnIfMissing('events', 'is_recommended', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('events', 'fee', 'INTEGER NOT NULL DEFAULT 0');

// ----------------------------------------------------------
// TABLE 2: registrations
// ticket_code    : unique code shown as a QR on the ticket
// payment_status : 'free', 'pending' (waiting for admin) or 'paid'
// payment_ref    : UPI transaction ID typed by the student
// attended       : 0 = absent, 1 = present
// ----------------------------------------------------------
db.exec(`
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
  )
`);

addColumnIfMissing('registrations', 'college', "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('registrations', 'branch', "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('registrations', 'division', "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('registrations', 'participation', "TEXT NOT NULL DEFAULT 'solo'");
addColumnIfMissing('registrations', 'team_name', 'TEXT');
addColumnIfMissing('registrations', 'ticket_code', 'TEXT');
addColumnIfMissing('registrations', 'payment_status', "TEXT NOT NULL DEFAULT 'free'");
addColumnIfMissing('registrations', 'payment_ref', 'TEXT');
addColumnIfMissing('registrations', 'attended', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('registrations', 'attended_at', 'TEXT');
addColumnIfMissing('registrations', 'registered_at', 'TEXT');
db.prepare("UPDATE registrations SET registered_at = COALESCE(registered_at, datetime('now'))").run();

const crypto = require('crypto');
const missingTickets = db.prepare(
  "SELECT id FROM registrations WHERE ticket_code IS NULL OR ticket_code = ''"
).all();
const setTicket = db.prepare('UPDATE registrations SET ticket_code = ? WHERE id = ?');
missingTickets.forEach(function (registration) {
  setTicket.run('CERS-' + crypto.randomBytes(6).toString('hex').toUpperCase(), registration.id);
});

// ----------------------------------------------------------
// TABLE 3: team_members
// ----------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    member_name     TEXT NOT NULL,
    enrollment_no   TEXT NOT NULL,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
  )
`);

// ----------------------------------------------------------
// SEED DATA: only inserted if the events table is empty
// ----------------------------------------------------------
// Unique rules and indexes (also a safety net against duplicate data)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_ticket_code ON registrations(ticket_code);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_event_enroll ON registrations(event_id, enrollment_no);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_payment_ref ON registrations(payment_ref) WHERE payment_ref IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_team_enroll ON team_members(enrollment_no);
`);

// Date N days from today as YYYY-MM-DD (so seed events are never in the past)
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const row = db.prepare('SELECT COUNT(*) AS count FROM events').get();

if (row.count === 0) {
  const insertEvent = db.prepare(`
    INSERT INTO events
      (name, date, location, description, participation_type, min_team_size, max_team_size, college, is_recommended, fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run('Tech Fest', daysFromNow(14), 'Main Auditorium', 'Annual technology showcase', 'solo', 1, 1, 'All Colleges', 1, 0);
  insertEvent.run('Cultural Night', daysFromNow(21), 'Open Ground', 'Music, dance and drama', 'group', 3, 8, 'All Colleges', 0, 100);
  insertEvent.run('Sports Day', daysFromNow(30), 'Sports Complex', 'Inter-department sports', 'both', 2, 6, 'All Colleges', 0, 0);

  console.log('✅ Seed data inserted (3 events)');
}

module.exports = db;