let eventRegistrations = [];
let currentEventId = null;

function eventTabUrl(page) {
  return `${page}.html?event_id=${currentEventId}`;
}

function setupTabs() {
  document.getElementById('registrations-tab').href = eventTabUrl('registrations');
  document.getElementById('payments-tab').href = eventTabUrl('payments');
  document.getElementById('attendance-tab').href = eventTabUrl('attendance');
}

function renderRegistrationParticipation(registration) {
  let html = escapeHtml(getParticipationText(registration));
  if (registration.team_members && registration.team_members.length) {
    registration.team_members.forEach(function (member) {
      html += `<span class="team-list">👤 ${escapeHtml(member.member_name)} (${escapeHtml(member.enrollment_no)})</span>`;
    });
  }
  return html;
}

function renderRegistrations() {
  const body = document.getElementById('registrations-body');
  const search = document.getElementById('registration-search').value.trim().toLowerCase();
  const filtered = eventRegistrations.filter(function (registration) {
    return [registration.student_name, registration.enrollment_no, registration.ticket_code]
      .some(function (value) { return String(value).toLowerCase().includes(search); });
  });
  document.getElementById('registration-count').textContent =
    `${filtered.length} registration${filtered.length === 1 ? '' : 's'}`;
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="13" class="status-message">${
      eventRegistrations.length ? 'No registrations match your search.' : 'No registrations for this event yet.'
    }</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map(function (registration, index) {
    const attendance = registration.attended
      ? `Present (${new Date(registration.attended_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`
      : 'Absent';
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(registration.student_name)}</td>
      <td>${escapeHtml(registration.enrollment_no)}</td>
      <td>${escapeHtml(registration.email)}</td>
      <td>${escapeHtml(registration.phone)}</td>
      <td>${escapeHtml(registration.college)}</td>
      <td>${escapeHtml(registration.department)}</td>
      <td>${escapeHtml(registration.branch)}</td>
      <td>${escapeHtml(registration.division)}</td>
      <td>${renderRegistrationParticipation(registration)}</td>
      <td class="ticket-code-text">${escapeHtml(registration.ticket_code)}</td>
      <td>${escapeHtml(getPaymentText(registration))}</td>
      <td>${escapeHtml(attendance)}</td>
    </tr>`;
  }).join('');
}

async function loadRegistrations() {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations?event_id=${currentEventId}`);
    if (!response.ok) throw new Error('Failed to load registrations');
    eventRegistrations = await response.json();
    renderRegistrations();
  } catch (error) {
    console.error('Error loading registrations:', error);
    document.getElementById('registrations-body').innerHTML =
      '<tr><td colspan="13" class="status-message error">Failed to load registrations.</td></tr>';
  }
}

async function start() {
  const context = await loadEventPage('Registrations');
  if (!context) return;
  currentEventId = context.eventId;
  setupTabs();
  document.getElementById('registration-search').addEventListener('input', renderRegistrations);
  document.getElementById('refresh-btn').addEventListener('click', loadRegistrations);
  await loadRegistrations();
}

start();
