let dashboardEvents = [];
let dashboardRegistrations = [];

function dashboardPaymentCount(status) {
  return dashboardRegistrations.filter(function (registration) {
    return registration.event_fee > 0 && registration.payment_status === status;
  }).length;
}

function updateDashboardStats() {
  document.getElementById('stat-events').textContent = dashboardEvents.length;
  document.getElementById('stat-registrations').textContent = dashboardRegistrations.length;
  document.getElementById('stat-departments').textContent = new Set(
    dashboardRegistrations.map(function (registration) { return registration.department; })
  ).size;
  document.getElementById('stat-pending').textContent = dashboardPaymentCount('pending');
  document.getElementById('stat-present').textContent = dashboardRegistrations.filter(function (r) {
    return r.attended;
  }).length;
}

function registrationsForEvent(eventId) {
  return dashboardRegistrations.filter(function (registration) {
    return registration.event_id === eventId;
  });
}

function renderDashboardEvents() {
  const body = document.getElementById('events-body');
  if (!dashboardEvents.length) {
    body.innerHTML = '<tr><td colspan="9" class="status-message">No events yet.</td></tr>';
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  body.innerHTML = dashboardEvents.map(function (event, index) {
    const registrations = registrationsForEvent(event.id);
    const paid = registrations.filter(function (r) { return r.payment_status === 'paid'; }).length;
    const pending = registrations.filter(function (r) { return r.payment_status === 'pending'; }).length;
    const payment = event.fee > 0 ? `${paid} / ${pending}` : '—';
    const past = event.date < today ? '<span class="past-badge">Past</span>' : '';
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(event.name)} ${past}</td>
      <td>${formatDate(event.date)}</td>
      <td>${escapeHtml(getTypeText(event))}</td>
      <td>${escapeHtml(getFeeText(event))}</td>
      <td>${registrations.length}</td>
      <td>${payment}</td>
      <td>${registrations.filter(function (r) { return r.attended; }).length}</td>
      <td class="action-group">
        <a class="btn-small" href="registrations.html?event_id=${event.id}">Registrations</a>
        ${event.fee > 0
          ? `<a class="btn-small" href="payments.html?event_id=${event.id}">Payments</a>`
          : '<span class="btn-small disabled-link">Payments</span>'}
        <a class="btn-small" href="attendance.html?event_id=${event.id}">Attendance</a>
      </td>
    </tr>`;
  }).join('');
}

async function loadDashboard() {
  const body = document.getElementById('events-body');
  try {
    const [eventsResponse, registrationsResponse] = await Promise.all([
      adminFetch(`${API_BASE}/api/events`),
      adminFetch(`${API_BASE}/api/registrations`)
    ]);
    if (!eventsResponse.ok || !registrationsResponse.ok) throw new Error('Server error');
    dashboardEvents = await eventsResponse.json();
    dashboardRegistrations = await registrationsResponse.json();
    updateDashboardStats();
    renderDashboardEvents();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    body.innerHTML = '<tr><td colspan="9" class="status-message error">Failed to load dashboard data.</td></tr>';
  }
}

loadDashboard();
