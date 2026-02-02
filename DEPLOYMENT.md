# Deployment Steps – Clinic Management System (GAS Web App)

Follow these steps to deploy the CMS as a Google Apps Script Web App using a single Google account.

---

## Where to add appsscript.json (manifest)

In the **Google Apps Script web editor** you can only add **.gs** and **.html** files from the “+” menu. The manifest is handled differently:

- **You do not need to “add” appsscript.json** to run or deploy. Deploy via **Deploy** → **New deployment** → **Web app**; Google will create/update the manifest for you.
- **To view or edit the manifest:** In the Apps Script editor, go to **View** → **Show manifest file**. A file **appsscript.json** will appear in the left file list. You can then open it and paste in the project’s `appsscript.json` contents if you want (e.g. time zone, runtime version). If you never enable this, the default manifest is still used when you deploy.

So: add only the **.gs** and **.html** files in the editor; the manifest is either shown via View → Show manifest file or left to the editor when you deploy.

---

## 1. Create or use a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet (or use an existing one).
2. Name it e.g. **Clinic Management System**.
3. Keep this sheet open; you will bind the script to it.

---

## 2. Add the script (container-bound)

**Option A – Copy code into a new script project**

1. In the spreadsheet menu: **Extensions** → **Apps Script**.
2. Delete any default code in `Code.gs`.
3. Create/upload all project files in the Apps Script project:
   - **Code.gs** – entry and routing
   - **auth.gs** – login, session, users
   - **appointments.gs** – slots, booking, availability
   - **prescriptions.gs** – prescriptions
   - **billing.gs** – bills and invoices
   - **finance.gs** – salaries, expenses, income
   - **index.html** – login page
   - **admin.html**, **doctor.html**, **patient.html** – role dashboards
   - **shared-css.html**, **shared-js.html** – shared styles and scripts
4. Ensure **appsscript.json** exists (manifest). If not, add the Web App block as in the project’s appsscript.json.

**Option B – Clasp (optional)**

1. Install [clasp](https://github.com/google/clasp) and log in.
2. `clasp create --type sheets --title "CMS"` (or clone existing project).
3. Copy all `.gs` and `.html` files into the project folder.
4. `clasp push` to upload.
5. `clasp open` to open the script in the browser and continue from step 3 below.

---

## 3. One-time setup in the script

1. In the Apps Script editor, select the function **`setupSheets`** in the dropdown and click **Run**.
2. Authorize the script when prompted (your Google account).
3. Confirm that the spreadsheet now has these sheets (tabs):  
   **Users**, **Appointments**, **Prescriptions**, **Billing**, **Expenses**, **Salaries**, **DoctorAvailability**, with correct header rows.

4. Run **`createDefaultAdmin`** once to create the first admin user:
   - Email: **admin@clinic.com**
   - Password: **admin123**  
   Change this password after first login.

---

## 4. Deploy as Web App

1. In the Apps Script editor: **Deploy** → **New deployment**.
2. Click the gear icon next to **Select type** → choose **Web app**.
3. Set:
   - **Description:** e.g. “CMS v1”
   - **Execute as:** **Me** (your account)
   - **Who has access:** **Anyone** (so patients/doctors can open the link without signing into Google; you can restrict later if needed)
4. Click **Deploy**.
5. Copy the **Web app URL** (e.g. `https://script.google.com/macros/s/.../exec`). This is your app’s login URL.

---

## 5. Optional: Standalone script (different spreadsheet)

If the script is **not** bound to the spreadsheet (e.g. standalone script):

1. In the script project: **Project Settings** (gear icon).
2. Add a **Script property**: name **`SPREADSHEET_ID`**, value = the ID of your Google Sheet (from the sheet’s URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`).
3. Run **`setupSheets`** and **`createDefaultAdmin`** from the script editor as in step 3.

---

## 6. Post-deployment

- Share the Web app URL with doctors and patients.
- Each user must have a row in the **Users** sheet (Admin can add users from the **Users** panel).
- Doctors should set **Doctor visiting hours** (Admin or Doctor panel) so patients see available 15-minute slots.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create/bind one Google Sheet |
| 2 | Add all .gs and .html files to the Apps Script project |
| 3 | Run `setupSheets()` then `createDefaultAdmin()` |
| 4 | Deploy as Web app (Execute as: Me, Who has access: Anyone) |
| 5 | Use the Web app URL as the clinic’s login page |
