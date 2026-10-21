// ==========================================================
// routes/tickets.js
// Ticket routes for students:
//   GET /api/tickets/lookup?enrollment_no=...&email=...
//   GET /api/tickets/:code  (ticket details + QR code image)
// ==========================================================

const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();
const db = require('../database');
const rateLimit = require('../middleware/rateLimit');

// ----------------------------------------------------------
// Find all tickets of one student (enrollment number + email)
// This must come BEFORE the /:code route
// ----------------------------------------------------------
router.get('/lookup', rateLimit(30, 15 * 60 * 1000), (req, res) => {
  try {
    const enrollmentNo = String(req.query.enrollment_no || '').trim();
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!enrollmentNo || !email) {
      return res.status(400).json({ error: 'Enrollment number and email are required' });
    }

    const tickets = db.prepare(`
      SELECT registrations.ticket_code, registrations.payment_status, registrations.attended,
             events.name AS event_name, events.date AS event_date
      FROM registrations
      JOIN events ON registrations.event_id = events.id
      WHERE registrations.enrollment_no = ? AND registrations.email = ?
      ORDER BY registrations.id DESC
    `).all(enrollmentNo, email);

    res.json(tickets);
  } catch (error) {
    console.error('Error looking up tickets:', error.message);
    res.status(500).json({ error: 'Failed to find tickets' });
  }
});

// ----------------------------------------------------------
// One ticket by its code, with the QR code as an image
// ----------------------------------------------------------
router.get('/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();

    const ticket = db.prepare(`
      SELECT registrations.*,
             events.name AS event_name, events.date AS event_date,
             events.location AS event_location, events.fee AS event_fee
      FROM registrations
      JOIN events ON registrations.event_id = events.id
      WHERE registrations.ticket_code = ?
    `).get(code);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const members = db
      .prepare('SELECT member_name, enrollment_no FROM team_members WHERE registration_id = ? ORDER BY id')
      .all(ticket.id);

    // The QR code contains only the ticket code
    const qr = await QRCode.toDataURL(ticket.ticket_code, { width: 300, margin: 2 });

    // Send only what the ticket page needs (no phone, email or UTR)
    res.json({
      ticket_code: ticket.ticket_code,
      student_name: ticket.student_name,
      enrollment_no: ticket.enrollment_no,
      college: ticket.college,
      branch: ticket.branch,
      division: ticket.division,
      participation: ticket.participation,
      team_name: ticket.team_name,
      team_members: members,
      event_name: ticket.event_name,
      event_date: ticket.event_date,
      event_location: ticket.event_location,
      fee: ticket.event_fee,
      payment_status: ticket.payment_status,
      attended: ticket.attended,
      registered_at: ticket.registered_at,
      qr: qr
    });
  } catch (error) {
    console.error('Error fetching ticket:', error.message);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

module.exports = router;