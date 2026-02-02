# How to Create the Default Admin

The first admin user is created by running the function **`createDefaultAdmin`** once from the Apps Script editor.

---

## Step 1: Run from the script editor

1. Open your **Google Sheet** (Clinic Management System).
2. Go to **Extensions** → **Apps Script**.
3. In the **left file list**, open **auth.gs** (if you don’t see it, see “If auth.gs is missing” below).
4. At the **top of the editor**, open the **function dropdown** (it shows the current function name).
5. Select **`createDefaultAdmin`** from the list.
6. Click the **Run** button (▶).
7. If asked, **Authorize** the app (choose your Google account and allow access).
8. When it finishes, check the **Execution log** (View → Logs, or the log icon):
   - **Success:** `Default admin created. Email: admin@clinic.com, Password: admin123. Change after first login.`
   - **Already exists:** `Admin already exists.`

---

## Step 2: Log in

- Open your **Web App URL** (the one from Deploy → Web app).
- **Email:** `admin@clinic.com`
- **Password:** `admin123`
- Change the password after first login (e.g. add a new admin from the Users panel and then stop using this one, or edit the Users sheet).

---

## If `createDefaultAdmin` is not in the dropdown

The function lives in **auth.gs**. If you don’t have auth.gs or the function is missing:

1. Add or open **auth.gs** in your Apps Script project.
2. Paste the code below at the **end** of auth.gs (after any other functions).
3. Save (Ctrl+S / Cmd+S).
4. Run **`createDefaultAdmin`** as in Step 1 above.

**Code to add (createDefaultAdmin and helpers it needs):**

```javascript
/**
 * Create first admin user. Run once from Script Editor.
 * Default: admin@clinic.com / admin123 (change after first login).
 */
function createDefaultAdmin() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Users');
  if (!sh) {
    setupSheets();
    sh = ss.getSheetByName('Users');
  }
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === 'Admin') return 'Admin already exists.';
  }
  var userId = generateId();
  var email = 'admin@clinic.com';
  var phone = '';
  var passwordHash = hashPassword('admin123');
  var role = 'Admin';
  var name = 'Clinic Admin';
  var createdAt = new Date().toISOString();
  var row = [userId, email, phone, passwordHash, role, name, createdAt];
  sh.appendRow(row);
  return 'Default admin created. Email: admin@clinic.com, Password: admin123. Change after first login.';
}
```

This function uses **`getSpreadsheet`**, **`setupSheets`**, **`generateId`**, and **`hashPassword`**. Those must exist in your project:

- **Code.gs** should have `getSpreadsheet()` and `setupSheets()`.
- **auth.gs** should have `generateId()` and `hashPassword()`.

If you only add the snippet above, make sure the rest of **auth.gs** (with `generateId` and `hashPassword`) and **Code.gs** (with `getSpreadsheet` and `setupSheets`) are in the project. If not, copy the full **auth.gs** and **Code.gs** from the project again.

---

## If you have no auth.gs at all

Copy the full **auth.gs** file from the CMS project into your Apps Script project (new file → name it **auth.gs** → paste all contents). Then run **`createDefaultAdmin`** once as in Step 1.
