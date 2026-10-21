// ==========================================================
// routes/events.js
// API routes for events: GET (all), GET (one), POST, DELETE
// ==========================================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');

const VALID_TYPES = ['solo', 'group', 'both'];

// Today as YYYY-MM-DD
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Is this a real date written as YYYY-MM-DD?
function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(text + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === text;
}

// GET /api/events : all events, earliest date first
router.get('/', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id : one event (used by the register page)
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error.message);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events : add a new event
router.post('/', requireAdmin, (req, res) => {
  try {
    const {
      name, date, location, description,
      participation_type, min_team_size, max_team_size,
      college, is_recommended, fee
    } = req.body;

    // 1. Required fields
    if (!name || !date || !location) {
      return res.status(400).json({ error: 'Name, date and location are required' });
    }

    // 1b. Date must be a real YYYY-MM-DD date, today or later
    if (!isValidDate(String(date))) {
      return res.status(400).json({ error: 'Date must be a valid date (YYYY-MM-DD)' });
    }
    if (String(date) < todayString()) {
      return res.status(400).json({ error: 'Event date cannot be in the past' });
    }

    // 1c. Text length limits
    if (String(name).length > 100 || String(location).length > 150 || String(description || '').length > 500) {
      return res.status(400).json({ error: 'Name (max 100), location (max 150) or description (max 500) is too long' });
    }

    // 2. Participation type
    const type = participation_type || 'solo';
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Participation type must be solo, group or both' });
    }

    // 3. Team size (group and both events only)
    let minSize = 1;
    let maxSize = 1;
    if (type !== 'solo') {
      minSize = Number(min_team_size);
      maxSize = Number(max_team_size);
      const valid = Number.isInteger(minSize) && Number.isInteger(maxSize)
                    && minSize >= 2 && maxSize >= minSize && maxSize <= 20;
      if (!valid) {
        return res.status(400).json({
          error: 'Team size must be whole numbers: minimum 2, maximum not less than minimum (up to 20)'
        });
      }
    }

    // 4. Entry fee in rupees (0 = free)
    const entryFee = Number(fee || 0);
    if (!Number.isInteger(entryFee) || entryFee < 0 || entryFee > 100000) {
      return res.status(400).json({ error: 'Fee must be a whole number of rupees (0 for free)' });
    }

    const eventCollege = college || 'All Colleges';
    const recommended = is_recommended ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO events
        (name, date, location, description, participation_type, min_team_size, max_team_size, college, is_recommended, fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, date, location, description || '', type, minSize, maxSize, eventCollege, recommended, entryFee);

    res.status(201).json({
      message: 'Event added successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error adding event:', error.message);
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// DELETE /api/events/:id : delete an event
// (its registrations and team members are removed automatically)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error.message);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;