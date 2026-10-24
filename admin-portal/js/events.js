const eventForm = document.getElementById('add-event-form');
const eventsBody = document.getElementById('events-body');
const eventType = document.getElementById('event-type');
const collegeSelect = document.getElementById('event-college');
const eventDate = document.getElementById('event-date');
const addMessage = document.getElementById('add-message');

eventDate.min = new Date().toISOString().slice(0, 10);
COLLEGES.forEach(function (college) {
  const option = document.createElement('option');
  option.value = college;
  option.textContent = college;
  collegeSelect.appendChild(option);
});

function toggleTeamFields() {
  document.querySelectorAll('.team-size-field').forEach(function (field) {
    field.classList.toggle('hidden', eventType.value === 'solo');
  });
}

eventType.addEventListener('change', toggleTeamFields);
toggleTeamFields();

async function loadEvents() {
  try {
    const response = await adminFetch(`${API_BASE}/api/events`);
    if (!response.ok) throw new Error('Failed to load events');
    const events = await response.json();
    if (!events.length) {
      eventsBody.innerHTML = '<tr><td colspan="9" class="status-message">No events yet.</td></tr>';
      return;
    }
    eventsBody.innerHTML = events.map(function (event, index) {
      return `<tr>
        <td>${index + 1}</td><td>${escapeHtml(event.name)}</td><td>${formatDate(event.date)}</td>
        <td>${escapeHtml(event.location)}</td><td>${escapeHtml(getTypeText(event))}</td>
        <td>${escapeHtml(getFeeText(event))}</td><td>${escapeHtml(event.college)}</td>
        <td>${event.is_recommended ? '⭐ Yes' : '—'}</td>
        <td><button class="btn-delete" data-id="${event.id}">Delete</button></td>
      </tr>`;
    }).join('');
  } catch (error) {
    console.error('Error loading events:', error);
    eventsBody.innerHTML = '<tr><td colspan="9" class="status-message error">Failed to load events.</td></tr>';
  }
}

eventForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  addMessage.classList.add('hidden');
  const type = eventType.value;
  const payload = {
    name: document.getElementById('event-name').value.trim(),
    date: eventDate.value,
    location: document.getElementById('event-location').value.trim(),
    description: document.getElementById('event-description').value.trim(),
    participation_type: type,
    min_team_size: type === 'solo' ? 1 : Number(document.getElementById('event-min-team').value),
    max_team_size: type === 'solo' ? 1 : Number(document.getElementById('event-max-team').value),
    college: collegeSelect.value,
    is_recommended: document.getElementById('event-recommended').checked,
    fee: Number(document.getElementById('event-fee').value || 0)
  };
  if (!payload.name || !payload.date || !payload.location) {
    showMessage(addMessage, 'Event name, date and location are required.', true);
    return;
  }
  if (!Number.isInteger(payload.fee) || payload.fee < 0) {
    showMessage(addMessage, 'Entry fee must be a whole number.', true);
    return;
  }
  if (type !== 'solo' && (!Number.isInteger(payload.min_team_size)
      || !Number.isInteger(payload.max_team_size)
      || payload.min_team_size < 2 || payload.max_team_size < payload.min_team_size
      || payload.max_team_size > 20)) {
    showMessage(addMessage, 'Team size must be between 2 and 20.', true);
    return;
  }
  try {
    const response = await adminFetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add event');
    showMessage(addMessage, 'Event added successfully.', false);
    eventForm.reset();
    toggleTeamFields();
    await loadEvents();
  } catch (error) {
    showMessage(addMessage, error.message, true);
  }
});

eventsBody.addEventListener('click', async function (event) {
  const button = event.target.closest('button[data-id]');
  if (!button || !window.confirm('Are you sure? This also deletes all registrations of this event.')) return;
  try {
    const response = await adminFetch(`${API_BASE}/api/events/${button.dataset.id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete event');
    await loadEvents();
  } catch (error) {
    showMessage(addMessage, error.message, true);
  }
});

loadEvents();
