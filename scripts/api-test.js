const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { createClient } = require('@libsql/client');

const port = 3217;
const baseUrl = 'http://localhost:' + port;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cers-api-'));
const dbPath = path.join(tempDir, 'test.db');

function startServer() {
  const childEnv = Object.assign({}, process.env, {
    PORT: String(port),
    DB_PATH: dbPath,
    TOKEN_SECRET: 'test-secret'
  });
  delete childEnv.TURSO_DATABASE_URL;
  delete childEnv.TURSO_AUTH_TOKEN;

  return spawn(process.execPath, ['backend/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: childEnv,
    stdio: 'ignore'
  });
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  await new Promise(function (resolve) {
    server.once('exit', resolve);
    server.kill();
  });
}

async function removeTempDirectory() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
    }
  }
  throw new Error('Could not remove temporary API test database');
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl + '/api/events');
      if (response.ok) return;
    } catch (error) {
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
    }
  }
  throw new Error('Test server did not start');
}

async function request(pathname, options) {
  return fetch(baseUrl + pathname, options);
}

function jsonOptions(body, token) {
  return {
    method: 'POST',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {}
    ),
    body: JSON.stringify(body)
  };
}

async function login() {
  const response = await request('/api/admin/login', jsonOptions({
    username: 'admin',
    password: 'admin123'
  }));
  assert.strictEqual(response.status, 200);
  return (await response.json()).token;
}

async function register(body) {
  return request('/api/register', jsonOptions(body));
}

async function run() {
  let server = startServer();
  try {
    await waitForServer();

    const eventsResponse = await request('/api/events');
    assert.strictEqual(eventsResponse.status, 200);
    const initialEvents = await eventsResponse.json();
    assert.strictEqual(initialEvents.length, 3);

    const unauthorized = await request('/api/registrations');
    assert.strictEqual(unauthorized.status, 401);

    const badLogin = await request('/api/admin/login', jsonOptions({
      username: 'wrong',
      password: 'wrong'
    }));
    assert.strictEqual(badLogin.status, 401);
    const token = await login();

    const registrations = await request('/api/registrations', {
      headers: { Authorization: 'Bearer ' + token }
    });
    assert.strictEqual(registrations.status, 200);

    const concurrentBody = {
      student_name: 'Concurrent Student',
      enrollment_no: '1234567890123',
      email: '1234567890123@silveroakuni.ac.in',
      college: 'Silver Oak College of Engineering & Technology',
      department: 'IT',
      branch: 'Information Technology',
      division: 'A',
      phone: '9876543210',
      event_id: 1
    };
    const concurrentResponses = await Promise.all(
      Array.from({ length: 8 }, function () { return register(concurrentBody); })
    );
    const concurrentStatuses = concurrentResponses.map(function (response) { return response.status; });
    assert.strictEqual(concurrentStatuses.filter(function (status) { return status === 201; }).length, 1);
    assert.strictEqual(concurrentStatuses.filter(function (status) { return status === 409; }).length, 7);

    const addEvent = await request('/api/events', jsonOptions({
      name: 'Persistence Test Event',
      date: '2099-01-01',
      location: 'Test Hall',
      description: 'Persistence verification',
      participation_type: 'solo',
      college: 'All Colleges',
      fee: 0
    }, token));
    assert.strictEqual(addEvent.status, 201);
    const addedEventId = (await addEvent.json()).id;

    const deleteEventResponse = await request('/api/events', jsonOptions({
      name: 'Delete Test Event',
      date: '2099-02-01',
      location: 'Delete Hall',
      description: 'Deletion verification',
      participation_type: 'group',
      min_team_size: 2,
      max_team_size: 2,
      college: 'All Colleges',
      fee: 0
    }, token));
    assert.strictEqual(deleteEventResponse.status, 201);
    const deleteEventId = (await deleteEventResponse.json()).id;

    const deleteRegistration = await register({
      student_name: 'Delete Leader',
      enrollment_no: '2234567890123',
      email: '2234567890123@silveroakuni.ac.in',
      college: 'Silver Oak College of Engineering & Technology',
      department: 'IT',
      branch: 'Information Technology',
      division: 'A',
      phone: '9876543211',
      event_id: deleteEventId,
      team_name: 'Delete Team',
      team_members: [{
        member_name: 'Delete Member',
        enrollment_no: '3234567890123'
      }]
    });
    assert.strictEqual(deleteRegistration.status, 201);

    const deleteResponse = await request('/api/events/' + deleteEventId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    assert.strictEqual(deleteResponse.status, 200);

    const localDb = createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });
    const registrationCount = await localDb.execute(
      'SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?',
      [deleteEventId]
    );
    const memberCount = await localDb.execute(
      'SELECT COUNT(*) AS count FROM team_members WHERE registration_id NOT IN (SELECT id FROM registrations)',
      []
    );
    assert.strictEqual(Number(registrationCount.rows[0].count), 0);
    assert.strictEqual(Number(memberCount.rows[0].count), 0);
    localDb.close();

    await stopServer(server);
    server = null;
    server = startServer();
    await waitForServer();

    const persistedEventsResponse = await request('/api/events');
    assert.strictEqual(persistedEventsResponse.status, 200);
    const persistedEvents = await persistedEventsResponse.json();
    assert.strictEqual(persistedEvents.filter(function (event) {
      return event.id === addedEventId;
    }).length, 1);
    assert.strictEqual(persistedEvents.filter(function (event) {
      return event.name === 'Tech Fest';
    }).length, 1);
    assert.strictEqual(persistedEvents.length, 4);

    console.log('API tests passed.');
  } finally {
    await stopServer(server);
    await removeTempDirectory();
  }
}

run().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
