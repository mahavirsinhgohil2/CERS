# College Event Registration System

## Silver Oak University | Diploma CSE(CS) | PBL Project

A full-stack event registration system for Silver Oak University. Students can
browse events, register individually or in teams, receive QR tickets, and find
existing tickets. Administrators can manage events, verify payments, and record
attendance.

## Features

### Student portal

- Home page with an upcoming-event preview
- Event cards with date, location, participation type, fee, college restriction,
  description, and recommended-event badge
- Past events show **Registration Closed**
- Solo, group, and solo-or-group registration
- Team-size validation and duplicate enrollment checks
- College-email, enrollment-number, phone-number, and UPI-reference validation
- Manual UPI payment workflow for paid events
- QR ticket page with print and QR-download actions
- Find-my-ticket lookup using enrollment number and college email

### Admin portal

- Server-authenticated admin login
- Token-protected dashboard API requests
- Event statistics
- Add and delete events
- Solo, group, or both participation types
- College restrictions, fees, and recommended-event flag
- Registration and team-member details
- Manual payment verification
- Ticket-code check-in and per-event attendance management

## Technology

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js and Express |
| Database | SQLite with better-sqlite3 |
| QR tickets | qrcode |
| Deployment | Vercel frontends and Render backend |

The frontend does not use React, TypeScript, or a frontend build tool.

## Project structure

```text
college-event-registration-system/
├── student-portal/
│   ├── index.html
│   ├── events.html
│   ├── register.html
│   ├── ticket.html
│   ├── css/
│   └── js/
├── admin-portal/
│   ├── index.html
│   ├── dashboard.html
│   ├── css/
│   └── js/
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── middleware/
│   └── routes/
├── scripts/
│   ├── api-test.js
│   └── static-check.js
├── package.json
├── PROGRESS.md
└── README.md
```

## Run locally

Run these commands from the project root:

```powershell
npm install
npm start
```

The local pages are:

- Student portal: http://localhost:3000/student-portal/index.html
- Admin login: http://localhost:3000/admin-portal/index.html

The backend also serves the API from:

- http://localhost:3000/api/events

### Local environment variables

The application uses these optional environment variables:

| Variable | Purpose | Local default |
|---|---|---|
| `PORT` | Backend port | `3000` |
| `DB_PATH` | SQLite database path | `backend/database.db` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |
| `TOKEN_SECRET` | Secret used to sign admin tokens | `dev-secret` |
| `NODE_ENV` | Runtime environment | unset |

Set secure values for `ADMIN_PASSWORD` and `TOKEN_SECRET` before deployment.
The application prints a warning if production is configured without the
required security variables.

## API

### Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/events` | List events in date order |
| GET | `/api/events/:id` | Get one event |
| POST | `/api/register` | Submit a student registration |
| GET | `/api/tickets/lookup?enrollment_no=&email=` | Find a student's tickets |
| GET | `/api/tickets/:code` | Get ticket details and QR data |
| POST | `/api/admin/login` | Authenticate an administrator |

### Admin endpoints

Admin endpoints require:

```text
Authorization: Bearer <token>
```

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/events` | Add an event |
| DELETE | `/api/events/:id` | Delete an event |
| GET | `/api/registrations` | List registrations and team members |
| PUT | `/api/registrations/:id/payment` | Mark payment paid or pending |
| PUT | `/api/registrations/:id/attendance` | Mark a registration present or absent |
| POST | `/api/attendance/checkin` | Check in a ticket code |

The login endpoint returns HTTP 401 for invalid credentials. Validation errors
return HTTP 400, unauthorized admin requests return HTTP 401, forbidden
business actions return HTTP 403, missing records return HTTP 404, duplicate
records return HTTP 409, and oversized JSON requests return HTTP 413.

## Validation rules

The server validates all rules independently of the browser:

- Enrollment number: 13 or 14 digits
- College email: 13 digits followed by `@silveroakuni.ac.in`
- Phone: exactly 10 digits
- UPI transaction reference: 10–25 letters or numbers
- Event dates: valid `YYYY-MM-DD` dates that are today or later
- Event name: maximum 100 characters
- Event location: maximum 150 characters
- Event description: maximum 500 characters
- Team name: maximum 60 characters
- Group team sizes: minimum 2 and maximum 20 members, including the leader
- A student or team member cannot register twice for the same event
- Paid registrations remain pending until an administrator verifies payment
- Pending paid registrations cannot be checked in

## Database

The database contains:

- `events`: event details, participation type, date, college restriction,
  recommendation flag, and fee
- `registrations`: student details, ticket code, payment state, and attendance
- `team_members`: team members linked to a registration

Foreign keys are enabled. The startup migration keeps older local databases
usable when the current schema adds columns. `DB_PATH` can point tests or
another environment to a separate SQLite file.

## Verification commands

Run both checks from the project root:

```powershell
npm run check
npm run test:api
```

`npm run check` validates JavaScript syntax and verifies that
`js/api-base.js` is the first script in each HTML page.

`npm run test:api` starts an isolated temporary database, checks public
endpoints, verifies rejected admin access, tests admin login, and checks an
authenticated admin endpoint.

## Deployment

### Render backend

- Build command: `npm install`
- Start command: `npm start`
- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `TOKEN_SECRET`, and `NODE_ENV=production`
- Set `DB_PATH` only when using a specific persistent database location

The free Render filesystem is not a reliable permanent store for SQLite.
Registrations and tickets can be lost after a restart or redeploy. Use
persistent storage or a production database for real use, and keep backups for
demonstrations.

### Vercel frontends

Create two Vercel projects:

1. Student portal with root directory `student-portal`
2. Admin portal with root directory `admin-portal`

Use framework preset **Other**. Keep the relative `js/`, `css/`, and `images/`
paths intact. Update the API base configuration and backend CORS allowlist
when deploying to different domains.

## Project objectives

1. Replace paper-based college event registration.
2. Provide separate student and administrator portals.
3. Store related event, registration, and team data in SQLite.
4. Expose a REST API using Node.js and Express.
5. Demonstrate a complete PBL workflow from registration to attendance.

## Known limitations and future improvements

- UPI payment verification is manual; no payment gateway is connected.
- LocalStorage is not used as server authorization; the backend validates admin
  bearer tokens.
- SQLite on Render's free infrastructure is not guaranteed to persist.
- There is no email notification service.
- Future improvements could include event editing, CSV export, automated
  backups, a production database, and stronger account management.
