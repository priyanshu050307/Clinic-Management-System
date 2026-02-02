# Clinic Management System (CMS) – GAS Only

A **Clinic Management System** for a single personal clinic (1–3 doctors), built entirely with **Google Apps Script (GAS)**, **Google Sheets** as the database, and **GAS HTML Service** for the frontend.

## Contents

- **SHEET_SCHEMA.md** – Google Sheets database schema (column names for each sheet).
- **DEPLOYMENT.md** – Step-by-step deployment of the GAS Web App.
- **USAGE.md** – Instructions for the clinic owner (admin, doctor, patient workflows).

## Tech stack

- **Frontend:** GAS HTML Service (HTML, CSS, vanilla JavaScript).
- **Backend:** Google Apps Script (`.gs` files).
- **Database:** Google Sheets (one spreadsheet).
- **Auth:** Role-based session via `PropertiesService` (phone/email + password).

## Project structure

| File | Purpose |
|------|--------|
| `Code.gs` | Entry (`doGet`), routing, `setupSheets()`, sheet headers |
| `auth.gs` | Login, logout, session, `addUser`, `createDefaultAdmin` |
| `appointments.gs` | Doctor availability, 15-min slots, booking, list/cancel |
| `prescriptions.gs` | Save prescription, list by appointment/patient |
| `billing.gs` | Create bill, get bill/invoice, list bills |
| `finance.gs` | Salaries, expenses, daily income, admin dashboard |
| `index.html` | Login page |
| `admin.html` | Admin dashboard (users, hours, appointments, expenses, salaries) |
| `doctor.html` | Doctor (today’s appointments, prescription, bill, hours, earnings) |
| `patient.html` | Patient (book slot, my appointments, prescriptions, bills/print) |
| `shared-css.html`, `shared-js.html` | Shared styles and script (included in each HTML) |

## Quick start

1. Create a new Google Sheet (or use an existing one).
2. **Extensions** → **Apps Script**; add all `.gs` and `.html` files from this project.
3. Run **`setupSheets()`** once to create sheets and headers.
4. Run **`createDefaultAdmin()`** once to create admin (email: `admin@clinic.com`, password: `admin123`).
5. **Deploy** → **New deployment** → **Web app** (Execute as: Me, Who has access: Anyone).
6. Open the Web app URL to log in and use the system.

See **DEPLOYMENT.md** and **USAGE.md** for full details.
