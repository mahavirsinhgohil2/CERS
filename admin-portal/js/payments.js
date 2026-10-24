let paymentEvent = null;
let paymentRegistrations = [];
let paymentFilter = 'all';
let paymentEventId = null;

function paymentTabUrl(page) {
  return `${page}.html?event_id=${paymentEventId}`;
}

function setupPaymentTabs() {
  document.getElementById('registrations-tab').href = paymentTabUrl('registrations');
  document.getElementById('payments-tab').href = paymentTabUrl('payments');
  document.getElementById('attendance-tab').href = paymentTabUrl('attendance');
}

function renderPaymentSummary() {
  const fee = Number(paymentEvent.fee);
  const paid = paymentRegistrations.filter(function (r) { return r.payment_status === 'paid'; }).length;
  const pending = paymentRegistrations.filter(function (r) { return r.payment_status === 'pending'; }).length;
  document.getElementById('summary-fee').textContent = `₹${fee}`;
  document.getElementById('summary-registered').textContent = paymentRegistrations.length;
  document.getElementById('summary-paid').textContent = paid;
  document.getElementById('summary-pending').textContent = pending;
  document.getElementById('summary-collected').textContent = `₹${paid * fee}`;
  document.getElementById('summary-expected').textContent = `₹${paymentRegistrations.length * fee}`;
}

function renderPayments() {
  const body = document.getElementById('payments-body');
  const rows = paymentRegistrations.filter(function (r) {
    return paymentFilter === 'all' || r.payment_status === paymentFilter;
  });
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="status-message">No registrations in this filter.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(function (registration, index) {
    const actionStatus = registration.payment_status === 'paid' ? 'pending' : 'paid';
    const actionLabel = actionStatus === 'paid' ? 'Mark Paid' : 'Undo';
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(registration.student_name)}${registration.team_name ? `<span class="team-list">${escapeHtml(registration.team_name)}</span>` : ''}</td>
      <td>${escapeHtml(registration.enrollment_no)}</td>
      <td>${escapeHtml(registration.phone)}</td>
      <td class="ticket-code-text">${escapeHtml(registration.payment_ref || '—')}</td>
      <td>₹${Number(paymentEvent.fee)}</td>
      <td>${escapeHtml(getPaymentText(registration))}</td>
      <td><button class="btn-small${actionStatus === 'pending' ? ' danger' : ''}" data-id="${registration.id}" data-status="${actionStatus}">${actionLabel}</button></td>
    </tr>`;
  }).join('');
}

async function loadPayments() {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations?event_id=${paymentEventId}`);
    if (!response.ok) throw new Error('Failed to load payments');
    paymentRegistrations = await response.json();
    renderPaymentSummary();
    renderPayments();
  } catch (error) {
    console.error('Error loading payments:', error);
    document.getElementById('payments-body').innerHTML =
      '<tr><td colspan="8" class="status-message error">Failed to load payments.</td></tr>';
  }
}

async function updatePayment(id, status) {
  try {
    const response = await adminFetch(`${API_BASE}/api/registrations/${id}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Payment update failed');
    await loadPayments();
  } catch (error) {
    console.error('Error updating payment:', error);
    showMessage(document.getElementById('free-message'), error.message, true);
  }
}

async function start() {
  const context = await loadEventPage('Payments');
  if (!context) return;
  paymentEvent = context.event;
  paymentEventId = context.eventId;
  setupPaymentTabs();
  document.getElementById('refresh-btn').addEventListener('click', loadPayments);
  document.querySelectorAll('.filter-bar button').forEach(function (button) {
    button.addEventListener('click', function () {
      paymentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-bar button').forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
      renderPayments();
    });
  });
  if (Number(paymentEvent.fee) === 0) {
    showMessage(document.getElementById('free-message'), 'This is a free event, so there are no payments to verify.', false);
    document.getElementById('free-message').innerHTML +=
      ` <a href="${paymentTabUrl('registrations')}">View Registrations</a>`;
    document.getElementById('payments-content').classList.add('hidden');
    return;
  }
  document.getElementById('payments-body').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-id]');
    if (button) updatePayment(button.dataset.id, button.dataset.status);
  });
  await loadPayments();
}

start();
