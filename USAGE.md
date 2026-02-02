# Instructions for Clinic Owner – Using the CMS

This guide explains how to use the Clinic Management System (CMS) day to day.

---

## First-time setup (clinic owner / admin)

1. **Open the Web app** using the URL you received (e.g. from deployment).
2. **Log in** with the default admin account:
   - Email: **admin@clinic.com**
   - Password: **admin123**
   - Change the password later by editing the **Users** sheet (PasswordHash column) or add a new admin and stop using this one.

3. **Add users**
   - Go to **Users**.
   - Choose **Role**: Doctor or Patient (or Admin if needed).
   - Enter **Email**, **Phone** (optional), **Password**, **Name**.
   - Click **Add user**.
   - Give each doctor and patient their email/phone and password so they can log in.

4. **Set doctor visiting hours**
   - Go to **Doctor hours** (or ask each doctor to set **My hours** after login).
   - Select the **Doctor**, **Day** (0 = Sunday … 6 = Saturday), **Start time** (e.g. 09:00), **End time** (e.g. 17:00).
   - Click **Save**.
   - Repeat for each day each doctor works. The system will create **15-minute slots** between start and end time.

---

## Daily workflow

### For the doctor

1. Log in with **Doctor** role.
2. **Today’s appointments** – See today’s list; check in patients as they arrive.
3. **Write prescription** – Select today’s appointment, enter prescription text, click **Save prescription**.
4. **Create bill** – Select the appointment, enter consultation **Amount**, click **Create bill**. The bill is stored and can be printed by the patient from **My bills** → **View / Print**.
5. **My hours** – Change visiting hours if needed (same 15-minute slot logic).
6. **My earnings** – View today’s and this month’s earnings (sum of your consultation bills).

### For the patient

1. Log in with **Patient** role.
2. **Book appointment** – Choose **Doctor**, **Date**, click **Show available slots**, then **Book** on a slot. Double booking is prevented.
3. **My appointments** – View past and upcoming appointments.
4. **My prescriptions** – View past prescriptions (read-only).
5. **My bills** – View bills; use **View / Print** to open the invoice and use the browser **Print** (e.g. **Ctrl+P** / **Cmd+P**) to print.

### For the admin / clinic owner

1. Log in with **Admin** role.
2. **Dashboard** – See **Today’s income**, **This month – Expenses**, **This month – Salaries**, and recent expenses/salaries.
3. **Users** – Add Doctors and Patients (and other Admins if needed).
4. **Doctor hours** – Set or change visiting hours for any doctor.
5. **Appointments** – View all appointments (filter by period in the list).
6. **Expenses** – Add **Description**, **Amount**, **Date**; view recent expenses.
7. **Salaries** – Add salary records: select **User** (doctor/nurse), **Month**, **Year**, **Amount**, **Type** (Nurse = fixed monthly, Doctor = per consultation). View recent salaries.

---

## Billing and invoice

- The doctor (or admin) **creates a bill** for an appointment with an amount.
- The bill is stored in the **Billing** sheet.
- The patient sees it under **My bills** and can **View / Print** to open the invoice and use **Print** in the browser (**window.print()**) to print.

---

## Roles at a glance

| Role   | Main actions |
|--------|-------------------------------|
| Admin  | Dashboard, users, doctor hours, appointments, expenses, salaries |
| Doctor | Today’s appointments, write prescription, create bill, my hours, my earnings |
| Patient| Book appointment, my appointments, my prescriptions, my bills (view/print) |

---

## Tips

- **Sessions**: Login is valid for 1 day. If the link stops working, log in again (email/phone + password).
- **Slots**: Only days and times with **Doctor hours** set will show available slots for booking.
- **No manual register**: Use **Appointments** and **Billing** instead of a paper register.
- **Mobile**: Use the same Web app URL on a phone; the layout is basic and readable on small screens.
