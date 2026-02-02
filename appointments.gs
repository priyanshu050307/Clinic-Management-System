/**
 * CMS - Appointment Management
 * Doctor visiting hours, 15-min slots, booking, prevent double booking.
 */

/**
 * Get doctors list (for admin/patient dropdowns).
 */
function getDoctorsList(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Users');
  if (!sh) return { error: 'Users sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var roleIdx = headers.indexOf('Role');
  var nameIdx = headers.indexOf('Name');
  var idIdx = headers.indexOf('UserId');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][roleIdx] === 'Doctor') {
      list.push({
        userId: data[i][idIdx],
        name: nameIdx >= 0 ? data[i][nameIdx] : ''
      });
    }
  }
  return { doctors: list };
}

/**
 * Save or update doctor availability (start time, end time per day).
 * Payload: { doctorUserId, dayOfWeek (0-6), startTime, endTime }.
 */
function saveDoctorAvailability(sessionToken, payload) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  if (session.role !== 'Admin' && session.userId !== payload.doctorUserId) return { error: 'Forbidden' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('DoctorAvailability');
  if (!sh) return { error: 'DoctorAvailability sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('AvailabilityId');
  var docIdx = headers.indexOf('DoctorUserId');
  var dayIdx = headers.indexOf('DayOfWeek');
  var startIdx = headers.indexOf('StartTime');
  var endIdx = headers.indexOf('EndTime');
  var day = parseInt(payload.dayOfWeek, 10);
  if (isNaN(day) || day < 0 || day > 6) return { error: 'Invalid day (0-6)' };
  var startTime = payload.startTime || '09:00';
  var endTime = payload.endTime || '17:00';
  for (var i = 1; i < data.length; i++) {
    if (data[i][docIdx] === payload.doctorUserId && String(data[i][dayIdx]) === String(day)) {
      sh.getRange(i + 1, startIdx + 1).setValue(startTime);
      sh.getRange(i + 1, endIdx + 1).setValue(endTime);
      return { success: true };
    }
  }
  var row = [
    generateId(),
    payload.doctorUserId,
    day,
    startTime,
    endTime,
    new Date().toISOString()
  ];
  sh.appendRow(row);
  return { success: true };
}

/**
 * Get availability for a doctor (for a given day or all).
 */
function getDoctorAvailability(sessionToken, doctorUserId, dayOfWeek) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('DoctorAvailability');
  if (!sh) return { error: 'Sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var docIdx = headers.indexOf('DoctorUserId');
  var dayIdx = headers.indexOf('DayOfWeek');
  var startIdx = headers.indexOf('StartTime');
  var endIdx = headers.indexOf('EndTime');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][docIdx] !== doctorUserId) continue;
    var d = data[i][dayIdx];
    if (dayOfWeek != null && String(d) !== String(dayOfWeek)) continue;
    list.push({
      dayOfWeek: d,
      startTime: data[i][startIdx],
      endTime: data[i][endIdx]
    });
  }
  return { availability: list };
}

/**
 * Generate 15-minute slots between start and end time for a given date.
 */
function getSlotsForRange(dateStr, startTime, endTime) {
  var date = new Date(dateStr);
  if (isNaN(date.getTime())) return [];
  var start = parseTime(startTime);
  var end = parseTime(endTime);
  if (start == null || end == null || start >= end) return [];
  var slots = [];
  var base = new Date(date);
  base.setHours(0, 0, 0, 0);
  for (var m = start; m < end; m += 15) {
    var slotStart = new Date(base.getTime() + m * 60 * 1000);
    var slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      label: formatTime(slotStart)
    });
  }
  return slots;
}

function parseTime(t) {
  if (!t) return null;
  var s = t.toString().trim();
  var parts = s.split(':');
  if (parts.length < 2) return null;
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) || 0;
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatTime(d) {
  var h = d.getHours();
  var m = d.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/**
 * Get available slots for a doctor on a date (excluding already booked).
 */
function getAvailableSlots(sessionToken, doctorUserId, dateStr) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: 'Invalid date' };
  var dayOfWeek = date.getDay();
  var avail = getDoctorAvailability(sessionToken, doctorUserId, dayOfWeek);
  if (avail.error) return avail;
  if (!avail.availability || avail.availability.length === 0) {
    return { slots: [], message: 'No visiting hours for this day.' };
  }
  var dateOnly = (dateStr.split('T')[0] || dateStr).substring(0, 10);
  var allSlots = [];
  for (var a = 0; a < avail.availability.length; a++) {
    var range = getSlotsForRange(
      dateOnly,
      avail.availability[a].startTime,
      avail.availability[a].endTime
    );
    for (var r = 0; r < range.length; r++) allSlots.push(range[r]);
  }
  var booked = getBookedSlotsForDoctorOnDate(doctorUserId, dateOnly);
  var available = [];
  for (var i = 0; i < allSlots.length; i++) {
    var slot = allSlots[i];
    var taken = false;
    for (var b = 0; b < booked.length; b++) {
      if (booked[b].start === slot.start) { taken = true; break; }
    }
    if (!taken) available.push(slot);
  }
  return { slots: available };
}

function getBookedSlotsForDoctorOnDate(doctorUserId, dateOnly) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Appointments');
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var docIdx = headers.indexOf('DoctorUserId');
  var startIdx = headers.indexOf('SlotStart');
  var statusIdx = headers.indexOf('Status');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][docIdx] !== doctorUserId) continue;
    if (data[i][statusIdx] === 'Cancelled') continue;
    var startStr = data[i][startIdx];
    if (!startStr) continue;
    var slotDate = startStr.toString().substring(0, 10);
    if (slotDate === dateOnly) {
      list.push({ start: new Date(startStr).toISOString() });
    }
  }
  return list;
}

/**
 * Book appointment (patient books a slot).
 */
function bookAppointment(sessionToken, doctorUserId, slotStart) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  if (session.role !== 'Patient') return { error: 'Only patients can book.' };
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  if (!apptSh) return { error: 'Appointments sheet not found' };
  var data = apptSh.getDataRange().getValues();
  var headers = data[0];
  var docIdx = headers.indexOf('DoctorUserId');
  var startIdx = headers.indexOf('SlotStart');
  var statusIdx = headers.indexOf('Status');
  for (var i = 1; i < data.length; i++) {
    if (data[i][docIdx] === doctorUserId && data[i][startIdx] && data[i][statusIdx] !== 'Cancelled') {
      var existingStart = new Date(data[i][startIdx]).toISOString();
      if (existingStart === slotStart) return { error: 'Slot already booked.' };
    }
  }
  var slotEnd = new Date(new Date(slotStart).getTime() + 15 * 60 * 1000).toISOString();
  var row = [
    generateId(),
    session.userId,
    doctorUserId,
    slotStart,
    slotEnd,
    'Scheduled',
    new Date().toISOString()
  ];
  apptSh.appendRow(row);
  return { success: true, message: 'Appointment booked.' };
}

/**
 * Get appointments for current user (by role: doctor sees own, patient sees own, admin sees all).
 */
function getMyAppointments(sessionToken, fromDate, toDate) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  var userSh = ss.getSheetByName('Users');
  if (!apptSh || !userSh) return { error: 'Sheets not found' };
  var apptData = apptSh.getDataRange().getValues();
  var userData = userSh.getDataRange().getValues();
  var apptH = apptData[0];
  var userH = userData[0];
  var pid = apptH.indexOf('PatientUserId');
  var did = apptH.indexOf('DoctorUserId');
  var startId = apptH.indexOf('SlotStart');
  var statusId = apptH.indexOf('Status');
  var apptIdCol = apptH.indexOf('AppointmentId');
  var nameIdx = userH.indexOf('Name');
  var uidIdx = userH.indexOf('UserId');
  var from = fromDate ? new Date(fromDate).getTime() : 0;
  var to = toDate ? new Date(toDate).getTime() : Number.MAX_VALUE;
  var list = [];
  for (var i = 1; i < apptData.length; i++) {
    var row = apptData[i];
    var slotStart = row[startId];
    if (!slotStart) continue;
    var t = new Date(slotStart).getTime();
    if (t < from || t > to) continue;
    var include = false;
    if (session.role === 'Admin') include = true;
    else if (session.role === 'Doctor' && row[did] === session.userId) include = true;
    else if (session.role === 'Patient' && row[pid] === session.userId) include = true;
    if (!include) continue;
    var doctorName = '';
    var patientName = '';
    for (var u = 1; u < userData.length; u++) {
      if (userData[u][uidIdx] === row[did]) doctorName = userData[u][nameIdx] || '';
      if (userData[u][uidIdx] === row[pid]) patientName = userData[u][nameIdx] || '';
    }
    list.push({
      appointmentId: row[apptIdCol],
      slotStart: slotStart,
      slotEnd: row[apptH.indexOf('SlotEnd')],
      status: row[statusId],
      doctorName: doctorName,
      patientName: patientName,
      patientUserId: row[pid],
      doctorUserId: row[did]
    });
  }
  list.sort(function(a, b) { return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(); });
  return { appointments: list };
}

/**
 * Get today's appointments for a doctor (for prescription screen).
 */
function getTodayAppointmentsForDoctor(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Doctor') return { error: 'Unauthorized' };
  var today = new Date();
  var start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  var end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  return getMyAppointments(sessionToken, start, end);
}

/**
 * Cancel appointment (patient or admin).
 */
function cancelAppointment(sessionToken, appointmentId) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Appointments');
  if (!sh) return { error: 'Sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('AppointmentId');
  var statusIdx = headers.indexOf('Status');
  var patientIdx = headers.indexOf('PatientUserId');
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx] === appointmentId) {
      if (session.role !== 'Admin' && data[i][patientIdx] !== session.userId) return { error: 'Forbidden' };
      sh.getRange(i + 1, statusIdx + 1).setValue('Cancelled');
      return { success: true };
    }
  }
  return { error: 'Appointment not found' };
}
