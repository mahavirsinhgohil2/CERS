// ==========================================================
// student-portal/js/register.js
// Loads ONE event (from ?event_id=X in the URL), shows the right
// fields (solo / group / payment), validates and submits.
// Needs api-base.js loaded first (API_BASE).
// ==========================================================

// ---------- Payment settings: CHANGE THESE ----------
const UPI_ID = 'silveroakuni@upi';
const UPI_NAME = 'Silver Oak University';

// ---------- Dropdown lists (keep COLLEGES same as admin dashboard.js) ----------
const COLLEGES = [
  'Silver Oak College of Engineering & Technology',
  'Aditya Silver Oak Institute of Technology',
  'Silver Oak Institute of Management',
  'Silver Oak Institute of Design',
  'Silver Oak Law College',
  'Silver Oak College of Nursing',
  'Silver Oak College of Physiotherapy'
];

const BRANCHES = [
  'Computer Engineering',
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical',
  'Mechanical',
  'Civil',
  'Other'
];

const DIVISIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ---------- Validation patterns ----------
const ENROLLMENT_PATTERN = /^\d{13,14}$/;                       // 13 or 14 digits
const COLLEGE_EMAIL_PATTERN = /^\d{13}@silveroakuni\.ac\.in$/i; // 1234567890123@silveroakuni.ac.in
const PAYMENT_REF_PATTERN = /^[A-Za-z0-9]{10,25}$/;             // UPI transaction ID

// ---------- Elements ----------
const form = document.getElementById('register-form');
const loadingText = document.getElementById('loading-text');
const noEventBox = document.getElementById('no-event');
const noEventText = document.getElementById('no-event-text');
const formWrapper = document.getElementById('form-wrapper');
const eventNameEl = document.getElementById('event-name');
const eventInfo = document.getElementById('event-info');
const successBox = document.getElementById('success-box');
const errorBox = document.getElementById('error-box');
const submitBtn = document.getElementById('submit-btn');
const modeGroup = document.getElementById('mode-group');
const teamSection = document.getElementById('team-section');
const teamHint = document.getElementById('team-hint');
const membersContainer = document.getElementById('members-container');
const addMemberBtn = document.getElementById('add-member-btn');
const paymentSection = document.getElementById('payment-section');
const paymentText = document.getElementById('payment-text');
const upiLink = document.getElementById('upi-link');

let currentEvent = null;   // the event this form is for

// Turns "2025-08-15" into "15 August 2025"
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Fill a <select> from a list
function fillSelect(selectId, items, placeholder) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';

  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);

  items.forEach(function (item) {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

// ----------------------------------------------------------
// STEP A: Load the event from the URL (?event_id=X)
// ----------------------------------------------------------
function showNoEvent(message) {
  loadingText.classList.add('hidden');
  formWrapper.classList.add('hidden');
  noEventText.textContent = message;
  noEventBox.classList.remove('hidden');
}

async function loadEvent() {
  const eventId = new URLSearchParams(window.location.search).get('event_id');

  if (!eventId) {
    showNoEvent('Please choose an event first, then click "Register Now" on its card.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`);

    if (response.status === 404) {
      showNoEvent('This event was not found. It may have been removed.');
      return;
    }
    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    currentEvent = await response.json();
    setupEvent();
  } catch (error) {
    console.error('Error loading event:', error);
    showNoEvent('Failed to load the event. Please try again.');
  }
}

// ----------------------------------------------------------
// Shows the event details and the right parts of the form
// ----------------------------------------------------------
function setupEvent() {
  loadingText.classList.add('hidden');
  formWrapper.classList.remove('hidden');

  eventNameEl.textContent = currentEvent.name;
  document.title = 'Register: ' + currentEvent.name + ' | Silver Oak University';

  const lines = [];
  if (currentEvent.is_recommended) lines.push('⭐ Recommended event');
  lines.push('📅 ' + formatDate(currentEvent.date));
  lines.push('📍 ' + currentEvent.location);
  if (currentEvent.description) lines.push('📝 ' + currentEvent.description);

  lines.push(currentEvent.fee > 0
    ? `💰 Entry fee: ₹${currentEvent.fee} per registration`
    : '💰 Free entry');

  if (currentEvent.participation_type === 'solo') {
    lines.push('🧍 Solo event: you register individually.');
  } else if (currentEvent.participation_type === 'group') {
    lines.push(`👥 Group event: team of ${currentEvent.min_team_size} to ${currentEvent.max_team_size} members (including you).`);
  } else {
    lines.push(`🧍👥 Solo or Group: you choose. A group needs ${currentEvent.min_team_size} to ${currentEvent.max_team_size} members (including you).`);
  }

  lines.push(currentEvent.college === 'All Colleges'
    ? '🏛️ Open to all colleges.'
    : '🏛️ Only for: ' + currentEvent.college);

  eventInfo.textContent = lines.join('\n');

  // Solo / group parts
  if (currentEvent.participation_type === 'group') {
    showTeamSection();
  } else if (currentEvent.participation_type === 'both') {
    modeGroup.classList.remove('hidden');
  }

  // Payment part
  if (currentEvent.fee > 0) {
    showPaymentSection();
  }
}

function showPaymentSection() {
  paymentSection.classList.remove('hidden');
  paymentText.textContent =
    `Pay ₹${currentEvent.fee} to UPI ID ${UPI_ID} (one payment per registration), then enter the transaction ID below. ` +
    'Your entry is confirmed after the organizer verifies the payment.';

  // Opens a UPI app on a phone
  upiLink.href = 'upi://pay?pa=' + encodeURIComponent(UPI_ID)
    + '&pn=' + encodeURIComponent(UPI_NAME)
    + '&am=' + currentEvent.fee
    + '&cu=INR&tn=' + encodeURIComponent('Event: ' + currentEvent.name);
}

// ----------------------------------------------------------
// Messages and field errors
// ----------------------------------------------------------
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideMessages() {
  successBox.classList.add('hidden');
  errorBox.classList.add('hidden');
}

function setFieldError(fieldId, message) {
  document.getElementById(fieldId + '-error').textContent = message;
  document.getElementById(fieldId).classList.add('invalid');
}

function clearFieldErrors() {
  const fieldIds = ['student_name', 'enrollment_no', 'email', 'college', 'department',
                    'branch', 'division', 'phone', 'team_name', 'payment_ref'];
  fieldIds.forEach(function (id) {
    document.getElementById(id + '-error').textContent = '';
    document.getElementById(id).classList.remove('invalid');
  });
  document.getElementById('members-error').textContent = '';
  document.querySelectorAll('.member-row input').forEach(function (input) {
    input.classList.remove('invalid');
  });
}

// ----------------------------------------------------------
// TEAM SECTION helpers
// ----------------------------------------------------------
function getParticipation() {
  if (!currentEvent) return 'solo';
  if (currentEvent.participation_type === 'both') {
    return document.querySelector('input[name="participation"]:checked').value;
  }
  return currentEvent.participation_type;
}

function refreshMemberRows() {
  const rows = membersContainer.querySelectorAll('.member-row');
  const requiredRows = currentEvent.min_team_size - 1;   // the leader is member 1

  rows.forEach(function (row, index) {
    row.querySelector('.member-name').placeholder = `Member ${index + 2} full name`;
    row.querySelector('.btn-remove').classList.toggle('hidden', index < requiredRows);
  });

  addMemberBtn.disabled = rows.length >= currentEvent.max_team_size - 1;
}

function addMemberRow() {
  const row = document.createElement('div');
  row.className = 'member-row';
  row.innerHTML = `
    <input type="text" class="member-name" placeholder="Member name">
    <input type="text" class="member-enroll" placeholder="13 or 14-digit enrollment no" maxlength="14" inputmode="numeric">
    <button type="button" class="btn-remove" title="Remove member">✕</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', function () {
    row.remove();
    refreshMemberRows();
  });
  membersContainer.appendChild(row);
  refreshMemberRows();
}

function showTeamSection() {
  teamSection.classList.remove('hidden');
  teamHint.textContent =
    `Team size: ${currentEvent.min_team_size} to ${currentEvent.max_team_size} members including you. Add your teammates below.`;

  if (membersContainer.children.length === 0) {
    for (let i = 0; i < currentEvent.min_team_size - 1; i++) {
      addMemberRow();
    }
  }
  refreshMemberRows();
}

function hideTeamSection() {
  teamSection.classList.add('hidden');
  membersContainer.innerHTML = '';
  document.getElementById('team_name').value = '';
}

// ----------------------------------------------------------
// STEP B: Validate the form
// ----------------------------------------------------------
function validateForm() {
  clearFieldErrors();
  let isValid = true;

  const studentName = document.getElementById('student_name').value.trim();
  const enrollmentNo = document.getElementById('enrollment_no').value.trim();
  const email = document.getElementById('email').value.trim();
  const college = document.getElementById('college').value;
  const department = document.getElementById('department').value;
  const branch = document.getElementById('branch').value;
  const division = document.getElementById('division').value;
  const phone = document.getElementById('phone').value.trim();

  if (studentName === '') {
    setFieldError('student_name', 'Full name is required');
    isValid = false;
  }

  if (enrollmentNo === '') {
    setFieldError('enrollment_no', 'Enrollment number is required');
    isValid = false;
  } else if (!ENROLLMENT_PATTERN.test(enrollmentNo)) {
    setFieldError('enrollment_no', 'Enrollment number must be 13 or 14 digits');
    isValid = false;
  }

  if (email === '') {
    setFieldError('email', 'College email is required');
    isValid = false;
  } else if (!COLLEGE_EMAIL_PATTERN.test(email)) {
    setFieldError('email', 'Use your college email: 13 digits + @silveroakuni.ac.in');
    isValid = false;
  }

  if (college === '') {
    setFieldError('college', 'Please select your college');
    isValid = false;
  } else if (currentEvent.college !== 'All Colleges' && college !== currentEvent.college) {
    setFieldError('college', 'This event is only for ' + currentEvent.college);
    isValid = false;
  }

  if (department === '') {
    setFieldError('department', 'Please select a department');
    isValid = false;
  }

  if (branch === '') {
    setFieldError('branch', 'Please select your branch');
    isValid = false;
  }

  if (division === '') {
    setFieldError('division', 'Please select your division');
    isValid = false;
  }

  if (phone === '') {
    setFieldError('phone', 'Phone number is required');
    isValid = false;
  } else if (!/^\d{10}$/.test(phone)) {
    setFieldError('phone', 'Phone must be exactly 10 digits (numbers only)');
    isValid = false;
  }

  // Payment (paid events)
  if (currentEvent.fee > 0) {
    const ref = document.getElementById('payment_ref').value.trim();
    if (ref === '') {
      setFieldError('payment_ref', 'Enter the UPI transaction ID after paying');
      isValid = false;
    } else if (!PAYMENT_REF_PATTERN.test(ref)) {
      setFieldError('payment_ref', 'Transaction ID must be 10 to 25 letters or numbers');
      isValid = false;
    }
  }

  // Team checks (group registrations)
  if (getParticipation() === 'group') {
    if (document.getElementById('team_name').value.trim() === '') {
      setFieldError('team_name', 'Team name is required');
      isValid = false;
    }

    const rows = membersContainer.querySelectorAll('.member-row');
    const seen = [enrollmentNo];
    let memberProblem = '';

    if (rows.length + 1 < currentEvent.min_team_size) {
      memberProblem = `Your team needs at least ${currentEvent.min_team_size} members (including you)`;
    }

    rows.forEach(function (row, index) {
      const nameInput = row.querySelector('.member-name');
      const enrollInput = row.querySelector('.member-enroll');
      const name = nameInput.value.trim();
      const enroll = enrollInput.value.trim();
      let problem = '';

      if (name === '') {
        problem = `Member ${index + 2}: name is required`;
        nameInput.classList.add('invalid');
      } else if (!ENROLLMENT_PATTERN.test(enroll)) {
        problem = `Member ${index + 2}: enrollment number must be 13 or 14 digits`;
        enrollInput.classList.add('invalid');
      } else if (seen.includes(enroll)) {
        problem = `Member ${index + 2}: this enrollment number is repeated`;
        enrollInput.classList.add('invalid');
      }
      seen.push(enroll);

      if (problem && !memberProblem) {
        memberProblem = problem;
      }
    });

    if (memberProblem) {
      document.getElementById('members-error').textContent = memberProblem;
      isValid = false;
    }
  }

  return isValid;
}

function collectTeamMembers() {
  const members = [];
  membersContainer.querySelectorAll('.member-row').forEach(function (row) {
    members.push({
      member_name: row.querySelector('.member-name').value.trim(),
      enrollment_no: row.querySelector('.member-enroll').value.trim()
    });
  });
  return members;
}

// ----------------------------------------------------------
// STEP C: Submit the form, then open the ticket page
// ----------------------------------------------------------
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideMessages();

  if (!validateForm()) {
    return;
  }

  const participation = getParticipation();

  const formData = {
    student_name: document.getElementById('student_name').value.trim(),
    enrollment_no: document.getElementById('enrollment_no').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    college: document.getElementById('college').value,
    department: document.getElementById('department').value,
    branch: document.getElementById('branch').value,
    division: document.getElementById('division').value,
    phone: document.getElementById('phone').value.trim(),
    event_id: currentEvent.id,
    participation: participation,
    team_name: participation === 'group' ? document.getElementById('team_name').value.trim() : '',
    team_members: participation === 'group' ? collectTeamMembers() : [],
    payment_ref: currentEvent.fee > 0 ? document.getElementById('payment_ref').value.trim() : ''
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  let registered = false;

  try {
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Registration failed. Please try again.');
    } else {
      registered = true;
      successBox.textContent = `✅ Registration Successful! You are registered for ${data.event_name}. Opening your ticket...`;
      successBox.classList.remove('hidden');

      // Go to the ticket page after a short pause
      setTimeout(function () {
        window.location.href = 'ticket.html?code=' + encodeURIComponent(data.ticket_code);
      }, 1500);
    }
  } catch (error) {
    console.error('Error submitting registration:', error);
    showError('Could not connect to the server. Please try again.');
  } finally {
    // Keep the button off after success so it can't be sent twice
    if (!registered) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Registration';
    }
  }
});

// ----------------------------------------------------------
// Listeners and start-up
// ----------------------------------------------------------
document.querySelectorAll('input[name="participation"]').forEach(function (radio) {
  radio.addEventListener('change', function () {
    if (getParticipation() === 'group') {
      showTeamSection();
    } else {
      hideTeamSection();
    }
  });
});

addMemberBtn.addEventListener('click', addMemberRow);

fillSelect('college', COLLEGES, '-- Select College --');
fillSelect('branch', BRANCHES, '-- Select Branch --');
fillSelect('division', DIVISIONS, '-- Select Division --');
loadEvent();