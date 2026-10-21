// ==========================================================
// student-portal/js/events.js
// Fetches events from the backend and shows them as cards.
// Needs api-base.js to be loaded first (for API_BASE).
// ==========================================================

// The box in events.html where we show the cards
const eventsContainer = document.getElementById('events-container');

// Makes text safe before putting it into HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Turns "2025-08-15" into "15 August 2025"
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date)) return escapeHtml(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Text for the participation type
function getTypeText(event) {
  if (event.participation_type === 'group') {
    return `👥 Group (${event.min_team_size} to ${event.max_team_size} members)`;
  }
  if (event.participation_type === 'both') {
    return `🧍 Solo or 👥 Group (team of ${event.min_team_size} to ${event.max_team_size})`;
  }
  return '🧍 Solo';
}

// Text for the entry fee
function getFeeText(event) {
  return event.fee > 0 ? `₹${event.fee} per registration` : 'Free';
}

// Shows "Register Now", or "Registration Closed" for past events
function registerButton(event) {
  const today = new Date().toISOString().slice(0, 10);
  if (event.date < today) {
    return '<span class="btn-navy btn-disabled">Registration Closed</span>';
  }
  return `<a href="register.html?event_id=${event.id}" class="btn-navy">Register Now</a>`;
}

// Shows a message (loading, empty or error) inside the box
function showMessage(text, isError) {
  const errorClass = isError ? ' error' : '';
  eventsContainer.innerHTML = `<p class="status-message${errorClass}">${text}</p>`;
}

// Builds one card per event and shows the grid
function showEvents(events) {
  // Recommended events first (the date order is kept inside each group)
  events.sort(function (a, b) {
    return b.is_recommended - a.is_recommended;
  });

  let cardsHtml = '';

  events.forEach(function (event) {
    const badge = event.is_recommended
      ? '<span class="badge badge-recommended">⭐ Recommended</span>'
      : '';

    cardsHtml += `
      <div class="event-card">
        ${badge}
        <h3>${escapeHtml(event.name)}</h3>
        <p><strong>📅 Date:</strong> ${formatDate(event.date)}</p>
        <p><strong>📍 Location:</strong> ${escapeHtml(event.location)}</p>
        <p><strong>🎯 Type:</strong> ${getTypeText(event)}</p>
        <p><strong>💰 Fee:</strong> ${getFeeText(event)}</p>
        <p><strong>🏛️ Open to:</strong> ${escapeHtml(event.college)}</p>
        <p class="event-description">${escapeHtml(event.description)}</p>
        ${registerButton(event)}
      </div>
    `;
  });

  eventsContainer.innerHTML = `<div class="events-grid">${cardsHtml}</div>`;
}

// Main function: fetch events from the API
async function loadEvents() {
  showMessage('Loading events...', false);

  try {
    const response = await fetch(`${API_BASE}/api/events`);

    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    const events = await response.json();

    if (events.length === 0) {
      showMessage('No events available at the moment.', false);
    } else {
      showEvents(events);
    }
  } catch (error) {
    console.error('Error loading events:', error);
    showMessage('Failed to load events. Please try again.', true);
  }
}

// Run when the page opens
loadEvents();