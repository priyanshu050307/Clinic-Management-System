/**
 * CMS - Authentication & Access Control
 * Login via phone/email + password. Session in PropertiesService.
 */

var SESSION_PREFIX = 'cms_session_';
var SESSION_TTL_DAYS = 1;

/**
 * Generate a unique ID for records (UUID-like string).
 */
function generateId() {
  return Utilities.getUuid().replace(/-/g, '');
}

/**
 * Simple hash for password storage (obscurity only; PRD excludes encryption).
 */
function hashPassword(plain) {
  if (!plain) return '';
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain, Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('');
}

/**
 * Validate session from query params. Returns { userId, role, name } or null.
 */
function getSessionFromParams(params) {
  if (!params || !params.session) return null;
  var key = SESSION_PREFIX + params.session;
  var userProps = PropertiesService.getUserProperties();
  var stored = userProps.getProperty(key);
  if (!stored) return null;
  var parts = stored.split('|');
  if (parts.length < 4) return null;
  var expiry = parseInt(parts[3], 10);
  if (new Date().getTime() > expiry) {
    userProps.deleteProperty(key);
    return null;
  }
  return {
    userId: parts[0],
    role: parts[1],
    name: parts[2] || ''
  };
}

/**
 * Create session for user. Returns session token.
 */
function createSession(userId, role, name) {
  var token = generateId();
  var expiry = new Date().getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  var value = [userId, role, name || '', expiry].join('|');
  PropertiesService.getUserProperties().setProperty(SESSION_PREFIX + token, value);
  return token;
}

/**
 * Logout: remove session from PropertiesService.
 */
function logout(sessionToken) {
  if (sessionToken) {
    PropertiesService.getUserProperties().deleteProperty(SESSION_PREFIX + sessionToken);
  }
  return true;
}

/**
 * Login with email or phone + password.
 * Returns { success, sessionToken, role, name, error }.
 */
function login(identifier, password) {
  if (!identifier || !password) {
    return { success: false, error: 'Email/phone and password required.' };
  }
  identifier = identifier.trim().toLowerCase();
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Users');
  if (!sh) return { success: false, error: 'Users sheet not found. Run setupSheets().' };
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: 'No users. Create admin first.' };
  var headers = data[0];
  var emailIdx = headers.indexOf('Email');
  var phoneIdx = headers.indexOf('Phone');
  var passIdx = headers.indexOf('PasswordHash');
  var roleIdx = headers.indexOf('Role');
  var nameIdx = headers.indexOf('Name');
  var idIdx = headers.indexOf('UserId');
  if (emailIdx < 0 || passIdx < 0 || roleIdx < 0) {
    return { success: false, error: 'Users sheet missing columns.' };
  }
  var hashed = hashPassword(password);
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var email = (row[emailIdx] || '').toString().trim().toLowerCase();
    var phone = (row[phoneIdx] != null ? row[phoneIdx].toString().trim() : '');
    var match = email === identifier || phone === identifier;
    if (match && row[passIdx] === hashed) {
      var role = row[roleIdx];
      var name = nameIdx >= 0 ? (row[nameIdx] || '') : '';
      var userId = idIdx >= 0 ? row[idIdx] : '';
      var token = createSession(userId, role, name);
      return { success: true, sessionToken: token, role: role, name: name };
    }
  }
  return { success: false, error: 'Invalid email/phone or password.' };
}

/**
 * Server-side: ensure current request has valid session of allowed role.
 * Call from .gs endpoints that serve admin/doctor/patient data.
 */
function requireSession(allowedRoles) {
  var params = null;
  try {
    params = getRequestParams();
  } catch (e) {}
  if (!params) return null;
  var session = getSessionFromParams(params);
  if (!session) return null;
  if (allowedRoles && allowedRoles.indexOf(session.role) < 0) return null;
  return session;
}

/**
 * Validate session from token (for server-side API). Frontend passes sessionToken to each call.
 */
function getSessionFromToken(sessionToken) {
  if (!sessionToken) return null;
  return getSessionFromParams({ session: sessionToken });
}

/**
 * Add user (Admin only). Role: Admin, Doctor, or Patient.
 */
function addUser(sessionToken, role, email, phone, password, name) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  if (!role || !email) return { error: 'Role and email required.' };
  if (['Admin', 'Doctor', 'Patient'].indexOf(role) < 0) return { error: 'Invalid role.' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Users');
  if (!sh) return { error: 'Users sheet not found' };
  var data = sh.getDataRange().getValues();
  var emailIdx = data[0].indexOf('Email');
  for (var i = 1; i < data.length; i++) {
    if ((data[i][emailIdx] || '').toString().toLowerCase() === email.trim().toLowerCase()) {
      return { error: 'Email already registered.' };
    }
  }
  var userId = generateId();
  var passwordHash = hashPassword(password || '');
  var row = [userId, email.trim().toLowerCase(), (phone || '').toString().trim(), passwordHash, role, (name || '').toString().trim(), new Date().toISOString()];
  sh.appendRow(row);
  return { success: true, userId: userId };
}

/**
 * Get all users (Admin only). For dropdowns e.g. salary.
 */
function getUsers(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Users');
  if (!sh) return { error: 'Sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('UserId');
  var nameIdx = headers.indexOf('Name');
  var emailIdx = headers.indexOf('Email');
  var roleIdx = headers.indexOf('Role');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      userId: data[i][idIdx],
      name: (nameIdx >= 0 ? data[i][nameIdx] : '') || data[i][emailIdx] || data[i][idIdx],
      email: data[i][emailIdx],
      role: data[i][roleIdx]
    });
  }
  return { users: list };
}

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
  var headers = data[0];
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
