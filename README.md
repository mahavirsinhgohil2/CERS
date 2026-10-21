# College Event Registration System

## Silver Oak University | Diploma CSE(CS) | PBL Project

A full-stack web application that digitizes college event registration. Students can browse events and register online. Admins can log in to manage events and view all registrations.

## Features

**Student Portal**
- View all upcoming events as cards
- Register for an event using a validated form
- Event pre-selected when clicking "Register Now"
- Solo, group and paid-event registration
- QR tickets and find-my-ticket lookup

**Admin Portal**
- Server-authenticated login and protected dashboard
- Stats: total events, total registrations, departments covered
- Add new events and delete existing events
- View registrations, verify payments and manage attendance

## Tech Stack

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | SQLite (better-sqlite3) |
| Deployment | Vercel (frontend) + Render (backend) |

## Folder Structure

```
college-event-registration-system/
├── student-portal/    (index, events, register pages + css + js)
├── admin-portal/      (login, dashboard pages + css + js)
├── backend/           (server.js, database.js, routes/)
├── package.json
└── README.md
```

## Run Locally

```bash
npm install
node backend/server.js
```

- Student Portal: http://localhost:3000/student-portal/index.html
- Admin Portal: http://localhost:3000/admin-portal/index.html
- Admin login: `admin` / `admin123`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/events | Fetch all events |
| POST | /api/events | Add a new event |
| DELETE | /api/events/:id | Delete an event |
| POST | /api/register | Submit a student registration |
| GET | /api/registrations | Fetch all registrations |
| POST | /api/admin/login | Admin login |
| GET | /api/tickets/:code | Fetch a ticket and QR image |
| GET | /api/tickets/lookup | Find tickets by enrollment and email |
| PUT | /api/registrations/:id/payment | Verify or undo payment |
| PUT | /api/registrations/:id/attendance | Mark attendance |
| POST | /api/attendance/checkin | Check in a ticket |

## Database Tables

- **events**: event details, participation type, college restriction, recommendation and fee
- **registrations**: student details, ticket, payment and attendance data, with an event foreign key
- **team_members**: group members linked to a registration

## Project Objectives

1. Digitize college event registration and eliminate paper forms
2. Provide two separate portals for Students and Admin
3. Store all data in SQLite with a proper relational structure
4. Build RESTful APIs with Node.js and Express.js
5. Deploy a fully working system for PBL review

## Known Limitations and Future Improvements

- Admin credentials are configured with `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `TOKEN_SECRET`; local defaults are for development only.
- Render's free plan resets the SQLite file on restart, so data may return to the seed events.
- Possible additions: edit events, export registrations to CSV, email confirmations.