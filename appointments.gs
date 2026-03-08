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
function getAvailableSlots(token, doctorUserId, date) {
  try {
    // 1️⃣ Validate session
    var session = getSessionFromToken(token);
    if (!session) {
      return { error: 'Invalid session.' };
    }

    if (!doctorUserId || !date) {
      return { error: 'Doctor and date are required.' };
    }

    // 2️⃣ SAFE date parsing (NO timezone bug)
    var d = date.split('-'); // YYYY-MM-DD
    var selectedDate = new Date(
      Number(d[0]),
      Number(d[1]) - 1,
      Number(d[2])
    );
    var dayOfWeek = selectedDate.getDay(); // 0 = Sun ... 6 = Sat

    // 3️⃣ Fetch doctor availability (use same spreadsheet helper everywhere)
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('DoctorAvailability');
    if (!sheet) {
      return { error: 'DoctorAvailability sheet not found.' };
    }

    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    var idxDoctor = headers.indexOf('DoctorUserId');
    var idxDay = headers.indexOf('DayOfWeek');
    var idxStart = headers.indexOf('StartTime');
    var idxEnd = headers.indexOf('EndTime');

    var availability = data.filter(function(r) {
      return r[idxDoctor] === doctorUserId && Number(r[idxDay]) === dayOfWeek;
    });

    if (!availability.length) {
      return { message: 'Doctor not available on this day.', slots: [] };
    }

    // 4️⃣ Fetch already booked appointments
    var apptSheet = ss.getSheetByName('Appointments');
    var booked = {};

    if (apptSheet) {
      var apptData = apptSheet.getDataRange().getValues();
      var apptHeaders = apptData.shift();

      var aDoctor = apptHeaders.indexOf('DoctorUserId');
      var aSlot = apptHeaders.indexOf('SlotStart');
      var aStatus = apptHeaders.indexOf('Status');

      apptData.forEach(function(r) {
        var status = (r[aStatus] || '').toString().toLowerCase();
        var isActive = status && status !== 'cancelled';  // only non-cancelled are blocking

        if (r[aDoctor] === doctorUserId && r[aSlot] && isActive) {
        var key = normalizeSlot(new Date(r[aSlot]));
        booked[key] = true;
        }
      });
    }

    // 5️⃣ Slot builder (15-minute slots)
    function buildDateTime(dateStr, timeVal) {
      var dd = dateStr.split('-');

      var hours = 0;
      var minutes = 0;

      if (timeVal instanceof Date) {
        // Time stored as a Date object in the sheet
        hours = timeVal.getHours();
        minutes = timeVal.getMinutes();
      } else {
        // Fallback: assume string like "HH:mm"
        var s = (timeVal != null ? String(timeVal) : '').trim();
        var tt = s.split(':');
        hours = Number(tt[0]) || 0;
        minutes = Number(tt[1]) || 0;
      }

      return new Date(
        Number(dd[0]),
        Number(dd[1]) - 1,
        Number(dd[2]),
        hours,
        minutes,
        0,
        0
      );
    }

    function normalizeSlot(dt) {
      return dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0') + ' ' +
        String(dt.getHours()).padStart(2, '0') + ':' +
        String(dt.getMinutes()).padStart(2, '0');
    }

    var slots = [];

    // 6️⃣ Generate slots
    availability.forEach(function(a) {
      var start = buildDateTime(date, a[idxStart]);
      var end = buildDateTime(date, a[idxEnd]);

      while (start < end) {
        var key = normalizeSlot(start);

        if (!booked[key]) {
          slots.push({
            start: start.toISOString(),
            label: Utilities.formatDate(
              start,
              Session.getScriptTimeZone(),
              'HH:mm'
            ),
            available: true // explicitly mark as available for frontend
          });
        }

        start = new Date(start.getTime() + 15 * 60 * 1000); // +15 min
      }
    });

    return { slots: slots };

  } catch (e) {
    return { error: e.message };
  }
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
  // Use full day range: from = start of fromDate, to = end of toDate (avoids timezone bug where same date gave same midnight for both)
  var from = 0;
  if (fromDate) {
    var dFrom = new Date(fromDate + 'T00:00:00');
    from = isNaN(dFrom.getTime()) ? 0 : dFrom.getTime();
  }
  var to = Number.MAX_VALUE;
  if (toDate) {
    var dTo = new Date(toDate + 'T23:59:59.999');
    to = isNaN(dTo.getTime()) ? Number.MAX_VALUE : dTo.getTime();
  }
  var list = [];
  for (var i = 1; i < apptData.length; i++) {
    var row = apptData[i];
    var slotStart = row[startId];
    if (!slotStart) continue;
    var t = new Date(slotStart).getTime();
    if (t < from || t > to) continue;
    var include = false;
    if (session.role === 'Admin') include = true;
    else if (session.role === 'Doctor' && String(row[did]) === String(session.userId)) include = true;
    else if (session.role === 'Patient' && String(row[pid]) === String(session.userId)) include = true;
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
 * Get today's appointments for a doctor (for Today's appointments tab).
 * Uses script timezone for "today" and explicit DoctorUserId filtering for reliable display.
 */
function getDoctorTodayAppointments(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Doctor') return { error: 'Unauthorized' };
  var doctorId = String(session.userId);
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  var userSh = ss.getSheetByName('Users');
  if (!apptSh || !userSh) return { error: 'Sheets not found' };

  var tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  var now = new Date();
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

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

  var list = [];
  for (var i = 1; i < apptData.length; i++) {
    var row = apptData[i];
    if (String(row[did]) !== doctorId) continue;
    if (String(row[statusId] || '').toLowerCase() === 'cancelled') continue;
    var slotStart = row[startId];
    if (!slotStart) continue;
    var slotDateStr = Utilities.formatDate(new Date(slotStart), tz, 'yyyy-MM-dd');
    if (slotDateStr !== todayStr) continue;

    var patientName = '';
    for (var u = 1; u < userData.length; u++) {
      if (String(userData[u][uidIdx]) === String(row[pid])) {
        patientName = userData[u][nameIdx] || '';
        break;
      }
    }
    list.push({
      appointmentId: row[apptIdCol],
      slotStart: slotStart,
      slotEnd: row[apptH.indexOf('SlotEnd')],
      status: row[statusId] || 'Scheduled',
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
  return getDoctorTodayAppointments(sessionToken);
}

/**
 * If an appointment has both a prescription and a bill, mark it as Completed.
 */
function maybeCompleteAppointment(appointmentId) {
  if (!appointmentId) return;
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  var prescSh = ss.getSheetByName('Prescriptions');
  var billSh = ss.getSheetByName('Billing');
  if (!apptSh || !prescSh || !billSh) return;

  var apptData = apptSh.getDataRange().getValues();
  var apptH = apptData[0];
  var apptIdIdx = apptH.indexOf('AppointmentId');
  var statusIdx = apptH.indexOf('Status');
  if (apptIdIdx === -1 || statusIdx === -1) return;

  var apptRow = -1;
  for (var i = 1; i < apptData.length; i++) {
    if (apptData[i][apptIdIdx] === appointmentId) {
      apptRow = i;
      break;
    }
  }
  if (apptRow === -1) return;

  var prescData = prescSh.getDataRange().getValues();
  var prescH = prescData[0];
  var prescApptIdx = prescH.indexOf('AppointmentId');
  var hasPresc = false;
  if (prescApptIdx !== -1) {
    for (var p = 1; p < prescData.length; p++) {
      if (prescData[p][prescApptIdx] === appointmentId) {
        hasPresc = true;
        break;
      }
    }
  }

  var billData = billSh.getDataRange().getValues();
  var billH = billData[0];
  var billApptIdx = billH.indexOf('AppointmentId');
  var hasBill = false;
  if (billApptIdx !== -1) {
    for (var b = 1; b < billData.length; b++) {
      if (billData[b][billApptIdx] === appointmentId) {
        hasBill = true;
        break;
      }
    }
  }

  if (hasPresc && hasBill) {
    apptSh.getRange(apptRow + 1, statusIdx + 1).setValue('Completed');
  }
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
