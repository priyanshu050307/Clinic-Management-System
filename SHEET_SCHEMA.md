# Google Sheets Database Schema – Clinic Management System

Use one Google Sheet as the database. Each sheet (tab) has the following column headers. Run `setupSheets()` once from the Script Editor to create missing sheets and headers.

---

## 1. Users

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| UserId         | Unique ID (UUID-style)                           |
| Email          | Login identifier (lowercase)                     |
| Phone          | Optional; can also be used for login             |
| PasswordHash   | SHA-256 hash of password                         |
| Role           | `Admin`, `Doctor`, or `Patient`                  |
| Name           | Display name                                     |
| CreatedAt      | ISO date string                                  |

---

## 2. Appointments

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| AppointmentId  | Unique ID                                        |
| PatientUserId  | UserId of patient                                |
| DoctorUserId   | UserId of doctor                                 |
| SlotStart      | Start of 15-min slot (ISO datetime)              |
| SlotEnd        | End of slot (ISO datetime)                       |
| Status         | `Scheduled`, `Cancelled`, etc.                    |
| CreatedAt      | ISO date string                                  |

---

## 3. Prescriptions

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| PrescriptionId | Unique ID                                        |
| AppointmentId  | Linked appointment                               |
| PatientUserId  | UserId of patient                                |
| DoctorUserId   | UserId of doctor                                 |
| Content        | Prescription text (medicines, dosage, etc.)      |
| CreatedAt      | ISO date string                                  |

---

## 4. Billing

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| BillId         | Unique ID                                        |
| AppointmentId  | Linked appointment                               |
| PatientUserId  | UserId of patient                                |
| DoctorUserId   | UserId of doctor                                 |
| Amount         | Consulting fee (number)                          |
| Status         | e.g. `Paid`                                      |
| CreatedAt      | ISO date string                                  |

---

## 5. Expenses

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| ExpenseId      | Unique ID                                        |
| Description    | Short description of expense                     |
| Amount         | Amount (number)                                  |
| Date           | Date of expense (YYYY-MM-DD)                      |
| CreatedAt      | ISO date string                                  |

---

## 6. Salaries

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| SalaryId       | Unique ID                                        |
| UserId         | UserId of doctor or nurse                        |
| Month          | Month (1–12)                                     |
| Year           | Year                                             |
| Amount         | Salary amount                                    |
| Type           | `Nurse` (fixed monthly) or `Doctor` (per consultation) |
| CreatedAt      | ISO date string                                  |

---

## 7. DoctorAvailability

| Column         | Description                                      |
|----------------|--------------------------------------------------|
| AvailabilityId | Unique ID                                        |
| DoctorUserId   | UserId of doctor                                 |
| DayOfWeek      | 0 = Sunday … 6 = Saturday                        |
| StartTime      | e.g. `09:00`                                    |
| EndTime        | e.g. `17:00`                                    |
| CreatedAt      | ISO date string                                  |

Appointment slots are generated in 15-minute intervals between StartTime and EndTime for the selected date.

---

## Notes

- Each row is one record; no joins are done in Sheets.
- All IDs are generated with `Utilities.getUuid()` (minus hyphens).
- Run `setupSheets()` from the Script Editor (with the script bound to this spreadsheet) to create sheets and header rows if they do not exist.
