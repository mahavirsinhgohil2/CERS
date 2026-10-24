# Build Progress

## Phase 1 - Backend foundation

- [x] Database schema and migrations
- [x] Admin authentication and authorization
- [x] Rate limiting, security headers, and request limits
- [x] Package/deployment dependencies
- [x] API and static validation scripts

## Phase 2 - Frontend alignment

- [x] Registration page structure and event-only flow
- [x] Admin token flow
- [x] Accessibility and responsive behavior
- [x] Past-event and error-state behavior

## Phase 3 - Documentation and final verification

- [x] README and deployment documentation
- [x] Full syntax/static/API test run
- [x] Manual browser smoke tests

## Known issues

- Comprehensive visual screenshot testing at every target viewport still requires a browser session.

## Admin portal restructure

### R1 - Backend event filter

- [x] Added optional `event_id` filtering to `GET /api/registrations`
- [x] Added `event_id` validation and API coverage

### R2 - Dashboard and event management split

- [x] Added shared `admin-common.js` helpers and event-page utilities
- [x] Split overview dashboard from event management
- [x] Added shared admin navigation and responsive event overview/actions
- [x] Extended static checks for admin page script order and element IDs

### R3 - Event registrations page

- [x] Added event-scoped registrations page and search
- [x] Added shared event picker, breadcrumb, tabs, refresh, and error handling
- [x] Kept payment and attendance values read-only on this page

### R4 - Event payments page

- [x] Added free-event handling and payment summary cards
- [x] Added All, Pending, and Paid filters
- [x] Added Mark Paid and Undo actions with reloads

### R5 - Event attendance page

- [x] Added event-scoped scanner check-in
- [x] Added attendance summaries and present/absent actions
- [x] Added payment-pending protection and refresh behavior

### R6 - Polish and final review

- [x] Updated admin page map and Turso deployment documentation
- [x] Verified shared focus styles, live message regions, and responsive table wrappers
- [x] Removed the old combined dashboard event/registration/payment/attendance code
- [x] Completed final syntax, static, API, and whitespace checks
