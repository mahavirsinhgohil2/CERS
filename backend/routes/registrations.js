// ==========================================================
// routes/registrations.js
// Registration, payment verification and attendance routes
// ==========================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');

// Enrollment number: 13 or 14 digits
const ENROLLMENT_PATTERN = /^\d{13,14}$/;

// College email: 13 digits + @silveroakuni.ac.in
const COLLEGE_EMAIL_PATTERN = /^\d{13}@silveroakuni\.ac\.in$/;

// UPI transaction ID: 10 to 25 letters/numbers
const PAYMENT_REF_PATTERN = /^[A-Z0-9]{10,25}$/;

// Turns any value into trimmed text ('' if missing)
function clean(value) {
  return String(value ?? '').trim();
}
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ----------------------------------------------------------
// Makes a unique ticket code like CERS-7F3A9C2B
// ----------------------------------------------------------
function makeTicketCode() {
  let code;
  do {
    code = 'CERS-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  } while (db.prepare('SELECT id FROM registrations WHERE ticket_code = ?').get(code));
  return code;
}

// ----------------------------------------------------------
// Is this enrollment number already in this event?
// (as a team leader or as a team member)
// ----------------------------------------------------------
function isAlreadyInEvent(enrollmentNo, eventId) {
  const asLeader = db
    .prepare('SELECT id FROM registrations WHERE enrollment_no = ? AND event_id = ?')
    .get(enrollmentNo, eventId);
  if (asLeader) return true;

  const asMember = db.prepare(`
    SELECT team_members.id
    FROM team_members
    JOIN registrations ON team_members.registration_id = registrations.id
    WHERE team_members.enrollment_no = ? AND registrations.event_id = ?
  `).get(enrollmentNo, eventId);

  return Boolean(asMember);
}

// ----------------------------------------------------------
// POST /api/register
// ----------------------------------------------------------
router.post('/register', (req, res) => {
  try {
    const studentName  = clean(req.body.student_name);
    const enrollmentNo = clean(req.body.enrollment_no);
    const email        = clean(req.body.email).toLowerCase();
    const college      = clean(req.body.college);
    const department   = clean(req.body.department);
    const branch       = clean(req.body.branch);
    const division     = clean(req.body.division);
    const phone        = clean(req.body.phone);
    const eventId      = Number(req.body.event_id);

    // 1. All basic fields are required
    if (!studentName || !enrollmentNo || !email || !college || !department
        || !branch || !division || !phone || !eventId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 2. Format checks
    if (!ENROLLMENT_PATTERN.test(enrollmentNo)) {
      return res.status(400).json({ error: 'Enrollment number must be 13 or 14 digits' });
    }
    if (!COLLEGE_EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Use your college email: 13 digits followed by @silveroakuni.ac.in' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must be exactly 10 digits' });
    }
    if ([studentName, college, department, branch].some(function (v) { return v.length > 100; }) || division.length > 5) {
      return res.status(400).json({ error: 'One of the fields is too long' });
    }

    // 3. The event must exist
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // 4. College restriction
    if (event.college !== 'All Colleges' && college !== event.college) {
      return res.status(403).json({ error: 'This event is only for ' + event.college });
    }
     if (event.date < todayString()) {
      return res.status(400).json({ error: 'Registration is closed: this event has already happened' });
    }

    // 5. Solo or group
    let mode = event.participation_type;
    if (mode === 'both') {
      mode = clean(req.body.participation);
      if (mode !== 'solo' && mode !== 'group') {
        return res.status(400).json({ error: 'Please choose Solo or Group' });
      }
    }

    // 6. Team checks (group only)
    let teamName = null;
    let members = [];

    if (mode === 'group') {
      teamName = clean(req.body.team_name);
      if (!teamName) {
        return res.status(400).json({ error: 'Team name is required for group events' });
      }
      if (teamName.length > 60) {
        return res.status(400).json({ error: 'Team name is too long (max 60)' });
      }
      const rawMembers = Array.isArray(req.body.team_members) ? req.body.team_members : [];
      members = rawMembers.map(function (m) {
        const member = m || {};
        return {
          member_name: clean(member.member_name),
          enrollment_no: clean(member.enrollment_no)
        };
      });

      const teamSize = members.length + 1;   // +1 = the team leader
      if (teamSize < event.min_team_size || teamSize > event.max_team_size) {
        return res.status(400).json({
          error: `Team size must be between ${event.min_team_size} and ${event.max_team_size} members (including the team leader)`
        });
      }

      const seen = [enrollmentNo];
      for (const m of members) {
        if (!m.member_name || !ENROLLMENT_PATTERN.test(m.enrollment_no)) {
          return res.status(400).json({ error: 'Every team member needs a name and a 13 or 14-digit enrollment number' });
        }
        if (seen.includes(m.enrollment_no)) {
          return res.status(400).json({ error: 'Duplicate enrollment number in the team: ' + m.enrollment_no });
        }
        seen.push(m.enrollment_no);
      }
    }

    // 7. Payment (paid events only)
    let paymentStatus = 'free';
    let paymentRef = null;

    if (event.fee > 0) {
      paymentRef = clean(req.body.payment_ref).toUpperCase();
      if (!PAYMENT_REF_PATTERN.test(paymentRef)) {
        return res.status(400).json({ error: 'Enter the UPI transaction ID (10 to 25 letters or numbers)' });
      }
      const refUsed = db.prepare('SELECT id FROM registrations WHERE payment_ref = ?').get(paymentRef);
      if (refUsed) {
        return res.status(409).json({ error: 'This transaction ID was already used for another registration' });
      }
      paymentStatus = 'pending';   // the admin verifies it later
    }

    // 8. Nobody (leader or member) may already be in this event
    const everyone = [enrollmentNo].concat(members.map(function (m) { return m.enrollment_no; }));
    for (const en of everyone) {
      if (isAlreadyInEvent(en, eventId)) {
        return res.status(409).json({ error: `Enrollment number ${en} is already registered for this event` });
      }
    }

    // 9. Save everything together (all or nothing)
    const ticketCode = makeTicketCode();

    const saveRegistration = db.transaction(function () {
      const result = db.prepare(`
        INSERT INTO registrations
          (student_name, enrollment_no, email, college, department, branch, division, phone,
           event_id, participation, team_name, ticket_code, payment_status, payment_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(studentName, enrollmentNo, email, college, department, branch, division, phone,
             eventId, mode, teamName, ticketCode, paymentStatus, paymentRef);

      const insertMember = db.prepare(
        'INSERT INTO team_members (registration_id, member_name, enrollment_no) VALUES (?, ?, ?)'
      );
      members.forEach(function (m) {
        insertMember.run(result.lastInsertRowid, m.member_name, m.enrollment_no);
      });
    });
    saveRegistration();

    res.status(201).json({
      message: 'Registration successful',
      event_name: event.name,
      participation: mode,
      team_name: teamName,
      ticket_code: ticketCode,
      payment_status: paymentStatus
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Already registered, or this transaction ID was already used' });
    }
    console.error('Error saving registration:', error.message);
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

// ----------------------------------------------------------
// GET /api/registrations (admin)
// ----------------------------------------------------------
router.get('/registrations', requireAdmin, (req, res) => {
  try {
    const registrations = db.prepare(`
      SELECT
        registrations.id,
        registrations.student_name,
        registrations.enrollment_no,
        registrations.email,
        registrations.college,
        registrations.department,
        registrations.branch,
        registrations.division,
        registrations.phone,
        registrations.event_id,
        registrations.participation,
        registrations.team_name,
        registrations.ticket_code,
        registrations.payment_status,
        registrations.payment_ref,
        registrations.attended,
        registrations.attended_at,
        events.name AS event_name,
        events.fee AS event_fee
      FROM registrations
      JOIN events ON registrations.event_id = events.id
      ORDER BY registrations.id DESC
    `).all();

    const members = db
      .prepare('SELECT registration_id, member_name, enrollment_no FROM team_members ORDER BY id')
      .all();

    registrations.forEach(function (r) {
      r.team_members = members.filter(function (m) {
        return m.registration_id === r.id;
      });
    });

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error.message);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// ----------------------------------------------------------
// PUT /api/registrations/:id/payment (admin)
// Body: { status: 'paid' } or { status: 'pending' }
// ----------------------------------------------------------
router.put('/registrations/:id/payment', requireAdmin, (req, res) => {
  try {
    const status = clean(req.body.status);
    if (status !== 'paid' && status !== 'pending') {
      return res.status(400).json({ error: 'Status must be paid or pending' });
    }

    const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
    if (!reg) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    if (reg.payment_status === 'free') {
      return res.status(400).json({ error: 'This is a free registration' });
    }

    db.prepare('UPDATE registrations SET payment_status = ? WHERE id = ?').run(status, reg.id);

    // If payment is undone, attendance is cleared too
    if (status === 'pending') {
      db.prepare('UPDATE registrations SET attended = 0, attended_at = NULL WHERE id = ?').run(reg.id);
    }

    res.json({ message: 'Payment updated' });
  } catch (error) {
    console.error('Error updating payment:', error.message);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// ----------------------------------------------------------
// PUT /api/registrations/:id/attendance (admin)
// Body: { attended: true } or { attended: false }
// ----------------------------------------------------------
router.put('/registrations/:id/attendance', requireAdmin, (req, res) => {
  try {
    const attended = req.body.attended === true;

    const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
    if (!reg) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    if (attended && reg.payment_status === 'pending') {
      return res.status(403).json({ error: 'Payment is not verified yet' });
    }

    db.prepare('UPDATE registrations SET attended = ?, attended_at = ? WHERE id = ?')
      .run(attended ? 1 : 0, attended ? new Date().toISOString() : null, reg.id);

    res.json({ message: 'Attendance updated' });
  } catch (error) {
    console.error('Error updating attendance:', error.message);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// ----------------------------------------------------------
// POST /api/attendance/checkin (admin)
// Body: { ticket_code: 'CERS-XXXXXXXX', event_id: 1 (optional) }
// Marks the ticket's registration as present
// ----------------------------------------------------------
router.post('/attendance/checkin', requireAdmin, (req, res) => {
  try {
    const code = clean(req.body.ticket_code).toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Ticket code is required' });
    }

    const reg = db.prepare(`
      SELECT registrations.*, events.name AS event_name
      FROM registrations
      JOIN events ON registrations.event_id = events.id
      WHERE registrations.ticket_code = ?
    `).get(code);

    if (!reg) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // If the admin selected an event, the ticket must belong to it
    const eventId = Number(req.body.event_id);
    if (eventId && reg.event_id !== eventId) {
      return res.status(400).json({ error: 'This ticket is for another event: ' + reg.event_name });
    }

    if (reg.payment_status === 'pending') {
      return res.status(403).json({ error: 'Payment is not verified yet for this ticket', student_name: reg.student_name });
    }

    if (reg.attended) {
      return res.status(409).json({ error: 'Already checked in', student_name: reg.student_name });
    }

    db.prepare('UPDATE registrations SET attended = 1, attended_at = ? WHERE id = ?')
      .run(new Date().toISOString(), reg.id);

    res.json({
      message: 'Checked in',
      student_name: reg.student_name,
      event_name: reg.event_name,
      team_name: reg.team_name,
      participation: reg.participation
    });
  } catch (error) {
    console.error('Error checking in:', error.message);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

module.exports = router;