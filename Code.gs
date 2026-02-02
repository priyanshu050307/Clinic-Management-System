/**
 * Clinic Management System (CMS) - Entry Point & Routing
 * GAS-only build. Serves HTML by role and handles doGet/doPost.
 */

var SPREADSHEET_ID = null; // Set via script property or first run

/**
 * Entry point for web app. Serves login or role-based page.
 * Session is validated via PropertiesService; unauthorized users see login.
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var session = getSessionFromParams(params);
  var html;
  var title = 'Clinic Management System';

  try {
    if (!session || !session.role) {
      html = getLoginPage();
    } else {
      switch (session.role) {
        case 'Admin':
          html = getAdminPage();
          break;
        case 'Doctor':
          html = getDoctorPage();
          break;
        case 'Patient':
          html = getPatientPage();
          break;
        default:
          html = getLoginPage();
      }
    }
  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Error</title></head><body style="font-family:sans-serif;padding:20px;">' +
      '<h1>Page load error</h1><p>Something went wrong when loading the page. This helps you find the cause:</p>' +
      '<pre style="background:#f5f5f5;padding:12px;overflow:auto;">' + (err.message || err.toString()) + '</pre>' +
      '<p><a href="#" onclick="window.location.href=window.location.pathname;return false;">Back to login</a></p></body></html>';
  }

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Serves login page (index). Injects app URL so redirect after login goes to /exec (not iframe URL).
 */
function getLoginPage() {
  var t = HtmlService.createTemplateFromFile('index');
  t.appUrl = ''; // default so appUrl is always defined in template
  try {
    t.appUrl = ScriptApp.getService().getUrl();
  } catch (e) {}
  return t.evaluate();
}

/**
 * Serves admin dashboard. Call only after session check.
 */
function getAdminPage() {
  var t = HtmlService.createTemplateFromFile('admin');
  t.appUrl = '';
  try { t.appUrl = ScriptApp.getService().getUrl(); } catch (e) {}
  return t.evaluate();
}

/**
 * Serves doctor dashboard.
 */
function getDoctorPage() {
  var t = HtmlService.createTemplateFromFile('doctor');
  t.appUrl = '';
  try { t.appUrl = ScriptApp.getService().getUrl(); } catch (e) {}
  return t.evaluate();
}

/**
 * Serves patient dashboard.
 */
function getPatientPage() {
  var t = HtmlService.createTemplateFromFile('patient');
  t.appUrl = '';
  try { t.appUrl = ScriptApp.getService().getUrl(); } catch (e) {}
  return t.evaluate();
}

/**
 * Return dashboard HTML for the given session token (no redirect).
 * Used after login: client replaces page content with this HTML so dashboard stays visible.
 */
function getDashboardHtml(sessionToken) {
  if (!sessionToken) return '';
  var session = getSessionFromToken(sessionToken);
  if (!session || !session.role) return '';
  var t;
  if (session.role === 'Admin') {
    t = HtmlService.createTemplateFromFile('admin');
  } else if (session.role === 'Doctor') {
    t = HtmlService.createTemplateFromFile('doctor');
  } else if (session.role === 'Patient') {
    t = HtmlService.createTemplateFromFile('patient');
  } else {
    return '';
  }
  t.appUrl = '';
  try { t.appUrl = ScriptApp.getService().getUrl(); } catch (e) {}
  t.sessionToken = sessionToken;
  return t.evaluate().getContent();
}

/**
 * Include shared CSS/JS in HTML templates.
 * Usage in HTML: <?!= include('shared-css'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Resolve spreadsheet ID: script property > active spreadsheet.
 */
function getSpreadsheet() {
  if (!SPREADSHEET_ID) {
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (id) {
      SPREADSHEET_ID = id;
    } else {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss) {
          SPREADSHEET_ID = ss.getId();
          PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', SPREADSHEET_ID);
        }
      } catch (err) {
        throw new Error('No spreadsheet linked. Run from a container-bound script or set SPREADSHEET_ID in Script Properties.');
      }
    }
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * One-time setup: ensure all sheets and headers exist.
 * Run this once from Script Editor after binding to your spreadsheet.
 */
function setupSheets() {
  var ss = getSpreadsheet();
  var sheetNames = [
    'Users',
    'Appointments',
    'Prescriptions',
    'Billing',
    'Expenses',
    'Salaries',
    'DoctorAvailability'
  ];
  var headers = getSheetHeaders();
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    if (sh.getLastRow() === 0 && headers[name]) {
      sh.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
      sh.getRange(1, 1, 1, headers[name].length).setFontWeight('bold');
    }
  }
  return 'Sheets setup complete.';
}

/**
 * Column headers for each sheet. Used by setupSheets().
 */
function getSheetHeaders() {
  return {
    Users: ['UserId', 'Email', 'Phone', 'PasswordHash', 'Role', 'Name', 'CreatedAt'],
    Appointments: ['AppointmentId', 'PatientUserId', 'DoctorUserId', 'SlotStart', 'SlotEnd', 'Status', 'CreatedAt'],
    Prescriptions: ['PrescriptionId', 'AppointmentId', 'PatientUserId', 'DoctorUserId', 'Content', 'CreatedAt'],
    Billing: ['BillId', 'AppointmentId', 'PatientUserId', 'DoctorUserId', 'Amount', 'Status', 'CreatedAt'],
    Expenses: ['ExpenseId', 'Description', 'Amount', 'Date', 'CreatedAt'],
    Salaries: ['SalaryId', 'UserId', 'Month', 'Year', 'Amount', 'Type', 'CreatedAt'],
    DoctorAvailability: ['AvailabilityId', 'DoctorUserId', 'DayOfWeek', 'StartTime', 'EndTime', 'CreatedAt']
  };
}
