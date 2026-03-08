# Step-by-Step: Test Appointments, Billing & Prescriptions

Follow these steps in order to check that appointments, prescriptions, and billing work end-to-end.

---

## Step 1: Login as Admin

1. Open your Web App URL (the one ending in `/exec`).
2. **Email:** `admin@clinic.com`  
   **Password:** `admin123`  
   (or your own admin account.)
3. Click **Sign in**. You should see the **Admin** dashboard.

---

## Step 2: Add a Doctor

1. In the Admin dashboard, click **Users** in the nav.
2. Fill in:
   - **Role:** Doctor
   - **Email:** e.g. `doctor@clinic.com`
   - **Phone:** e.g. `9876543210` (optional)
   - **Password:** e.g. `doctor123`
   - **Name:** e.g. `Dr. Smith`
3. Click **Add user**.
4. Remember this email and password; you will use them to log in as the doctor later.

---

## Step 3: Add a Patient

1. Still in **Users**, fill in:
   - **Role:** Patient
   - **Email:** e.g. `patient@clinic.com`
   - **Phone:** e.g. `9123456789` (optional)
   - **Password:** e.g. `patient123`
   - **Name:** e.g. `John Patient`
2. Click **Add user**.
3. Remember this email and password; you will use them to log in as the patient.

---

## Step 4: Set Doctor Visiting Hours (Slots)

1. In Admin, click **Doctor hours** in the nav.
2. **Doctor:** Select the doctor you added (e.g. Dr. Smith).
3. **Day (0=Sun … 6=Sat):** e.g. `1` for Monday (use the day number for when you want to test).
4. **Start time:** e.g. `09:00`
5. **End time:** e.g. `17:00`
6. Click **Save**.
7. Repeat for each day the doctor works (e.g. 1=Mon, 2=Tue, …, 5=Fri).  
   Without this, the patient will not see any available slots when booking.

---

## Step 5: Book an Appointment (as Patient)

1. **Sign out** (click **Sign out** in the top right).
2. On the login page, sign in with the **patient** account:
   - **Email:** `patient@clinic.com`  
   - **Password:** `patient123`
3. You should see the **Patient** dashboard.
4. Click **Book appointment** in the nav.
5. **Doctor:** Select the doctor (e.g. Dr. Smith).
6. **Date:** Pick **today’s date** (or a date when the doctor has hours set).
7. Click **Show available slots**.
8. You should see a list of 15-minute slots (e.g. 09:00, 09:15, 09:30, …).
9. Click **Book** on any slot. You should see a success message.
10. Click **My appointments** to see the booked appointment.

---

## Step 6: Write Prescription & Create Bill (as Doctor)

1. **Sign out**.
2. Sign in with the **doctor** account:
   - **Email:** `doctor@clinic.com`  
   - **Password:** `doctor123`
3. You should see the **Doctor** dashboard.
4. Click **Today's appointments** – you should see the appointment you just booked (patient name, time).
5. Click **Write prescription** in the nav.
   - **Appointment:** Select today’s appointment (patient + time).
   - **Prescription content:** Type e.g. “Paracetamol 500mg – 1 tablet twice daily for 5 days.”
   - Click **Save prescription**.
6. Click **Create bill** in the nav.
   - **Appointment:** Select the same appointment.
   - **Amount:** e.g. `500` (consultation fee).
   - Click **Create bill**.

---

## Step 7: Check Prescription & Bill (as Patient)

1. **Sign out**.
2. Sign in again as the **patient** (`patient@clinic.com` / `patient123`).
3. Click **My prescriptions** – you should see the prescription the doctor wrote (content, date, doctor name).
4. Click **My bills** – you should see the bill (amount, date, doctor name).
5. Click **View / Print** on that bill – the invoice should open; use the browser **Print** (Ctrl+P / Cmd+P) to print if needed.

---

## Quick Checklist

| Step | Who    | Action |
|------|--------|--------|
| 1    | Admin  | Login |
| 2    | Admin  | Add Doctor (Users) |
| 3    | Admin  | Add Patient (Users) |
| 4    | Admin  | Set Doctor hours (Doctor hours) for at least one day (e.g. today) |
| 5    | Patient| Book appointment (Book appointment → pick doctor, date → Show slots → Book) |
| 6    | Doctor | Today's appointments → Write prescription → Create bill |
| 7    | Patient| My prescriptions, My bills, View/Print invoice |

---

## Tips

- **No slots showing:** Make sure you set **Doctor hours** for the **same day** as the date you pick (e.g. if testing on Monday, set Day = 1 and pick a Monday date).
- **Today’s appointments empty:** Book the appointment for **today** and use the doctor account on the **same day** to see it under Today's appointments.
- **Prescription / bill:** Doctor can only choose from **today’s** appointments in the dropdowns; book an appointment for today before testing.

---

## Optional: Doctor Sets Own Hours

1. Login as **Doctor**.
2. Click **My hours** in the nav.
3. Set **Day**, **Start time**, **End time** and click **Save**.  
   This does the same as Admin → Doctor hours, but for the logged-in doctor only.
