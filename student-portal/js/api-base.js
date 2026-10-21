// ==========================================================
// student-portal/js/api-base.js
// Auto-detects whether we are running locally or deployed.
// This file must be loaded FIRST in every HTML page,
// otherwise API_BASE will be undefined.
// ==========================================================

// Are we running on our own computer?
const isLocal = window.location.hostname === 'localhost'
             || window.location.hostname === '127.0.0.1';

// Pick the right backend URL automatically
const API_BASE = isLocal
  ? 'http://localhost:3000'
  : 'https://cers-oiqy.onrender.com';