// ==========================================================
// admin-portal/js/dashboard.js
// Admin actions: stats, add/delete events, registrations,
// payment verification and attendance.
// Needs api-base.js (API_BASE) and auth.js (isAdminLoggedIn).
// ==========================================================

// IMPORTANT: keep this list the same as COLLEGES in student-portal/js/register.js
const COLLEGES = [
  'Silver Oak College of Engineering & Technology',
  'Aditya Silver Oak Institute of Technology',
  'Silver Oak Institute of Management',
  'Silver Oak Institute of Design',
  'Silver Oak Law College',
  'Silver Oak College of Nursing',
  'Silver Oak College of Physiotherapy'
];

// ---------- Elements ----------
const eventsBody = document.getElementById('events-body');
const registrationsBody = document.getElementById('registrations-body');
const addEventForm = document.getElementById('add-event-form');
const addSuccess = document.getElementById('add-success');
const addError = document.getElementById('add-error');
const addBtn = document.getElementById('add-btn');
const typeSelect = document.getElementById('event-type');
const collegeSelect = document.getElementById('event-college');

const attForm = document.getElementById('att-form');
const attEvent = document.getElementById('att-event');
const attCode = document.getElementById('att-code');
const attMessage = document.getElementById('att-message');
const attSummary = document.getElementById('att-summary');
const attBody = document.getElementById('att-body');

// ---------- Data kept in memory after each load ----------
let allEvents = [];
let allRegistrations = [];

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date)) return escapeHtml(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTypeText(event) {
  if (event.participation_type === 'group') {
    return `Group (${event.min_team_size}-${event.max_team_size})`;
  }
  if (event.participation_type === 'both') {
    return `Solo / Group (${event.min_team_size}-${event.max_team_size})`;
  }
  return 'Solo';
}

// "Solo", or "Group: TeamName" with the members listed below
function participationCell(r) {
  if (r.participation !== 'group') {
    return 'Solo';
  }
  let html = `Group: <strong>${escapeHtml(r.team_name)}</strong>`;
  r.team_members.forEach(function (m) {
    html += `<span class="team-list">👤 ${escapeHtml(m.member_name)} (${escapeHtml(m.enrollment_no)})</span>`;
  });
  return html;
}

// Payment text and the Mark Paid / Undo button (registrations table)
function paymentCell(r) {
  if (r.payment_status === 'free') {
    return 'Free';
  }
  const ref = `<span class="team-list">UTR: ${escapeHtml(r.payment_ref)}</span>`;

  if (r.payment_status === 'paid') {
    return `<span class="pay-paid">✅ Paid</span>${ref}
            <button class="btn-small danger" data-action="unpaid" data-id="${r.id}">Undo</button>`;
  }
  return `<span class="pay-pending">⏳ Pending (₹${r.event_fee})</span>${ref}
          <button class="btn-small" data-action="paid" data-id="${r.id}">Mark Paid</button>`;
}

// Short payment text (attendance table)
function paymentShort(r) {
  if (r.payment_status === 'free') return 'Free';
  if (r.payment_status === 'paid') return '<span class="pay-paid">✅ Paid</span>';
  return '<span class="pay-pending">⏳ Pending</span>';
}

// ----------------------------------------------------------
// ADD EVENT FORM: college list + show/hide team size fields
// ----------------------------------------------------------
COLLEGES.forEach(function (college) {
  const option = document.createElement('option');
  option.value = college;
  option.textContent = college;
  collegeSelect.appendChild(option);
});

function toggleTeamFields() {
  const showTeamSize = typeSelect.value !== 'solo';
  document.querySelectorAll('.team-size-field').forEach(function (field) {
    field.classList.toggle('hidden', !showTeamSize);
  });
}

typeSelect.addEventListener('change', toggleTeamFields);
toggleTeamFields();

// ----------------------------------------------------------
// SECTION 1: Stat cards
// ----------------------------------------------------------
function updateStats() {
  document.getElementById('stat-events').textContent = allEvents.length;
  document.getElementById('stat-registrations').textContent = allRegistrations.length;

  const departments = new Set(allRegistrations.map(function (r) {
    return r.department.toLowerCase();
  }));
  document.getElementById('stat-departments').textContent = departments.size;
}

// ----------------------------------------------------------
// SECTION 3: Manage Events table
// ----------------------------------------------------------
function showEventsTable() {
  if (allEvents.length === 0) {
    eventsBody.innerHTML = '<tr><td colspan="9" class="status-message">No events yet.</td></tr>';
    return;
  }

  let rowsHtml = '';
  allEvents.forEach(function (event, index) {
    rowsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(event.name)}</td>
        <td>${formatDate(event.date)}</td>
        <td>${escapeHtml(event.location)}</td>
        <td>${getTypeText(event)}</td>
        <td>${event.fee > 0 ? '₹' + event.fee : 'Free'}</td>
        <td>${escapeHtml(event.college)}</td>
        <td>${event.is_recommended ? '⭐ Yes' : '—'}</td>
        <td><button class="btn-delete" data-id="${event.id}">Delete</button></td>
      </tr>
    `;
  });
  eventsBody.innerHTML = rowsHtml;
}

// ----------------------------------------------------------
// SECTION 4: Registrations table
// ----------------------------------------------------------
function showRegistrationsTable() {
  if (allRegistrations.length === 0) {
    registrationsBody.innerHTML = '<tr><td colspan="13" class="status-message">No registrations yet.</td></tr>';
    return;
  }

  let rowsHtml = '';
  allRegistrations.forEach(function (r, index) {
    rowsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(r.student_name)}</td>
        <td>${escapeHtml(r.enrollment_no)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.college)}</td>
        <td>${escapeHtml(r.department)}</td>
        <td>${escapeHtml(r.branch)}</td>
        <td>${escapeHtml(r.division)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.event_name)}</td>
        <td>${participationCell(r)}</td>
        <td class="ticket-code-text">${escapeHtml(r.ticket_code)}</td>
        <td>${paymentCell(r)}</td>
      </tr>
    `;
  });
  registrationsBody.innerHTML = rowsHtml;
}

// ----------------------------------------------------------
// SECTION 5: Attendance
// ----------------------------------------------------------

// Fill the event dropdown (keeps the current choice after a refresh)
function fillAttendanceEvents() {
  const previous = attEvent.value;
  attEvent.innerHTML = '<option value="">-- Select Event --</option>';

  allEvents.forEach(function (event) {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = event.name;
    attEvent.appendChild(option);
  });

  if (allEvents.some(function (e) { return String(e.id) === previous; })) {
    attEvent.value = previous;
  }
}

// Draw the attendance list of the selected event
function renderAttendance() {
  const eventId = Number(attEvent.value);

  if (!eventId) {
    attSummary.textContent = '';
    attBody.innerHTML = '<tr><td colspan="7" class="status-message">Select an event to see its attendance list.</td></tr>';
    return;
  }

  const list = allRegistrations.filter(function (r) { return r.event_id === eventId; });
  const present = list.filter(function (r) { return r.attended; }).length;
  const pending = list.filter(function (r) { return r.payment_status === 'pending'; }).length;

  attSummary.textContent = `Registered: ${list.length}  |  Present: ${present}  |  Absent: ${list.length - present}`
    + (pending > 0 ? `  |  Payment pending: ${pending}` : '');

  if (list.length === 0) {
    attBody.innerHTML = '<tr><td colspan="7" class="status-message">No registrations for this event yet.</td></tr>';
    return;
  }

  let rowsHtml = '';
  list.forEach(function (r, index) {
    let attendanceText = '—';
    if (r.attended) {
      const time = new Date(r.attended_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      attendanceText = `<span class="att-present">✅ Present (${time})</span>`;
    }

    let button;
    if (r.payment_status === 'pending') {
      button = '<button class="btn-small" disabled title="Verify the payment first">Mark Present</button>';
    } else if (r.attended) {
      button = `<button class="btn-small danger" data-action="absent" data-id="${r.id}">Mark Absent</button>`;
    } else {
      button = `<button class="btn-small" data-action="present" data-id="${r.id}">Mark Present</button>`;
    }

    rowsHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(r.student_name)}${r.participation === 'group' ? '<span class="team-list">Team: ' + escapeHtml(r.team_name) + '</span>' : ''}</td>
        <td>${escapeHtml(r.enrollment_no)}</td>
        <td class="ticket-code-text">${escapeHtml(r.ticket_code)}</td>
        <td>${paymentShort(r)}</td>
        <td>${attendanceText}</td>
        <td>${button}</td>
      </tr>
    `;
  });
  attBody.innerHTML = rowsHtml;
}

// Shows the result of a check-in above the form
function showAttMessage(text, isError) {
  attMessage.className = isError ? 'error-box' : 'success-box';
  attMessage.textContent = text;

  setTimeout(function () {
    attMessage.className = 'hidden';
  }, 5000);
}

attEvent.addEventListener('change', renderAttendance);

// Check-in by ticket code (typed, or typed by a QR scanner + Enter)
attForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const code = attCode.value.trim();
  if (!code) {
    showAttMessage('❌ Enter or scan a ticket code.', true);
    return;
  }

  try {
    const response = await adminFetch(`${API_BASE}/api/attendance/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_code: code, event_id: Number(attEvent.value) || null })
    });
    const data = await response.json();

    if (!response.ok) {
      const who = data.student_name ? ` (${data.student_name})` : '';
      showAttMessage('❌ ' + (data.error || 'Check-in failed') + who, true);
    } else {
      showAttMessage(`✅ ${data.student_name} checked in for ${data.event_name}`, false);
      loadDashboard();
    }
  } catch (error) {
    console.error('Error checking in:', error);
    showAttMessage('❌ Could not connect to the server.', true);
  }

  // Ready for the next scan
  attCode.value = '';
  attCode.focus();
});

// ----------------------------------------------------------
// Payment and attendance buttons (one listener per table)
// ----------------------------------------------------------
async function sendUpdate(id, kind, body) {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations/${id}/${kind}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Update failed.');
      return;
    }
    loadDashboard();
  } catch (error) {
    console.error('Error updating:', error);
    alert('Could not connect to the server. Please try again.');
  }
}

registrationsBody.addEventListener('click', function (e) {
  const button = e.target.closest('button');
  if (!button || !button.dataset.action) return;

  const status = button.dataset.action === 'paid' ? 'paid' : 'pending';
  sendUpdate(button.dataset.id, 'payment', { status: status });
});

attBody.addEventListener('click', function (e) {
  const button = e.target.closest('button');
  if (!button || !button.dataset.action) return;

  sendUpdate(button.dataset.id, 'attendance', { attended: button.dataset.action === 'present' });
});

// ----------------------------------------------------------
// Fetch events + registrations, then refresh the whole page
// ----------------------------------------------------------
async function loadDashboard() {
  try {
    const [eventsResponse, registrationsResponse] = await Promise.all([
      adminFetch(`${API_BASE}/api/events`),
      adminFetch(`${API_BASE}/api/registrations`)
    ]);

    if (!eventsResponse.ok || !registrationsResponse.ok) {
      throw new Error('Server error');
    }

    allEvents = await eventsResponse.json();
    allRegistrations = await registrationsResponse.json();

    updateStats();
    showEventsTable();
    showRegistrationsTable();
    fillAttendanceEvents();
    renderAttendance();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    eventsBody.innerHTML = '<tr><td colspan="9" class="status-message error">Failed to load events. Please try again.</td></tr>';
    registrationsBody.innerHTML = '<tr><td colspan="13" class="status-message error">Failed to load registrations. Please try again.</td></tr>';
  }
}

// ----------------------------------------------------------
// SECTION 2: Add a new event
// ----------------------------------------------------------
addEventForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  addSuccess.classList.add('hidden');
  addError.classList.add('hidden');

  const type = typeSelect.value;

  const newEvent = {
    name: document.getElementById('event-name').value.trim(),
    date: document.getElementById('event-date').value,
    location: document.getElementById('event-location').value.trim(),
    description: document.getElementById('event-description').value.trim(),
    participation_type: type,
    min_team_size: type === 'solo' ? 1 : Number(document.getElementById('event-min-team').value),
    max_team_size: type === 'solo' ? 1 : Number(document.getElementById('event-max-team').value),
    college: collegeSelect.value,
    is_recommended: document.getElementById('event-recommended').checked,
    fee: Number(document.getElementById('event-fee').value || 0)
  };

  if (!newEvent.name || !newEvent.date || !newEvent.location) {
    addError.textContent = 'Event name, date and location are required.';
    addError.classList.remove('hidden');
    return;
  }

  if (!Number.isInteger(newEvent.fee) || newEvent.fee < 0) {
    addError.textContent = 'Entry fee must be a whole number of rupees (0 for free).';
    addError.classList.remove('hidden');
    return;
  }

  if (type !== 'solo') {
    const min = newEvent.min_team_size;
    const max = newEvent.max_team_size;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 2 || max < min || max > 20) {
      addError.textContent = 'Team size: minimum must be at least 2, and maximum cannot be less than minimum (up to 20).';
      addError.classList.remove('hidden');
      return;
    }
  }

  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  try {
    const response = await adminFetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    });

    const data = await response.json();

    if (!response.ok) {
      addError.textContent = data.error || 'Failed to add event.';
      addError.classList.remove('hidden');
    } else {
      addSuccess.textContent = '✅ Event added successfully!';
      addSuccess.classList.remove('hidden');
      addEventForm.reset();
      toggleTeamFields();
      loadDashboard();

      setTimeout(function () {
        addSuccess.classList.add('hidden');
      }, 3000);
    }
  } catch (error) {
    console.error('Error adding event:', error);
    addError.textContent = 'Could not connect to the server. Please try again.';
    addError.classList.remove('hidden');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add Event';
  }
});

// ----------------------------------------------------------
// SECTION 3: Delete an event
// ----------------------------------------------------------
eventsBody.addEventListener('click', async function (e) {
  if (!e.target.classList.contains('btn-delete')) return;

  const eventId = e.target.dataset.id;

  if (!confirm('Are you sure?')) return;

  try {
    const response = await adminFetch(`${API_BASE}/api/events/${eventId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Delete failed: ' + response.status);
    }

    loadDashboard();
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete the event. Please try again.');
  }
});

// ----------------------------------------------------------
// Run when the page opens (only if the admin is logged in)
// ----------------------------------------------------------
if (isAdminLoggedIn()) {
  loadDashboard();
}