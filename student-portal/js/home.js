// ==========================================================
// student-portal/js/home.js
// Shows a preview of the first 3 upcoming events on the home page.
// Needs api-base.js to be loaded first (for API_BASE).
// ==========================================================

// The box in index.html where we show the preview cards
const homeEvents = document.getElementById('home-events');

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

// Fetch events and show only the first 3
async function loadHomeEvents() {
  try {
    const response = await fetch(`${API_BASE}/api/events`);
    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    const events = await response.json();

    if (events.length === 0) {
      homeEvents.innerHTML = '<p class="status-message">No events available at the moment.</p>';
      return;
    }

    // slice(0, 3) keeps only the first 3 events
    let cardsHtml = '';
    events.slice(0, 3).forEach(function (event) {
      cardsHtml += `
        <div class="event-card">
          <h3>${escapeHtml(event.name)}</h3>
          <p><strong>📅 Date:</strong> ${formatDate(event.date)}</p>
          <p><strong>📍 Location:</strong> ${escapeHtml(event.location)}</p>
          <p><strong>💰 Fee:</strong> ${getFeeText(event)}</p>
          <p class="event-description">${escapeHtml(event.description)}</p>
          ${registerButton(event)}
        </div>
      `;
    });

    homeEvents.innerHTML = `<div class="events-grid">${cardsHtml}</div>`;
  } catch (error) {
    console.error('Error loading events:', error);
    homeEvents.innerHTML = '<p class="status-message error">Failed to load events. Please try again.</p>';
  }
}

// Run when the page opens
loadHomeEvents();