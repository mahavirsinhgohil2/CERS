let attendanceEventId = null;
let attendanceRegistrations = [];

function attendanceTabUrl(page) {
  return `${page}.html?event_id=${attendanceEventId}`;
}

function setupAttendanceTabs() {
  document.getElementById('registrations-tab').href = attendanceTabUrl('registrations');
  document.getElementById('payments-tab').href = attendanceTabUrl('payments');
  document.getElementById('attendance-tab').href = attendanceTabUrl('attendance');
}

function renderAttendanceSummary() {
  document.getElementById('summary-registered').textContent = attendanceRegistrations.length;
  document.getElementById('summary-present').textContent = attendanceRegistrations.filter(function (r) { return r.attended; }).length;
  document.getElementById('summary-absent').textContent = attendanceRegistrations.filter(function (r) { return !r.attended; }).length;
  document.getElementById('summary-pending').textContent = attendanceRegistrations.filter(function (r) {
    return r.payment_status === 'pending';
  }).length;
}

function renderAttendance() {
  const body = document.getElementById('attendance-body');
  if (!attendanceRegistrations.length) {
    body.innerHTML = '<tr><td colspan="7" class="status-message">No registrations for this event yet.</td></tr>';
    return;
  }
  body.innerHTML = attendanceRegistrations.map(function (registration, index) {
    const attendance = registration.attended
      ? `Present (${new Date(registration.attended_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`
      : 'Absent';
    let action;
    if (registration.payment_status === 'pending') {
      action = '<button class="btn-small" disabled title="Verify the payment first">Mark Present</button>';
    } else if (registration.attended) {
      action = `<button class="btn-small danger" data-id="${registration.id}" data-attended="false">Mark Absent</button>`;
    } else {
      action = `<button class="btn-small" data-id="${registration.id}" data-attended="true">Mark Present</button>`;
    }
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(registration.student_name)}${registration.team_name ? `<span class="team-list">${escapeHtml(registration.team_name)}</span>` : ''}</td>
      <td>${escapeHtml(registration.enrollment_no)}</td>
      <td class="ticket-code-text">${escapeHtml(registration.ticket_code)}</td>
      <td>${escapeHtml(getPaymentText(registration))}</td>
      <td>${escapeHtml(attendance)}</td>
      <td>${action}</td>
    </tr>`;
  }).join('');
}

async function loadAttendance() {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations?event_id=${attendanceEventId}`);
    if (!response.ok) throw new Error('Failed to load attendance');
    attendanceRegistrations = await response.json();
    renderAttendanceSummary();
    renderAttendance();
  } catch (error) {
    console.error('Error loading attendance:', error);
    document.getElementById('attendance-body').innerHTML =
      '<tr><td colspan="7" class="status-message error">Failed to load attendance.</td></tr>';
  }
}

function showAttendanceMessage(text, isError) {
  showMessage(document.getElementById('attendance-message'), text, isError);
}

async function checkIn(ticketCode) {
  try {
    const response = await adminFetch(`${API_BASE}/api/attendance/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_code: ticketCode, event_id: attendanceEventId })
    });
    const data = await response.json();
    showAttendanceMessage(response.ok ? `✅ ${data.student_name} checked in.` : `❌ ${data.error || 'Check-in failed'}`, !response.ok);
    await loadAttendance();
  } catch (error) {
    showAttendanceMessage('Could not connect to the server.', true);
  } finally {
    const input = document.getElementById('ticket-code');
    input.value = '';
    input.focus();
  }
}

async function updateAttendance(id, attended) {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations/${id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: attended })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Attendance update failed');
    await loadAttendance();
  } catch (error) {
    showAttendanceMessage(error.message, true);
  }
}

async function start() {
  const context = await loadEventPage('Attendance');
  if (!context) return;
  attendanceEventId = context.eventId;
  setupAttendanceTabs();
  document.getElementById('refresh-btn').addEventListener('click', loadAttendance);
  document.getElementById('checkin-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const input = document.getElementById('ticket-code');
    if (input.value.trim()) checkIn(input.value.trim());
    else showAttendanceMessage('Enter or scan a ticket code.', true);
  });
  document.getElementById('attendance-body').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-id]');
    if (button) updateAttendance(button.dataset.id, button.dataset.attended === 'true');
  });
  await loadAttendance();
  document.getElementById('ticket-code').focus();
}

start();
