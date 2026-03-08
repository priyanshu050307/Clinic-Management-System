/**
 * CMS - Billing & Invoicing
 * Auto-generate consulting bill after visit; printable invoice; store in Billing sheet.
 */

/**
 * Create bill for an appointment (after visit). Called by doctor or system.
 */
function createBillForAppointment(sessionToken, appointmentId, amount) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  if (session.role !== 'Doctor' && session.role !== 'Admin') return { error: 'Forbidden' };
  if (!appointmentId) return { error: 'Appointment required.' };
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  var billSh = ss.getSheetByName('Billing');
  if (!apptSh || !billSh) return { error: 'Sheets not found' };
  var apptData = apptSh.getDataRange().getValues();
  var apptH = apptData[0];
  var idIdx = apptH.indexOf('AppointmentId');
  var patientIdx = apptH.indexOf('PatientUserId');
  var doctorIdx = apptH.indexOf('DoctorUserId');
  var appointment = null;
  for (var i = 1; i < apptData.length; i++) {
    if (apptData[i][idIdx] === appointmentId) {
      appointment = apptData[i];
      break;
    }
  }
  if (!appointment) return { error: 'Appointment not found.' };
  var billData = billSh.getDataRange().getValues();
  for (var b = 1; b < billData.length; b++) {
    if (billData[b][billData[0].indexOf('AppointmentId')] === appointmentId) {
      return { error: 'Bill already exists for this appointment.' };
    }
  }
  var amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0) amt = 0;
  var billId = generateId();
  var row = [
    billId,
    appointmentId,
    appointment[patientIdx],
    appointment[doctorIdx],
    amt,
    'Paid',
    new Date().toISOString()
  ];
  billSh.appendRow(row);
  // If there is also a prescription for this appointment, mark it as completed
  if (typeof maybeCompleteAppointment === 'function') {
    maybeCompleteAppointment(appointmentId);
  }
  return { success: true, billId: billId, amount: amt };
}

/**
 * Get bill for an appointment (for printable invoice).
 */
function getBillForAppointment(sessionToken, appointmentId) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var billSh = ss.getSheetByName('Billing');
  var apptSh = ss.getSheetByName('Appointments');
  var userSh = ss.getSheetByName('Users');
  if (!billSh || !apptSh || !userSh) return { error: 'Sheets not found' };
  var billData = billSh.getDataRange().getValues();
  var billH = billData[0];
  var apptIdIdx = billH.indexOf('AppointmentId');
  var amountIdx = billH.indexOf('Amount');
  var patientIdx = billH.indexOf('PatientUserId');
  var doctorIdx = billH.indexOf('DoctorUserId');
  var createdIdx = billH.indexOf('CreatedAt');
  var billIdIdx = billH.indexOf('BillId');
  for (var i = 1; i < billData.length; i++) {
    if (billData[i][apptIdIdx] === appointmentId) {
      var patientUid = billData[i][patientIdx];
      var doctorUid = billData[i][doctorIdx];
      var patientName = '';
      var doctorName = '';
      var userData = userSh.getDataRange().getValues();
      var userH = userData[0];
      var nameIdx = userH.indexOf('Name');
      var uidIdx = userH.indexOf('UserId');
      for (var u = 1; u < userData.length; u++) {
        if (userData[u][uidIdx] === patientUid) patientName = userData[u][nameIdx] || '';
        if (userData[u][uidIdx] === doctorUid) doctorName = userData[u][nameIdx] || '';
      }
      var slotStart = '';
      var apptData = apptSh.getDataRange().getValues();
      var apptH = apptData[0];
      var slotIdx = apptH.indexOf('SlotStart');
      for (var a = 1; a < apptData.length; a++) {
        if (apptData[a][apptH.indexOf('AppointmentId')] === appointmentId) {
          slotStart = apptData[a][slotIdx];
          break;
        }
      }
      if (session.role === 'Patient' && patientUid !== session.userId) return { error: 'Forbidden' };
      return {
        billId: billData[i][billIdIdx],
        appointmentId: appointmentId,
        amount: billData[i][amountIdx],
        status: billData[i][billH.indexOf('Status')],
        createdAt: billData[i][createdIdx],
        patientName: patientName,
        doctorName: doctorName,
        slotStart: slotStart
      };
    }
  }
  return { error: 'Bill not found' };
}

/**
 * Get all bills for current user (patient: own; doctor: own; admin: all).
 */
function getMyBills(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var billSh = ss.getSheetByName('Billing');
  var userSh = ss.getSheetByName('Users');
  var apptSh = ss.getSheetByName('Appointments');
  if (!billSh || !userSh || !apptSh) return { error: 'Sheets not found' };
  var billData = billSh.getDataRange().getValues();
  var billH = billData[0];
  var apptIdIdx = billH.indexOf('AppointmentId');
  var amountIdx = billH.indexOf('Amount');
  var patientIdx = billH.indexOf('PatientUserId');
  var doctorIdx = billH.indexOf('DoctorUserId');
  var createdIdx = billH.indexOf('CreatedAt');
  var billIdIdx = billH.indexOf('BillId');
  var userData = userSh.getDataRange().getValues();
  var userH = userData[0];
  var nameIdx = userH.indexOf('Name');
  var uidIdx = userH.indexOf('UserId');
  var apptData = apptSh.getDataRange().getValues();
  var apptH = apptData[0];
  var slotIdx = apptH.indexOf('SlotStart');
  var list = [];
  for (var i = 1; i < billData.length; i++) {
    var row = billData[i];
    var include = false;
    if (session.role === 'Admin') include = true;
    else if (session.role === 'Doctor' && row[doctorIdx] === session.userId) include = true;
    else if (session.role === 'Patient' && row[patientIdx] === session.userId) include = true;
    if (!include) continue;
    var patientName = '';
    var doctorName = '';
    for (var u = 1; u < userData.length; u++) {
      if (userData[u][uidIdx] === row[patientIdx]) patientName = userData[u][nameIdx] || '';
      if (userData[u][uidIdx] === row[doctorIdx]) doctorName = userData[u][nameIdx] || '';
    }
    var slotStart = '';
    for (var a = 1; a < apptData.length; a++) {
      if (apptData[a][apptH.indexOf('AppointmentId')] === row[apptIdIdx]) {
        slotStart = apptData[a][slotIdx];
        break;
      }
    }
    list.push({
      billId: row[billIdIdx],
      appointmentId: row[apptIdIdx],
      amount: row[amountIdx],
      createdAt: row[createdIdx],
      patientName: patientName,
      doctorName: doctorName,
      slotStart: slotStart
    });
  }
  list.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
  return { bills: list };
}
