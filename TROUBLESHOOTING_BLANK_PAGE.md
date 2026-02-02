# Troubleshooting: Blank Page After Admin Login

If you see a **blank page** after logging in as the default admin, use these steps to find and fix the cause.

---

## If Network shows "200" and type "document" but the page is still blank

The server is returning a **successful HTML response**, but the screen is empty. Only two possibilities:

### A. The response body is empty or tiny

1. In **DevTools** → **Network**, click the **document** request (the one with status 200).
2. Open the **Response** (or **Preview**) tab.
3. See whether the HTML is **empty** or has real content (e.g. `<!DOCTYPE html>`, `<h1>Clinic Management System</h1>`).

- **If the response is empty or almost empty:**  
  The server is sending a blank page. Common causes:
  - **admin.html** (or **shared-css** / **shared-js**) is missing or empty in the Apps Script project.
  - File names don’t match: use **admin**, **shared-css**, **shared-js** (lowercase, with hyphen). Rename the files in the project if needed.
  - After changing files, create a **new deployment version** and test again.

- **If the response has full HTML** (doctype, head, body, content):  
  The problem is in the **browser**: script error or redirect. Go to **Console** and look for red errors. If you see *"Script not loaded. Check that shared-js is included..."*, the **shared-js** file is not loading (wrong name or not deployed).

### B. Session missing from URL after login

After you click Sign in, the address bar should be:

`https://script.google.com/macros/s/.../exec?session=...`

If there is **no `?session=...`**, the app thinks you’re not logged in and may redirect or show a blank view. Check the login response in Network (the one that runs after clicking Sign in): it should return JSON with `success: true` and a `sessionToken`. If not, login failed or the redirect URL is wrong.

---

## 1. See the actual error (after the fix)

The project now has **error handling** in `doGet`. If the admin page fails to load (e.g. missing file or script error), you should see a **"Page load error"** screen with the error message instead of a blank page.

- **Redeploy** the Web App (Deploy → Manage deployments → Edit → Version: New version → Deploy).
- Log in again. If something is failing, you should now see the error text.
- Fix the issue (e.g. file name, missing file) and redeploy again.

---

## 2. Check the URL after login

After you click **Sign in**, the browser should **redirect** to the **same** Web App URL **with** a session parameter, for example:

`https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?session=long_token_here`

- **If the URL does NOT have `?session=...`**  
  The redirect is wrong or the session token was not received. You would then get the login page again (or a blank page if something else is wrong).

- **What to do:**  
  - Open **Developer Tools** (F12) → **Console** tab.  
  - Log in again.  
  - Check for red errors (e.g. `redirectWithSession` or `login` failing).  
  - In **Network** tab, see if the login request returns `success: true` and a `sessionToken`.

---

## 3. Session not found (most common)

The session is stored in **PropertiesService.getUserProperties()**, which is tied to **who runs the script**:

- **Deploy setting: "Execute as: Me"**  
  The script always runs as **you** (the owner). The session is stored in **your** User Properties.  
  So: **you** must be the one opening the app and logging in. If someone else opens the link and logs in, the session is still stored under your account; after redirect, the script runs as you again and should find the session. So the owner testing in their own browser should see the admin page.

- **Deploy setting: "Execute as: User accessing the app"**  
  The script runs as the **person opening the app**. They must be **signed in to a Google account** in that browser. If they are in incognito or not signed in, session storage may not work as expected and you can get a blank or login page again.

**What to do:**

1. In Apps Script: **Deploy** → **Manage deployments** → **Edit** (pencil).
2. Check **Execute as**:  
   - Use **"Me"** so that the same account (yours) always runs the script and holds the session.
3. Log in again **in a browser where you are signed in to the same Google account** that owns the script.
4. After login, confirm the URL has `?session=...` (see step 2).

---

## 4. File names (admin / shared files)

The admin page is built from **admin.html** and includes **shared-css** and **shared-js**. If file names do not match exactly, the template can fail and you get a blank or error page.

In the Apps Script project, check that you have **exactly** these file names (capitalisation matters):

- `admin` (or `admin.html` – the editor may hide the extension)
- `shared-css` (or `shared-css.html`)
- `shared-js` (or `shared-js.html`)

The code uses:

- `createTemplateFromFile('admin')`
- `include('shared-css')`
- `include('shared-js')`

So the names in the project must match: **admin**, **shared-css**, **shared-js**. If you created **Admin** or **Shared-css**, rename them to match.

---

## 5. Check Google Apps Script execution log

1. In Apps Script: **Executions** (left sidebar, clock icon).
2. Log in again in the browser, then refresh the Executions list.
3. Open the latest **doGet** execution.
4. If it **failed**, open it and read the error message (and stack trace).
5. If you added the new error handling, errors are also shown on the **"Page load error"** screen (see step 1).

---

## 6. Quick checklist

| Check | What to do |
|------|------------|
| URL after login | Should contain `?session=...`. If not, check browser console and login response. |
| Execute as | Prefer **"Me"** and test while signed in as the script owner. |
| File names | **admin**, **shared-css**, **shared-js** (no wrong capitals). |
| Redeploy | After any change (e.g. Code.gs or HTML), create a **new version** and deploy. |
| Error page | Redeploy, log in again; if you see "Page load error", read the message and fix the cause. |

---

## 7. If it’s still blank

- **Hard refresh** after login: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac).
- Try another browser or an **incognito/private** window (with the same Google account).
- In the browser **Console** (F12 → Console), see if any **red errors** appear when the blank page loads; those often point to the failing script or missing `google.script.run` / `getSessionToken`.

Once the new `doGet` error handling is deployed, the **"Page load error"** message is the first place to look to see why the admin page is not loading.
