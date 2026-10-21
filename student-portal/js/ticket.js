// ==========================================================
// student-portal/js/ticket.js
// Shows one ticket with its QR code (ticket.html?code=...)
// or a "find my ticket" form (ticket.html).
// Needs api-base.js loaded first (API_BASE).
// ==========================================================

const loadingText = document.getElementById('loading-text');
const ticketView = document.getElementById('ticket-view');
const lookupView = document.getElementById('lookup-view');

// Shortcut: put text into an element by its id (safe from HTML injection)
function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// Turns "2025-08-15" into "15 August 2025"
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ----------------------------------------------------------
// VIEW 1: show one ticket
// ----------------------------------------------------------
function renderTicket(t) {
  setText('t-event', t.event_name);
  setText('t-datetime', '📅 ' + formatDate(t.event_date));
  setText('t-code', t.ticket_code);
  setText('t-name', t.student_name);
  setText('t-enroll', t.enrollment_no);
  setText('t-college', t.college);
  setText('t-branch', `${t.branch} • Division ${t.division}`);
  setText('t-location', t.event_location);
  setText('t-type', t.participation === 'group' ? `Group: ${t.team_name}` : 'Solo');

  document.getElementById('t-qr').src = t.qr;

  const download = document.getElementById('t-download');
  download.href = t.qr;
  download.download = t.ticket_code + '.png';

  // Team members (group tickets)
  const list = document.getElementById('t-members');
  list.innerHTML = '';
  if (t.team_members.length > 0) {
    document.getElementById('t-members-wrap').classList.remove('hidden');
    t.team_members.forEach(function (m) {
      const li = document.createElement('li');
      li.textContent = `${m.member_name} (${m.enrollment_no})`;
      list.appendChild(li);
    });
  }

  // Status bar at the bottom of the ticket
  const status = document.getElementById('t-status');
  if (t.attended) {
    status.className = 'ticket-status status-attended';
    status.textContent = '✅ Checked in';
  } else if (t.payment_status === 'pending') {
    status.className = 'ticket-status status-pending';
    status.textContent = `⏳ Payment pending (₹${t.fee}). Entry is allowed after the organizer verifies your payment.`;
  } else if (t.payment_status === 'paid') {
    status.className = 'ticket-status status-paid';
    status.textContent = `✅ Payment verified (₹${t.fee}). Show this QR at the entry.`;
  } else {
    status.className = 'ticket-status status-free';
    status.textContent = '✅ Free entry. Show this QR at the entry.';
  }

  loadingText.classList.add('hidden');
  ticketView.classList.remove('hidden');
}

async function loadTicket(code) {
  try {
    const response = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(code)}`);

    if (response.status === 404) {
      loadingText.textContent = 'Ticket not found. Check the code, or use "Find My Ticket".';
      loadingText.classList.add('error');
      return;
    }
    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    renderTicket(await response.json());
  } catch (error) {
    console.error('Error loading ticket:', error);
    loadingText.textContent = 'Failed to load the ticket. Please try again.';
    loadingText.classList.add('error');
  }
}

// ----------------------------------------------------------
// VIEW 2: find my ticket (enrollment number + email)
// ----------------------------------------------------------
function showLookup() {
  loadingText.classList.add('hidden');
  lookupView.classList.remove('hidden');
}

document.getElementById('lookup-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const errorBox = document.getElementById('lookup-error');
  const results = document.getElementById('lookup-results');
  const enrollmentNo = document.getElementById('lookup-enroll').value.trim();
  const email = document.getElementById('lookup-email').value.trim().toLowerCase();

  errorBox.classList.add('hidden');
  results.innerHTML = '';

  if (!enrollmentNo || !email) {
    errorBox.textContent = 'Enter your enrollment number and college email.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const url = `${API_BASE}/api/tickets/lookup?enrollment_no=${encodeURIComponent(enrollmentNo)}&email=${encodeURIComponent(email)}`;
    const response = await fetch(url);
    const tickets = await response.json();

    if (!response.ok) {
      throw new Error(tickets.error || 'Server error');
    }

    if (tickets.length === 0) {
      errorBox.textContent = 'No tickets found for these details. (Team members: ask your team leader for the ticket.)';
      errorBox.classList.remove('hidden');
      return;
    }

    tickets.forEach(function (t) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = 'ticket.html?code=' + encodeURIComponent(t.ticket_code);
      link.textContent = `${t.event_name} (${formatDate(t.event_date)}) • ${t.ticket_code}`;
      li.appendChild(link);
      results.appendChild(li);
    });
  } catch (error) {
    console.error('Error finding tickets:', error);
    errorBox.textContent = 'Could not find tickets. Please try again.';
    errorBox.classList.remove('hidden');
  }
});

// ----------------------------------------------------------
// Start: show the ticket if the URL has ?code=..., else the finder
// ----------------------------------------------------------
const ticketCode = new URLSearchParams(window.location.search).get('code');

if (ticketCode) {
  loadTicket(ticketCode);
} else {
  showLookup();
}