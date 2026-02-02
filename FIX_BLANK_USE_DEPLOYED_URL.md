# Fix: Blank Page – Use the Deployed URL (/exec)

If your Network tab shows **userCodeAppPanel?session=...** and a **blank** document, you are almost certainly opening the app from the **development/test** URL, not the **deployed** Web App URL. In dev/test mode the app often returns a minimal or blank page.

---

## What to do

### 1. Get the real Web App URL

1. Open your **Apps Script** project (the one for the Clinic app).
2. Go to **Deploy** → **Manage deployments**.
3. Click the **pencil (Edit)** on your current deployment (or add one if needed).
4. Under **Web app**, check **Web app URL**.
5. The correct URL should look like:
   ```text
   https://script.google.com/macros/s/AKfycbz...long_id.../exec
   ```
   It must end with **/exec** (not /dev and not userCodeAppPanel).

6. Copy that **full URL** (the one shown as “Web app URL” or “Current web app URL”).

---

### 2. Open the app from that URL only

- **Close** any tab where you had the app open (e.g. from “Test deployments” or “Run” in the editor).
- **Paste** the copied URL into the **address bar** of your browser and press Enter.
- You should see the **login page** (Clinic Management System, email/phone + password).
- Log in with **admin@clinic.com** / **admin123** (or your admin account).

If you use the **/exec** URL, the request in the Network tab should be to **exec?session=...** (or similar), not **userCodeAppPanel?session=...**, and the response should be larger (several KB), not 0.6 kB.

---

### 3. Do not use these for normal use

- **Deploy → Test deployments → “Test” link**  
  This often uses a dev URL and can show userCodeAppPanel and blank/minimal pages.

- **Run → doGet (or “Test web app”) from the editor**  
  Same: dev/test context, not the same as the deployed app.

Use these only for quick checks; for real use and testing after login, always use the **deployed** URL from **Deploy → Manage deployments** (the one ending in **/exec**).

---

### 4. If it’s still blank after using /exec

1. **New version and redeploy**
   - In Apps Script: **Deploy** → **Manage deployments** → **Edit** (pencil).
   - Set **Version** to **New version** (e.g. “Fix blank”), then **Deploy**.
   - Open the **new** Web app URL again (it might be the same URL with a new version).

2. **Hard refresh or incognito**
   - Try **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac), or open the **/exec** URL in an **incognito/private** window and log in again.

3. **Check the document request**
   - In Network, click the **document** request that has the **/exec** URL (and optional `?session=...`).
   - In **Response** or **Preview**, confirm the HTML is your full admin page (doctype, headings, forms), not a tiny 0.6 kB wrapper.

---

## Summary

| Wrong (often blank) | Correct |
|--------------------|--------|
| Test deployments link / Run from editor | Deploy → Manage deployments → Web app URL |
| URL path contains userCodeAppPanel       | URL path ends with **/exec** |
| 0.6 kB document response                | Several KB (full HTML) |

Always open and test the app using the **deployed Web app URL** that ends with **/exec**, then log in. That should fix the blank page when the Network tab shows userCodeAppPanel and a small/blank document.
