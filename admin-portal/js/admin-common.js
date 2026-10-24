// Shared helpers for protected admin pages.

const COLLEGES = [
  'Silver Oak College of Engineering & Technology',
  'Aditya Silver Oak Institute of Technology',
  'Silver Oak Institute of Management',
  'Silver Oak Institute of Design',
  'Silver Oak Law College',
  'Silver Oak College of Nursing',
  'Silver Oak College of Physiotherapy'
];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text === undefined || text === null ? '' : String(text);
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(String(dateString) + 'T00:00:00');
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

function getFeeText(event) {
  return Number(event.fee) > 0 ? `₹${Number(event.fee)}` : 'Free';
}

function getParticipationText(registration) {
  if (registration.participation !== 'group') return 'Solo';
  return `Group: ${registration.team_name || 'Unnamed team'}`;
}

function getPaymentText(registration) {
  if (registration.payment_status === 'free') return 'Free';
  return registration.payment_status === 'paid' ? 'Paid' : 'Pending';
}

function showMessage(element, text, isError) {
  element.textContent = text;
  element.className = isError ? 'error-box' : 'success-box';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
}

function showPageError(message) {
  const target = document.getElementById('page-message');
  if (!target) return;
  target.innerHTML = `<div class="error-box" role="status" aria-live="polite">${escapeHtml(message)}</div>
    <a class="btn-admin" href="dashboard.html">Back to Dashboard</a>`;
}

function getRequestedEventId() {
  const value = new URLSearchParams(window.location.search).get('event_id');
  const eventId = Number(value);
  return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

function populateEventPicker(events, eventId) {
  const picker = document.getElementById('event-picker');
  if (!picker) return;
  picker.innerHTML = '<option value="">Choose an event</option>';
  events.forEach(function (event) {
    const option = document.createElement('option');
    option.value = event.id;
    option.textContent = event.name;
    picker.appendChild(option);
  });
  picker.value = String(eventId);
  picker.addEventListener('change', function () {
    if (picker.value) window.location.href = `${window.location.pathname}?event_id=${picker.value}`;
  });
}

function renderEventHeader(event, pageName) {
  document.getElementById('event-breadcrumb').innerHTML =
    `Dashboard &rsaquo; ${escapeHtml(event.name)} &rsaquo; ${escapeHtml(pageName)}`;
  document.getElementById('event-info').textContent =
    `${formatDate(event.date)} · ${event.location} · ${getTypeText(event)} · ${getFeeText(event)} · Open to ${event.college}`;
}

async function loadEventPage(pageName) {
  const eventId = getRequestedEventId();
  if (!eventId) {
    showPageError('Choose an event from the dashboard to open this page.');
    return null;
  }

  try {
    const [eventResponse, eventsResponse] = await Promise.all([
      adminFetch(`${API_BASE}/api/events/${eventId}`),
      adminFetch(`${API_BASE}/api/events`)
    ]);
    if (eventResponse.status === 404) {
      showPageError('Event not found.');
      return null;
    }
    if (!eventResponse.ok || !eventsResponse.ok) throw new Error('Failed to load event');
    const event = await eventResponse.json();
    const events = await eventsResponse.json();
    populateEventPicker(events, eventId);
    renderEventHeader(event, pageName);
    return { event, events, eventId };
  } catch (error) {
    console.error('Error loading event page:', error);
    showPageError('Could not load this event. Please try again.');
    return null;
  }
}
